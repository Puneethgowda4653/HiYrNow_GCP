/**
 * Outbox Event Schema
 * 
 * Stores events to be published after database transactions
 * Ensures reliable event delivery with at-least-once semantics
 */

const mongoose = require('mongoose');

const outboxEventSchema = mongoose.Schema({
  // Event identification
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // Event type (e.g., 'job.application.created', 'payment.completed')
  eventType: {
    type: String,
    required: true,
    index: true,
  },
  
  // Aggregate information (what entity triggered this event)
  aggregateType: {
    type: String,
    required: true,
    index: true,
  },
  
  aggregateId: {
    type: String,
    required: true,
    index: true,
  },
  
  // Event payload (the actual data)
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  
  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processing', 'published', 'failed'],
    default: 'pending',
    index: true,
  },
  
  // Retry tracking
  attempts: {
    type: Number,
    default: 0,
  },
  
  maxAttempts: {
    type: Number,
    default: 3,
  },
  
  // Error tracking
  lastError: {
    message: String,
    stack: String,
    timestamp: Date,
  },
  
  // Timing
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  publishedAt: {
    type: Date,
  },
  
  nextRetryAt: {
    type: Date,
    index: true,
  },
  
  // Metadata
  metadata: {
    userId: String,
    correlationId: String,
    causationId: String,
    source: String,
  },
}, {
  collection: 'OutboxEvent',
  timestamps: true,
});

// Compound indexes for efficient queries
outboxEventSchema.index({ status: 1, nextRetryAt: 1 });
outboxEventSchema.index({ status: 1, createdAt: 1 });
outboxEventSchema.index({ aggregateType: 1, aggregateId: 1, createdAt: -1 });

// TTL index - automatically delete published events after 7 days
outboxEventSchema.index(
  { publishedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60, partialFilterExpression: { status: 'published' } }
);

module.exports = outboxEventSchema;

