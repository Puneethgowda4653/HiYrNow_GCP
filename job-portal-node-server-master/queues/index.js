/**
 * BullMQ Queue Configuration
 * Centralized queue management for background jobs
 */

const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection configuration
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// Queue definitions
const QUEUE_NAMES = {
  RESUME_PARSING: 'resume-parsing',
  AI_ANALYSIS: 'ai-analysis',
  EMAIL: 'email',
};

// Create queue instances
const resumeParsingQueue = new Queue(QUEUE_NAMES.RESUME_PARSING, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

const aiAnalysisQueue = new Queue(QUEUE_NAMES.AI_ANALYSIS, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
});

const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3 * 24 * 3600, // Keep email jobs for 3 days
      count: 5000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
});

/**
 * Add a resume parsing job
 * @param {Object} data - Job data
 * @param {string} data.userId - User ID
 * @param {string} data.fileId - File ID in GridFS
 * @param {string} data.filename - Original filename
 * @returns {Promise<Job>}
 */
async function addResumeParsingJob(data) {
  return await resumeParsingQueue.add('parse-resume', data, {
    jobId: `parse-${data.userId}-${Date.now()}`,
  });
}

/**
 * Add an AI analysis job
 * @param {Object} data - Job data
 * @param {string} data.jobId - Job posting ID
 * @param {string} data.userId - User ID
 * @param {string} data.requestId - Request ID for tracking
 * @returns {Promise<Job>}
 */
async function addAIAnalysisJob(data) {
  return await aiAnalysisQueue.add('analyze-match', data, {
    jobId: `ai-${data.jobId}-${data.userId}`,
  });
}

/**
 * Add an email sending job
 * @param {Object} data - Email data
 * @param {string} data.type - Email type (otp, welcome, notification, etc.)
 * @param {string} data.to - Recipient email
 * @param {Object} data.context - Template context
 * @returns {Promise<Job>}
 */
async function addEmailJob(data) {
  return await emailQueue.add(data.type, data, {
    priority: data.priority || 10, // Lower number = higher priority
  });
}

/**
 * Get queue stats
 * @param {string} queueName - Name of the queue
 * @returns {Promise<Object>}
 */
async function getQueueStats(queueName) {
  let queue;
  switch (queueName) {
    case QUEUE_NAMES.RESUME_PARSING:
      queue = resumeParsingQueue;
      break;
    case QUEUE_NAMES.AI_ANALYSIS:
      queue = aiAnalysisQueue;
      break;
    case QUEUE_NAMES.EMAIL:
      queue = emailQueue;
      break;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Get all queue stats
 */
async function getAllQueueStats() {
  const stats = await Promise.all(
    Object.values(QUEUE_NAMES).map((name) => getQueueStats(name))
  );
  return stats;
}

// Graceful shutdown
async function closeQueues() {
  await Promise.all([
    resumeParsingQueue.close(),
    aiAnalysisQueue.close(),
    emailQueue.close(),
    redisConnection.quit(),
  ]);
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing queues...');
  await closeQueues();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing queues...');
  await closeQueues();
});

module.exports = {
  QUEUE_NAMES,
  resumeParsingQueue,
  aiAnalysisQueue,
  emailQueue,
  addResumeParsingJob,
  addAIAnalysisJob,
  addEmailJob,
  getQueueStats,
  getAllQueueStats,
  closeQueues,
};

