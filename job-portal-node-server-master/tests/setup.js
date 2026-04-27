/**
 * Test Setup and Configuration
 * 
 * This file sets up the test environment:
 * - Loads test environment variables
 * - Configures test database
 * - Sets up mocks and stubs
 * - Provides test utilities
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const redis = require('redis-mock');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.TELEMETRY_ENABLED = 'false';
process.env.MONGODB_URI = ''; // Will be set by MongoMemoryServer

let mongoServer;

/**
 * Connect to in-memory MongoDB for testing
 */
async function connectTestDB() {
  // Close any existing connections
  await mongoose.disconnect();

  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('Test database connected');
}

/**
 * Disconnect and stop in-memory MongoDB
 */
async function disconnectTestDB() {
  await mongoose.disconnect();
  
  if (mongoServer) {
    await mongoServer.stop();
  }

  console.log('Test database disconnected');
}

/**
 * Clear all collections in test database
 */
async function clearTestDB() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Mock Redis for testing
 */
function mockRedis() {
  // Replace ioredis with redis-mock
  jest.mock('ioredis', () => require('redis-mock'));
  
  // Replace redis with redis-mock
  jest.mock('redis', () => ({
    createClient: jest.fn(() => redis.createClient()),
  }));
}

/**
 * Create test user
 */
async function createTestUser(overrides = {}) {
  const userModel = require('../models/user/user.model.server');
  
  const userData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    isVerified: true,
    ...overrides,
  };

  return await userModel.createUser(userData);
}

/**
 * Create test recruiter
 */
async function createTestRecruiter(overrides = {}) {
  const user = await createTestUser({
    role: 'recruiter',
    username: 'recruiter',
    email: 'recruiter@example.com',
    ...overrides,
  });

  // Create recruiter detail
  const recruiterDetailModel = require('../models/recruiter-detail/recruiter-detail.model.server');
  await recruiterDetailModel.createRecruiterDetail({
    user: user._id,
    companyName: 'Test Company',
    isApproved: true,
  });

  return user;
}

/**
 * Create test admin
 */
async function createTestAdmin(overrides = {}) {
  return await createTestUser({
    role: 'admin',
    username: 'admin',
    email: 'admin@example.com',
    ...overrides,
  });
}

/**
 * Create authenticated session for testing
 */
function createAuthSession(user) {
  return {
    user: {
      _id: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  };
}

/**
 * Mock Express request
 */
function mockRequest(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    session: {},
    ...overrides,
  };
}

/**
 * Mock Express response
 */
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Wait for async operations
 */
function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert that a function throws an error
 */
async function expectToThrow(fn, errorMessage) {
  let error;
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  
  expect(error).toBeDefined();
  if (errorMessage) {
    expect(error.message).toContain(errorMessage);
  }
}

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
  mockRedis,
  createTestUser,
  createTestRecruiter,
  createTestAdmin,
  createAuthSession,
  mockRequest,
  mockResponse,
  waitFor,
  expectToThrow,
};

