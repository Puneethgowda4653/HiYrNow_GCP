/**
 * Outbox Event Model
 */

const mongoose = require('mongoose');
const outboxEventSchema = require('./outbox.schema.server');
const outboxEventModel = mongoose.model('OutboxEvent', outboxEventSchema);

module.exports = {
  createEvent,
  findPendingEvents,
  markAsProcessing,
  markAsPublished,
  markAsFailed,
  getEventById,
  getEventsByAggregateId,
  deleteOldPublishedEvents,
};

/**
 * Create a new outbox event
 */
async function createEvent(eventData) {
  const event = {
    eventId: eventData.eventId || generateEventId(),
    eventType: eventData.eventType,
    aggregateType: eventData.aggregateType,
    aggregateId: eventData.aggregateId,
    payload: eventData.payload,
    status: 'pending',
    attempts: 0,
    maxAttempts: eventData.maxAttempts || 3,
    metadata: eventData.metadata || {},
  };
  
  return outboxEventModel.create(event);
}

/**
 * Find events ready to be published
 */
async function findPendingEvents(limit = 100) {
  const now = new Date();
  
  return outboxEventModel
    .find({
      status: 'pending',
      $or: [
        { nextRetryAt: { $exists: false } },
        { nextRetryAt: { $lte: now } },
      ],
    })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
}

/**
 * Mark event as being processed (prevents concurrent processing)
 */
async function markAsProcessing(eventId) {
  return outboxEventModel.updateOne(
    { eventId, status: 'pending' },
    {
      $set: { status: 'processing' },
      $inc: { attempts: 1 },
    }
  );
}

/**
 * Mark event as successfully published
 */
async function markAsPublished(eventId) {
  return outboxEventModel.updateOne(
    { eventId },
    {
      $set: {
        status: 'published',
        publishedAt: new Date(),
      },
    }
  );
}

/**
 * Mark event as failed and schedule retry
 */
async function markAsFailed(eventId, error, shouldRetry = true) {
  const update = {
    $set: {
      lastError: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      },
    },
  };
  
  if (shouldRetry) {
    // Exponential backoff: 1min, 5min, 30min
    const retryDelays = [60, 300, 1800];
    const event = await outboxEventModel.findOne({ eventId });
    const attempt = event.attempts || 0;
    
    if (attempt < event.maxAttempts) {
      const delay = retryDelays[Math.min(attempt, retryDelays.length - 1)];
      update.$set.status = 'pending';
      update.$set.nextRetryAt = new Date(Date.now() + delay * 1000);
    } else {
      update.$set.status = 'failed';
    }
  } else {
    update.$set.status = 'failed';
  }
  
  return outboxEventModel.updateOne({ eventId }, update);
}

/**
 * Get event by ID
 */
async function getEventById(eventId) {
  return outboxEventModel.findOne({ eventId });
}

/**
 * Get all events for a specific aggregate
 */
async function getEventsByAggregateId(aggregateType, aggregateId, limit = 50) {
  return outboxEventModel
    .find({ aggregateType, aggregateId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Manually delete old published events (cleanup)
 */
async function deleteOldPublishedEvents(daysOld = 7) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  return outboxEventModel.deleteMany({
    status: 'published',
    publishedAt: { $lt: cutoffDate },
  });
}

/**
 * Generate a unique event ID
 */
function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

