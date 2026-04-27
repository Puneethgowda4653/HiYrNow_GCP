/**
 * MongoDB Index Creation Script
 * 
 * Creates optimal indexes for all collections to improve query performance
 * 
 * Usage:
 *   node utils/create-indexes.js
 *   node utils/create-indexes.js --drop-existing  (drops existing indexes first)
 *   node utils/create-indexes.js --verify  (runs explain() on sample queries)
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  acc[arg.replace('--', '')] = true;
  return acc;
}, {});

const dropExisting = args['drop-existing'];
const verify = args['verify'];

// Connect to MongoDB
async function connectMongo() {
  try {
    const connectionString = process.env.MONGODB_URI;
    if (!connectionString) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Index definitions for each collection
const indexDefinitions = {
  // User indexes
  User: [
    // Authentication and lookup indexes
    { keys: { username: 1 }, options: { unique: true, sparse: true, name: 'idx_username' } },
    { keys: { email: 1 }, options: { unique: true, sparse: true, name: 'idx_email' } },
    { keys: { googleId: 1 }, options: { unique: true, sparse: true, name: 'idx_googleId' } },
    
    // Password reset functionality
    { keys: { resetPasswordToken: 1 }, options: { sparse: true, name: 'idx_resetToken' } },
    { keys: { resetPasswordExpires: 1 }, options: { sparse: true, expireAfterSeconds: 3600, name: 'idx_resetExpiry' } },
    
    // OTP verification
    { keys: { email: 1, otp: 1 }, options: { sparse: true, name: 'idx_email_otp' } },
    { keys: { otpExpiry: 1 }, options: { sparse: true, expireAfterSeconds: 600, name: 'idx_otpExpiry' } },
    
    // Role and status queries
    { keys: { role: 1, requestStatus: 1 }, options: { name: 'idx_role_status' } },
    { keys: { role: 1, isVerified: 1 }, options: { name: 'idx_role_verified' } },
    
    // Recruiter queries
    { keys: { role: 1, premiumRequestStatus: 1 }, options: { name: 'idx_recruiter_premium' } },
    
    // Job seeker profile queries
    { keys: { PVC: 1, profileVisible: 1 }, options: { sparse: true, name: 'idx_pvc_visible' } },
    { keys: { openToJobs: 1, role: 1 }, options: { sparse: true, name: 'idx_openToJobs' } },
    
    // Location-based search
    { keys: { currentCity: 1, currentCountry: 1 }, options: { sparse: true, name: 'idx_location' } },
    
    // Job preferences (for matching)
    { keys: { preferredJobTypes: 1 }, options: { sparse: true, name: 'idx_jobTypes' } },
    
    // Profile completion and activity
    { keys: { accountCreatedAt: 1 }, options: { name: 'idx_createdAt' } },
    
    // Compound indexes for complex queries
    { keys: { role: 1, profileVisible: 1, PVC: 1 }, options: { name: 'idx_profile_search' } },
  ],
  
  // Job Posting indexes
  JobPosting: [
    // Most common query: recent jobs by status
    { keys: { status: 1, datePosted: -1 }, options: { name: 'idx_status_date' } },
    
    // Recruiter's job postings
    { keys: { user: 1, datePosted: -1 }, options: { name: 'idx_recruiter_jobs' } },
    { keys: { user: 1, status: 1 }, options: { name: 'idx_recruiter_status' } },
    
    // Location-based job search
    { keys: { location: 1, status: 1, datePosted: -1 }, options: { name: 'idx_location_search' } },
    
    // Job type filtering
    { keys: { type: 1, status: 1, datePosted: -1 }, options: { name: 'idx_type_search' } },
    
    // Salary range queries
    { keys: { minAnnualSalary: 1, maxAnnualSalary: 1, status: 1 }, options: { sparse: true, name: 'idx_salary_range' } },
    
    // Experience requirements
    { keys: { minWorkExperience: 1, maxWorkExperience: 1 }, options: { sparse: true, name: 'idx_experience' } },
    
    // Skills-based search (text index)
    { keys: { title: 'text', description: 'text', skillsRequired: 'text', coreSkills: 'text' }, options: { name: 'idx_fulltext_search', weights: { title: 10, skillsRequired: 5, coreSkills: 5, description: 1 } } },
    
    // Job source (external vs internal)
    { keys: { jobSource: 1, datePosted: -1 }, options: { sparse: true, name: 'idx_source' } },
    
    // Company-specific jobs
    { keys: { company: 1, status: 1, datePosted: -1 }, options: { sparse: true, name: 'idx_company_jobs' } },
    
    // Complex filter queries (for job search with multiple criteria)
    { keys: { status: 1, location: 1, type: 1, datePosted: -1 }, options: { name: 'idx_filter_combo' } },
  ],
  
  // Job Application indexes
  JobApplication: [
    // User's applications (most common query)
    { keys: { user: 1, dateApplied: -1 }, options: { name: 'idx_user_applications' } },
    
    // Job posting applications (recruiter view)
    { keys: { jobPosting: 1, status: 1, dateApplied: -1 }, options: { name: 'idx_job_applications' } },
    { keys: { jobPosting: 1, PVC: 1 }, options: { sparse: true, name: 'idx_job_pvc' } },
    
    // Check if user already applied
    { keys: { user: 1, jobPosting: 1 }, options: { unique: true, name: 'idx_unique_application' } },
    
    // Status filtering
    { keys: { status: 1, dateApplied: -1 }, options: { name: 'idx_status_date' } },
    
    // External job applications
    { keys: { gitHubJobId: 1, user: 1 }, options: { sparse: true, name: 'idx_github_application' } },
    
    // Interview scheduling
    { keys: { 'interviews.scheduledAt': 1, status: 1 }, options: { sparse: true, name: 'idx_interviews' } },
    
    // Aggregation queries (count applications per job)
    { keys: { jobPosting: 1 }, options: { name: 'idx_job_aggregation' } },
  ],
  
  // Blog indexes
  Blog: [
    { keys: { createdAt: -1 }, options: { name: 'idx_created' } },
    { keys: { published: 1, createdAt: -1 }, options: { name: 'idx_published' } },
    { keys: { author: 1, createdAt: -1 }, options: { sparse: true, name: 'idx_author_posts' } },
    { keys: { slug: 1 }, options: { unique: true, sparse: true, name: 'idx_slug' } },
    { keys: { tags: 1 }, options: { sparse: true, name: 'idx_tags' } },
    { keys: { title: 'text', content: 'text' }, options: { name: 'idx_blog_search' } },
  ],
  
  // Education indexes
  Education: [
    { keys: { user: 1, startDate: -1 }, options: { name: 'idx_user_education' } },
    { keys: { user: 1, degree: 1 }, options: { name: 'idx_degree' } },
  ],
  
  // Experience indexes
  Experience: [
    { keys: { user: 1, startDate: -1 }, options: { name: 'idx_user_experience' } },
    { keys: { user: 1, current: 1 }, options: { name: 'idx_current_exp' } },
    { keys: { company: 1 }, options: { sparse: true, name: 'idx_company' } },
  ],
  
  // Skills indexes
  Skill: [
    { keys: { user: 1, proficiency: -1 }, options: { name: 'idx_user_skills' } },
    { keys: { user: 1, skillName: 1 }, options: { name: 'idx_skill_name' } },
  ],
  
  // Project indexes
  Project: [
    { keys: { user: 1, startDate: -1 }, options: { name: 'idx_user_projects' } },
  ],
  
  // Company indexes
  Company: [
    { keys: { name: 1 }, options: { unique: true, name: 'idx_company_name' } },
    { keys: { domain: 1 }, options: { sparse: true, name: 'idx_domain' } },
    { keys: { verified: 1 }, options: { name: 'idx_verified' } },
  ],
  
  // Payment indexes
  Payment: [
    { keys: { user: 1, createdAt: -1 }, options: { name: 'idx_user_payments' } },
    { keys: { orderId: 1 }, options: { unique: true, name: 'idx_orderId' } },
    { keys: { paymentId: 1 }, options: { sparse: true, name: 'idx_paymentId' } },
    { keys: { status: 1, createdAt: -1 }, options: { name: 'idx_payment_status' } },
  ],
  
  // Referral indexes
  Referral: [
    { keys: { referrer: 1, status: 1 }, options: { name: 'idx_referrer' } },
    { keys: { referee: 1 }, options: { sparse: true, name: 'idx_referee' } },
    { keys: { code: 1 }, options: { unique: true, name: 'idx_code' } },
    { keys: { expiresAt: 1 }, options: { sparse: true, expireAfterSeconds: 0, name: 'idx_expires' } },
  ],
  
  // Contact Requests indexes
  ContactRequest: [
    { keys: { status: 1, createdAt: -1 }, options: { name: 'idx_status_date' } },
    { keys: { email: 1, createdAt: -1 }, options: { name: 'idx_email' } },
  ],
  
  // Credit Points indexes
  CreditPoints: [
    { keys: { user: 1 }, options: { unique: true, name: 'idx_user_credits' } },
    { keys: { 'transactions.createdAt': -1 }, options: { sparse: true, name: 'idx_transactions' } },
  ],
  
  // Profile View History indexes
  ProfileViewHistory: [
    { keys: { viewedProfile: 1, viewedAt: -1 }, options: { name: 'idx_profile_views' } },
    { keys: { viewer: 1, viewedAt: -1 }, options: { name: 'idx_viewer_history' } },
    { keys: { viewer: 1, viewedProfile: 1 }, options: { name: 'idx_view_dedup' } },
  ],
  
  // AI Analysis Result indexes
  AIAnalysisResult: [
    { keys: { userId: 1, jobId: 1 }, options: { unique: true, name: 'idx_user_job_analysis' } },
    { keys: { userId: 1, matchScore: -1 }, options: { name: 'idx_top_matches' } },
    { keys: { jobId: 1, matchScore: -1 }, options: { name: 'idx_top_candidates' } },
    { keys: { createdAt: 1 }, options: { expireAfterSeconds: 2592000, name: 'idx_ttl_30days' } }, // 30 days TTL
  ],
  
  // Admin Log indexes
  AdminLog: [
    { keys: { admin: 1, timestamp: -1 }, options: { name: 'idx_admin_actions' } },
    { keys: { action: 1, timestamp: -1 }, options: { name: 'idx_action_time' } },
    { keys: { targetUser: 1, timestamp: -1 }, options: { sparse: true, name: 'idx_target_user' } },
  ],
};

// Create indexes for a collection
async function createIndexes(collectionName, indexes) {
  try {
    const collection = mongoose.connection.collection(collectionName);
    
    console.log(`\n=== ${collectionName} ===`);
    
    // Drop existing indexes if requested
    if (dropExisting) {
      try {
        const existingIndexes = await collection.indexes();
        const indexNames = existingIndexes
          .map(idx => idx.name)
          .filter(name => name !== '_id_'); // Never drop _id index
        
        if (indexNames.length > 0) {
          await collection.dropIndexes(indexNames);
          console.log(`  ✓ Dropped ${indexNames.length} existing indexes`);
        }
      } catch (error) {
        console.log(`  → No existing indexes to drop`);
      }
    }
    
    // Create new indexes
    let created = 0;
    let skipped = 0;
    
    for (const indexDef of indexes) {
      try {
        await collection.createIndex(indexDef.keys, indexDef.options);
        console.log(`  ✓ Created: ${indexDef.options.name}`);
        created++;
      } catch (error) {
        if (error.code === 85 || error.code === 86) {
          // Index already exists or conflicts
          console.log(`  → Skipped: ${indexDef.options.name} (already exists)`);
          skipped++;
        } else {
          console.error(`  ✗ Failed: ${indexDef.options.name}`, error.message);
        }
      }
    }
    
    console.log(`  Summary: ${created} created, ${skipped} skipped`);
  } catch (error) {
    console.error(`✗ Error creating indexes for ${collectionName}:`, error.message);
  }
}

// Verify indexes with explain()
async function verifyIndexes() {
  console.log('\n=== Verifying Indexes with explain() ===\n');
  
  const UserModel = require('../models/user/user.model.server');
  const JobPostingModel = require('../models/job-posting/job-posting.model.server');
  const JobApplicationModel = require('../models/job-application/job-application.model.server');
  
  const testQueries = [
    {
      name: 'User login by email',
      model: mongoose.connection.collection('User'),
      query: { email: 'test@example.com' },
      expectedIndex: 'idx_email',
    },
    {
      name: 'Recent active job postings',
      model: mongoose.connection.collection('JobPosting'),
      query: { status: 'active' },
      sort: { datePosted: -1 },
      expectedIndex: 'idx_status_date',
    },
    {
      name: 'User applications sorted by date',
      model: mongoose.connection.collection('JobApplication'),
      query: { user: mongoose.Types.ObjectId() },
      sort: { dateApplied: -1 },
      expectedIndex: 'idx_user_applications',
    },
    {
      name: 'Job search by location and type',
      model: mongoose.connection.collection('JobPosting'),
      query: { location: 'San Francisco', type: 'Full-time', status: 'active' },
      sort: { datePosted: -1 },
      expectedIndex: 'idx_filter_combo',
    },
    {
      name: 'Recruiter pending approvals',
      model: mongoose.connection.collection('User'),
      query: { role: 'recruiter', requestStatus: 'Pending' },
      expectedIndex: 'idx_role_status',
    },
    {
      name: 'Job applications for specific job',
      model: mongoose.connection.collection('JobApplication'),
      query: { jobPosting: mongoose.Types.ObjectId() },
      sort: { dateApplied: -1 },
      expectedIndex: 'idx_job_applications',
    },
  ];
  
  for (const test of testQueries) {
    try {
      const explainResult = await test.model
        .find(test.query)
        .sort(test.sort || {})
        .explain('executionStats');
      
      const winningPlan = explainResult.queryPlanner?.winningPlan || explainResult.executionStats?.executionStages;
      const indexUsed = winningPlan?.inputStage?.indexName || winningPlan?.indexName || 'COLLSCAN';
      const executionTime = explainResult.executionStats?.executionTimeMillis || 0;
      const docsExamined = explainResult.executionStats?.totalDocsExamined || 0;
      const docsReturned = explainResult.executionStats?.nReturned || 0;
      
      const usingExpectedIndex = indexUsed === test.expectedIndex;
      const icon = usingExpectedIndex ? '✓' : '⚠';
      
      console.log(`${icon} ${test.name}`);
      console.log(`   Index used: ${indexUsed}`);
      console.log(`   Expected: ${test.expectedIndex}`);
      console.log(`   Execution time: ${executionTime}ms`);
      console.log(`   Docs examined: ${docsExamined}, returned: ${docsReturned}`);
      console.log('');
    } catch (error) {
      console.error(`✗ ${test.name}: ${error.message}\n`);
    }
  }
}

// Print index statistics
async function printIndexStats() {
  console.log('\n=== Index Statistics ===\n');
  
  for (const collectionName of Object.keys(indexDefinitions)) {
    try {
      const collection = mongoose.connection.collection(collectionName);
      const indexes = await collection.indexes();
      const stats = await collection.stats();
      
      console.log(`${collectionName}:`);
      console.log(`  Documents: ${stats.count.toLocaleString()}`);
      console.log(`  Indexes: ${indexes.length}`);
      console.log(`  Index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('');
    } catch (error) {
      // Collection might not exist yet
    }
  }
}

// Main execution
async function main() {
  console.log('MongoDB Index Creation Tool\n');
  console.log(`Drop existing: ${dropExisting ? 'Yes' : 'No'}`);
  console.log(`Verify indexes: ${verify ? 'Yes' : 'No'}`);
  
  await connectMongo();
  
  try {
    // Create indexes for all collections
    for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
      await createIndexes(collectionName, indexes);
    }
    
    // Print statistics
    await printIndexStats();
    
    // Verify indexes if requested
    if (verify) {
      await verifyIndexes();
    }
    
    console.log('\n✓ Index creation completed successfully!');
    
    console.log('\nNext steps:');
    console.log('1. Monitor query performance in production');
    console.log('2. Run explain() on slow queries to verify index usage');
    console.log('3. Adjust indexes based on actual usage patterns');
    console.log('4. Set up index monitoring and alerts');
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Index creation failed:', error);
    process.exit(1);
  }
}

// Run script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

