/**
 * Jest Configuration
 * 
 * Configuration for running unit and integration tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'services/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'infra/**/*.js',
    'queues/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/workers/**', // Workers are tested separately
  ],

  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Timeout
  testTimeout: 30000, // 30 seconds for integration tests

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Reset mocks after each test
  resetMocks: true,

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Transform (if using TypeScript)
  // transform: {
  //   '^.+\\.ts$': 'ts-jest',
  // },

  // Module paths
  modulePaths: ['<rootDir>'],

  // Global setup/teardown
  // globalSetup: '<rootDir>/tests/global-setup.js',
  // globalTeardown: '<rootDir>/tests/global-teardown.js',
};

