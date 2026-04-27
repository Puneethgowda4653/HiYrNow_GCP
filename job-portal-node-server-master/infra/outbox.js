/**
 * Outbox Pattern Service
 * 
 * Provides helpers for creating events within transactions
 * and publishing them reliably to queues/external systems
 */

const OutboxModel = require('../models/outbox/outbox.model.server');
const logger = require('./logger').logger;
const mongoose = require('mongoose');

/**
 * Create an event within a transaction
 * 
 * @param {Object} session - Mongoose session (transaction)
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created event
 */
async function createEvent(session, eventData) {
  try {
    const event = await OutboxModel.createEvent(eventData);
    
    logger.info('Outbox event created', {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
    });
    
    return event;
  } catch (error) {
    logger.error('Failed to create outbox event', {
      error: error.message,
      eventData,
    });
    throw error;
  }
}

/**
 * Publish an event to its destination (queue, webhook, etc.)
 * 
 * @param {Object} event - Event from outbox
 */
async function publishEvent(event) {
  try {
    logger.info('Publishing outbox event', {
      eventId: event.eventId,
      eventType: event.eventType,
      attempt: event.attempts + 1,
    });
    
    // Route event to appropriate handler based on type
    const eventTypePrefix = event.eventType.split('.')[0];
    
    switch (eventTypePrefix) {
      case 'job':
        await publishJobEvent(event);
        break;
      case 'payment':
        await publishPaymentEvent(event);
        break;
      case 'user':
        await publishUserEvent(event);
        break;
      case 'application':
        await publishApplicationEvent(event);
        break;
      default:
        await publishGenericEvent(event);
    }
    
    await OutboxModel.markAsPublished(event.eventId);
    
    logger.info('Event published successfully', {
      eventId: event.eventId,
      eventType: event.eventType,
    });
  } catch (error) {
    logger.error('Failed to publish event', {
      eventId: event.eventId,
      eventType: event.eventType,
      error: error.message,
    });
    
    const shouldRetry = !isNonRetryableError(error);
    await OutboxModel.markAsFailed(event.eventId, error, shouldRetry);
    
    throw error;
  }
}

/**
 * Publish job-related events
 */
async function publishJobEvent(event) {
  const { emailQueue, aiAnalysisQueue } = require('../queues');
  
  switch (event.eventType) {
    case 'job.posted':
      // Notify relevant job seekers
      await emailQueue.add('job-posted-notification', {
        jobId: event.aggregateId,
        jobData: event.payload,
      });
      break;
    
    case 'job.updated':
      // Invalidate caches
      const { invalidateByPattern } = require('./cache-invalidation');
      await invalidateByPattern(`jobs:*`);
      break;
    
    case 'job.closed':
      // Notify applicants
      await emailQueue.add('job-closed-notification', {
        jobId: event.aggregateId,
      });
      break;
  }
}

/**
 * Publish payment-related events
 */
async function publishPaymentEvent(event) {
  const { emailQueue } = require('../queues');
  
  switch (event.eventType) {
    case 'payment.completed':
      // Send receipt email
      await emailQueue.add('payment-receipt', {
        userId: event.payload.userId,
        transactionId: event.aggregateId,
        amount: event.payload.amount,
        planId: event.payload.planId,
      });
      
      // Update analytics
      const { getMetrics } = require('./telemetry');
      const metrics = getMetrics();
      metrics.recordPayment('success', event.payload.amount);
      break;
    
    case 'payment.failed':
      // Notify user of failure
      await emailQueue.add('payment-failed', {
        userId: event.payload.userId,
        transactionId: event.aggregateId,
        reason: event.payload.reason,
      });
      
      const { getMetrics: getMetrics2 } = require('./telemetry');
      const metrics2 = getMetrics2();
      metrics2.recordPayment('failed', event.payload.amount);
      break;
  }
}

/**
 * Publish user-related events
 */
async function publishUserEvent(event) {
  const { emailQueue } = require('../queues');
  
  switch (event.eventType) {
    case 'user.registered':
      // Send welcome email
      await emailQueue.add('welcome-email', {
        userId: event.aggregateId,
        email: event.payload.email,
        firstName: event.payload.firstName,
        role: event.payload.role,
      });
      
      // Track metric
      const { getMetrics } = require('./telemetry');
      const metrics = getMetrics();
      metrics.recordUserRegistration(event.payload.role);
      break;
    
    case 'user.verified':
      // Send verification confirmation
      await emailQueue.add('verification-confirmation', {
        userId: event.aggregateId,
        email: event.payload.email,
      });
      break;
    
    case 'user.password.reset':
      // Already handled by password reset flow
      break;
  }
}

/**
 * Publish application-related events
 */
async function publishApplicationEvent(event) {
  const { emailQueue, aiAnalysisQueue } = require('../queues');
  
  switch (event.eventType) {
    case 'application.submitted':
      // Notify recruiter
      await emailQueue.add('new-application-notification', {
        recruiterId: event.payload.recruiterId,
        applicantId: event.payload.applicantId,
        jobId: event.payload.jobId,
        applicationId: event.aggregateId,
      });
      
      // Trigger AI analysis
      await aiAnalysisQueue.add('analyze-application', {
        userId: event.payload.applicantId,
        jobId: event.payload.jobId,
        applicationId: event.aggregateId,
      });
      
      // Track metric
      const { getMetrics } = require('./telemetry');
      const metrics = getMetrics();
      metrics.recordJobApplication(
        event.payload.applicantId,
        event.payload.jobId,
        'submitted'
      );
      break;
    
    case 'application.status.changed':
      // Notify applicant
      await emailQueue.add('application-status-update', {
        applicantId: event.payload.applicantId,
        applicationId: event.aggregateId,
        status: event.payload.newStatus,
        jobTitle: event.payload.jobTitle,
      });
      break;
  }
}

/**
 * Publish generic events (webhooks, external systems)
 */
async function publishGenericEvent(event) {
  // Publish to webhook subscribers
  // This is where you'd send to external webhook URLs
  logger.info('Generic event published', {
    eventId: event.eventId,
    eventType: event.eventType,
  });
  
  // Example: Post to webhooks
  // await postToWebhooks(event);
}

/**
 * Check if error is non-retryable
 */
function isNonRetryableError(error) {
  const nonRetryableMessages = [
    'validation failed',
    'not found',
    'unauthorized',
    'forbidden',
    'bad request',
  ];
  
  const errorMessage = error.message.toLowerCase();
  return nonRetryableMessages.some(msg => errorMessage.includes(msg));
}

/**
 * Helper: Execute database operation with outbox event
 * 
 * Usage:
 *   await withOutboxEvent(async (session) => {
 *     const job = await Job.create([jobData], { session });
 *     return {
 *       eventType: 'job.posted',
 *       aggregateType: 'Job',
 *       aggregateId: job[0]._id.toString(),
 *       payload: job[0],
 *     };
 *   });
 */
async function withOutboxEvent(operation) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Execute the operation and get event data
    const eventData = await operation(session);
    
    // Create outbox event within transaction
    if (eventData) {
      await createEvent(session, eventData);
    }
    
    // Commit transaction
    await session.commitTransaction();
    
    logger.info('Transaction with outbox event committed', {
      eventType: eventData?.eventType,
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('Transaction with outbox event failed', {
      error: error.message,
    });
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = {
  createEvent,
  publishEvent,
  withOutboxEvent,
};

