/**
 * Resume Parsing Worker
 * Processes resume parsing jobs in the background
 */

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const { QUEUE_NAMES } = require('../queues');

// Import models and services
const User = require('../models/user/user.model.server');
const Experience = require('../models/experience/experience.model.server');
const Education = require('../models/education/education.model.server');
const Skill = require('../models/skill/skill.model.server');
const ResumeParser = require('../services/resumeParser');

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
  console.error('MONGODB_URI not set. Worker cannot start.');
  process.exit(1);
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

mongoose.connection.on('connected', () => {
  console.log('Resume parsing worker connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error in resume parsing worker:', err);
});

// Helper function to convert stream to buffer
function streamToBuffer(readstream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readstream.on('data', (chunk) => chunks.push(chunk));
    readstream.on('end', () => resolve(Buffer.concat(chunks)));
    readstream.on('error', reject);
  });
}

/**
 * Process resume parsing job
 */
async function processResumeParsingJob(job) {
  const { userId, fileId, filename } = job.data;
  
  console.log(`[Resume Parsing] Processing job ${job.id} for user ${userId}`);
  
  try {
    // Initialize GridFS
    const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });

    // Get file from GridFS
    const files = await gfs.find({ _id: mongoose.Types.ObjectId(fileId) }).toArray();
    
    if (!files || files.length === 0) {
      throw new Error(`File not found: ${fileId}`);
    }

    const file = files[0];
    const readstream = gfs.openDownloadStream(file._id);
    const fileBuffer = await streamToBuffer(readstream);
    const fileExtension = filename.split('.').pop().toLowerCase();

    // Parse resume using AI
    const resumeParser = new ResumeParser();
    const extractedText = await resumeParser.extractText(fileBuffer, fileExtension);
    const parsedData = await resumeParser.parseResumeText(extractedText);

    // Update user's basic information
    const userUpdateFields = {
      firstName: parsedData.personalInfo?.name?.split(' ')[0] || '',
      lastName: parsedData.personalInfo?.name?.split(' ').slice(1).join(' ') || '',
      email: parsedData.contact?.email || '',
      phone: parsedData.contact?.phone || '',
      currentLocation: parsedData.personalInfo?.location || '',
    };

    await User.updateUser(userId, userUpdateFields);

    // Save education
    if (parsedData.education && Array.isArray(parsedData.education)) {
      for (const edu of parsedData.education) {
        await Education.createEducation({
          user: userId,
          school: edu.institution || '',
          degree: edu.degree || '',
          field: edu.fieldOfStudy || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
        });
      }
    }

    // Save experience
    if (parsedData.experience && Array.isArray(parsedData.experience)) {
      for (const exp of parsedData.experience) {
        await Experience.createExperience({
          user: userId,
          title: exp.title || '',
          company: exp.company || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          description: exp.responsibilities ? exp.responsibilities.join('\n') : '',
        });
      }
    }

    // Save skills
    if (parsedData.skills && Array.isArray(parsedData.skills)) {
      for (const skillName of parsedData.skills) {
        await Skill.createSkill({
          user: userId,
          skillName: skillName,
        });
      }
    }

    console.log(`[Resume Parsing] Job ${job.id} completed successfully`);
    
    return {
      success: true,
      userId,
      parsedData,
    };
  } catch (error) {
    console.error(`[Resume Parsing] Job ${job.id} failed:`, error);
    throw error;
  }
}

// Create worker
const worker = new Worker(
  QUEUE_NAMES.RESUME_PARSING,
  processResumeParsingJob,
  {
    connection,
    concurrency: 2, // Process 2 jobs at a time
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // per minute
    },
  }
);

// Event listeners
worker.on('completed', (job) => {
  console.log(`[Resume Parsing] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Resume Parsing] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Resume Parsing] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing resume parsing worker...');
  await worker.close();
  await connection.quit();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing resume parsing worker...');
  await worker.close();
  await connection.quit();
  await mongoose.connection.close();
  process.exit(0);
});

console.log(`[Resume Parsing] Worker started and listening for jobs`);

module.exports = worker;

