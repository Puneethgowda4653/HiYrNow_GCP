#!/usr/bin/env node
/**
 * Start all workers
 * Usage: node workers/start-workers.js
 */

require('../infra/polyfills');
require('dotenv').config();


console.log('Starting all workers...\n');

// Start all workers
require('./resume-parsing.worker');
require('./ai-analysis.worker');
require('./email.worker');

console.log('\nAll workers are running. Press Ctrl+C to stop.');

// Keep process alive
process.stdin.resume();

