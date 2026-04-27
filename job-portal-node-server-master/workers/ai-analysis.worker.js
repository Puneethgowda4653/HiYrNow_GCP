/**
 * AI Analysis Worker
 * Processes job-user matching analysis in the background
 */

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { QUEUE_NAMES } = require('../queues');

// Import models
const jobPostingModel = require('../models/job-posting/job-posting.model.server');
const userModel = require('../models/user/user.model.server');
const skillModel = require('../models/skill/skill.model.server');
const aiAnalysisResultModel = require('../models/ai-analysis-result.model.server');

// Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI not set. AI Analysis worker cannot start.');
  process.exit(1);
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

mongoose.connection.on('connected', () => {
  console.log('AI Analysis worker connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error in AI Analysis worker:', err);
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * Process AI analysis job
 */
async function processAIAnalysisJob(job) {
  const { jobId, userId, requestId } = job.data;
  
  console.log(`[AI Analysis] Processing job ${job.id}: jobId=${jobId}, userId=${userId}`);
  
  try {
    // Check for existing analysis (cache)
    const existing = await aiAnalysisResultModel.findByJobAndUser(jobId, userId);
    if (existing && existing.analysisData && (!existing.expiresAt || new Date(existing.expiresAt) > new Date())) {
      console.log(`[AI Analysis] Using cached result for job ${job.id}`);
      return {
        success: true,
        cached: true,
        result: existing.analysisData,
      };
    }

    // Fetch job posting and user details
    const jobPosting = await jobPostingModel.findJobPostingById(jobId);
    const user = await userModel.findUserById(userId);
    const userSkills = await skillModel.findSkillByUserId(userId);

    if (!jobPosting || !user) {
      throw new Error(`Job or user not found: jobId=${jobId}, userId=${userId}`);
    }

    // Prepare data for AI analysis
    const jobData = {
      title: jobPosting.title,
      description: jobPosting.description,
      coreSkills: jobPosting.coreSkills || [],
      minExp: jobPosting.minExp,
      maxExp: jobPosting.maxExp,
      location: jobPosting.location,
      minSalary: jobPosting.minSalary,
      maxSalary: jobPosting.maxSalary,
    };

    const userData = {
      name: `${user.firstName} ${user.lastName}`,
      skills: userSkills.map(s => s.skillName || s.name),
      experience: user.totalExp || 0,
      location: user.currentLocation,
      preferredLocation: user.preferredLocation,
      currentCTC: user.currentCTC,
    };

    // Create AI prompt
    const prompt = `Analyze the match between this candidate and job posting. Return a JSON object with the exact structure below:

{
  "overallScore": number (0-100),
  "matchCategory": "Excellent Match" | "Good Match" | "Moderate Match" | "Weak Match",
  "strengths": ["strength 1", "strength 2", ...],
  "gaps": ["gap 1", "gap 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "skillMatch": {
    "matchingSkills": ["skill1", "skill2"],
    "missingSkills": ["skill1", "skill2"],
    "matchPercentage": number (0-100)
  },
  "experienceMatch": {
    "isMatch": boolean,
    "userExp": number,
    "requiredMin": number,
    "requiredMax": number,
    "assessment": "string"
  },
  "locationMatch": {
    "isMatch": boolean,
    "assessment": "string"
  },
  "salaryMatch": {
    "isMatch": boolean,
    "assessment": "string"
  },
  "confidence": number (0-100)
}

Job Data:
${JSON.stringify(jobData, null, 2)}

Candidate Data:
${JSON.stringify(userData, null, 2)}

Important:
1. Be objective and data-driven
2. Consider all factors: skills, experience, location, salary
3. Provide actionable recommendations
4. Return ONLY valid JSON, no additional text`;

    // Call Gemini AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const analysisResult = JSON.parse(jsonMatch[0]);

    // Store result in DB (60 days cache)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);
    
    await aiAnalysisResultModel.createOrUpdate(jobId, userId, analysisResult, expiresAt);

    console.log(`[AI Analysis] Job ${job.id} completed successfully`);
    
    return {
      success: true,
      cached: false,
      result: analysisResult,
    };
  } catch (error) {
    console.error(`[AI Analysis] Job ${job.id} failed:`, error);
    throw error;
  }
}

// Create worker
const worker = new Worker(
  QUEUE_NAMES.AI_ANALYSIS,
  processAIAnalysisJob,
  {
    connection,
    concurrency: 3, // Process 3 jobs at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // per minute (respect API rate limits)
    },
  }
);

// Event listeners
worker.on('completed', (job) => {
  console.log(`[AI Analysis] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[AI Analysis] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[AI Analysis] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing AI Analysis worker...');
  await worker.close();
  await connection.quit();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing AI Analysis worker...');
  await worker.close();
  await connection.quit();
  await mongoose.connection.close();
  process.exit(0);
});

console.log(`[AI Analysis] Worker started and listening for jobs`);

module.exports = worker;

 LTS
