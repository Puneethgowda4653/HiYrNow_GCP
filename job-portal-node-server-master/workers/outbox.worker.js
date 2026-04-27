/**
 * Outbox Event Publisher Worker
 * 
 * Polls the outbox table for pending events and publishes them
 * Runs continuously to ensure reliable event delivery
 */

require('dotenv').config();
const mongoose = require('mongoose');
const OutboxModel = require('../models/outbox/outbox.model.server');
const { publishEvent } = require('../infra/outbox');
const logger = require('../infra/logger').logger;

// Configuration
const POLL_INTERVAL = parseInt(process.env.OUTBOX_POLL_INTERVAL || '5000', 10); // 5 seconds
const BATCH_SIZE = parseInt(process.env.OUTBOX_BATCH_SIZE || '10', 10);
const MAX_CONCURRENT = parseInt(process.env.OUTBOX_MAX_CONCURRENT || '3', 10);

let isRunning = false;
let isShuttingDown = false;

/**
 * Connect to MongoDB
 */
async function connectDatabase() {
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
  
  logger.info('Outbox worker connected to MongoDB');
}

/**
 * Process a single event
 */
async function processEvent(event) {
  try {
    // Mark as processing to prevent concurrent processing
    const updated = await OutboxModel.markAsProcessing(event.eventId);
    
    if (updated.modifiedCount === 0) {
      // Another worker picked it up
      return;
    }
    
    // Publish the event
    await publishEvent(event);
    
    logger.info('Outbox event processed successfully', {
      eventId: event.eventId,
      eventType: event.eventType,
    });
  } catch (error) {
    logger.error('Failed to process outbox event', {
      eventId: event.eventId,
      eventType: event.eventType,
      error: error.message,
    });
  }
}

/**
 * Process pending events in batches
 */
async function processPendingEvents() {
  if (isShuttingDown) return;
  
  try {
    // Find pending events
    const events = await OutboxModel.findPendingEvents(BATCH_SIZE);
    
    if (events.length === 0) {
      return;
    }
    
    logger.info(`Found ${events.length} pending outbox events`);
    
    // Process events with concurrency limit
    const chunks = [];
    for (let i = 0; i < events.length; i += MAX_CONCURRENT) {
      chunks.push(events.slice(i, i + MAX_CONCURRENT));
    }
    
    for (const chunk of chunks) {
      if (isShuttingDown) break;
      
      await Promise.all(chunk.map(event => processEvent(event)));
    }
  } catch (error) {
    logger.error('Error processing outbox events', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Start polling for events
 */
async function startPolling() {
  isRunning = true;
  
  logger.info('Outbox worker started', {
    pollInterval: POLL_INTERVAL,
    batchSize: BATCH_SIZE,
    maxConcurrent: MAX_CONCURRENT,
  });
  
  while (isRunning && !isShuttingDown) {
    try {
      await processPendingEvents();
    } catch (error) {
      logger.error('Polling error', { error: error.message });
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
  
  logger.info('Outbox worker stopped polling');
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  if (isShuttingDown) return;
  
  console.log(`\n${signal} received. Shutting down outbox worker...`);
  isShuttingDown = true;
  isRunning = false;
  
  // Wait for current batch to finish (max 30 seconds)
  const maxWait = 30000;
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    // Check if processing is done
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Close database connection
  await mongoose.connection.close();
  logger.info('Outbox worker shutdown complete');
  
  process.exit(0);
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Start polling
    await startPolling();
  } catch (error) {
    logger.error('Outbox worker fatal error', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start the worker
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  startPolling,
  processPendingEvents,
  shutdown,
};

