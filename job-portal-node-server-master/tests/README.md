# Test Suite

## 📋 Overview

Comprehensive test suite for the job portal backend with **unit tests** and **integration tests**.

---

## 🏗️ Structure

```
tests/
├── setup.js                          # Test utilities and helpers
├── unit/                             # Unit tests
│   ├── job-posting.service.test.js
│   └── job-application.service.test.js
└── integration/                      # Integration tests
    ├── auth.integration.test.js
    ├── job-apply.integration.test.js
    └── payment.integration.test.js
```

---

## 🚀 Quick Start

### Install Dependencies

```bash
npm install --save-dev jest supertest mongodb-memory-server redis-mock
```

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## 📝 Test Files

### Unit Tests

#### `unit/job-posting.service.test.js`
Tests for job posting CRUD operations:
- Create, read, update, delete
- Filtering and pagination
- Query optimization (`.lean()`)
- Validation

#### `unit/job-application.service.test.js`
Tests for job application workflow:
- Application submission
- Idempotency (duplicate prevention)
- Status transitions
- Query performance

### Integration Tests

#### `integration/auth.integration.test.js`
End-to-end authentication flow:
- Registration
- Login/logout
- Session management
- Password hashing
- Role-based access control

#### `integration/job-apply.integration.test.js`
Complete job application workflow:
- Job posting creation
- Job listing and filtering
- Application submission
- Duplicate prevention
- Status updates
- Application lifecycle

#### `integration/payment.integration.test.js`
Payment processing workflow:
- Credit points purchase
- Idempotency
- Webhook handling
- Balance tracking
- Premium subscriptions
- Refund processing

---

## 🔧 Test Utilities (`setup.js`)

### Database Helpers

```javascript
const { connectTestDB, disconnectTestDB, clearTestDB } = require('./setup');

beforeAll(async () => {
  await connectTestDB(); // Connect to in-memory MongoDB
});

afterAll(async () => {
  await disconnectTestDB(); // Clean up
});

beforeEach(async () => {
  await clearTestDB(); // Clear all collections
});
```

### User Helpers

```javascript
const { createTestUser, createTestRecruiter, createTestAdmin } = require('./setup');

// Create regular user
const user = await createTestUser();

// Create recruiter
const recruiter = await createTestRecruiter();

// Create admin
const admin = await createTestAdmin();
```

### HTTP Helpers

```javascript
const { mockRequest, mockResponse } = require('./setup');

// Mock Express request
const req = mockRequest({
  body: { email: 'test@example.com' },
  session: { user: { _id: userId } },
});

// Mock Express response
const res = mockResponse();
```

---

## 📊 Coverage

### Current Coverage

Run to see coverage:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Coverage Goals

| Component | Target | Status |
|-----------|--------|--------|
| Services | 80% | 🎯 |
| Models | 70% | 🎯 |
| Middleware | 70% | 🎯 |
| Overall | 60% | 🎯 |

---

## 📚 Examples

### Unit Test Example

```javascript
it('should create a job posting', async () => {
  const jobData = {
    title: 'Software Engineer',
    company: 'Tech Corp',
    location: 'SF',
    type: 'Full-time',
    user: recruiterId,
  };

  const job = await jobPostingModel.createJobPosting(jobData);

  expect(job).toBeDefined();
  expect(job.title).toBe(jobData.title);
  expect(job.status).toBe('active');
});
```

### Integration Test Example

```javascript
it('should register and login user', async () => {
  // Register
  await request(app)
    .post('/api/register')
    .send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    })
    .expect(201);

  // Login
  const response = await request(app)
    .post('/api/login')
    .send({
      email: 'test@example.com',
      password: 'SecurePass123!',
    })
    .expect(200);

  expect(response.body).toHaveProperty('_id');
  expect(response.headers['set-cookie']).toBeDefined();
});
```

---

## 🐛 Debugging

### Run Single Test File

```bash
npx jest tests/unit/job-posting.service.test.js
```

### Run Single Test

```bash
npx jest --testNamePattern="should create job posting"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Debug in VSCode

1. Set breakpoint in test file
2. Press F5 to start debugging
3. Select "Jest Debug" configuration

---

## ✅ Best Practices

### 1. Test Isolation
- Each test should be independent
- Clear database before each test
- Don't share state between tests

### 2. Descriptive Names
```javascript
// Good
it('should prevent duplicate applications to same job', async () => {

// Bad
it('test 1', async () => {
```

### 3. Arrange-Act-Assert
```javascript
it('should do something', async () => {
  // Arrange - Setup
  const data = { /* ... */ };

  // Act - Execute
  const result = await someFunction(data);

  // Assert - Verify
  expect(result).toBe(expected);
});
```

### 4. Test Error Cases
```javascript
it('should reject invalid data', async () => {
  await expect(
    someFunction(invalidData)
  ).rejects.toThrow('Validation error');
});
```

---

## 📖 Documentation

See [TESTING_GUIDE.md](../TESTING_GUIDE.md) for comprehensive documentation.

---

## 🎯 Next Steps

1. **Run tests**
   ```bash
   npm test
   ```

2. **Check coverage**
   ```bash
   npm run test:coverage
   ```

3. **Add more tests** for remaining services

4. **Integrate with CI/CD**

---

**Happy Testing!** 🧪

