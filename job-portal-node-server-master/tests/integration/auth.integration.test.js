/**
 * Integration Tests - Authentication Flow
 * 
 * Tests the complete authentication workflow:
 * - Registration
 * - Login
 * - Session management
 * - Password reset
 * - Email verification
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
} = require('../setup');

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to false for testing
  }));

  // Mount user service
  require('../../services/user.service.server')(app);

  return app;
}

describe('Authentication Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/register - User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        role: 'user',
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body.username).toBe(userData.username);
      expect(response.body).not.toHaveProperty('password'); // Password should not be returned
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        firstName: 'First',
        lastName: 'User',
        role: 'user',
      };

      // First registration
      await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/register')
        .send({ ...userData, username: 'user2' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with duplicate username', async () => {
      const userData = {
        username: 'sameusername',
        email: 'user1@example.com',
        password: 'SecurePass123!',
        firstName: 'First',
        lastName: 'User',
        role: 'user',
      };

      // First registration
      await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);

      // Second registration with same username
      const response = await request(app)
        .post('/api/register')
        .send({ ...userData, email: 'user2@example.com' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123', // Too short
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should hash password before storing', async () => {
      const userData = {
        username: 'hashtest',
        email: 'hash@example.com',
        password: 'SecurePass123!',
        firstName: 'Hash',
        lastName: 'Test',
        role: 'user',
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);

      // Password should not be in response
      expect(response.body.password).toBeUndefined();

      // If we fetch user from DB, password should be hashed
      const userModel = require('../../models/user/user.model.server');
      const user = await userModel.findUserByEmail(userData.email);
      
      expect(user.password).toBeDefined();
      expect(user.password).not.toBe(userData.password); // Should be hashed
      expect(user.password.length).toBeGreaterThan(20); // Bcrypt hash length
    });
  });

  describe('POST /api/login - User Login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/register')
        .send({
          username: 'logintest',
          email: 'login@example.com',
          password: 'SecurePass123!',
          firstName: 'Login',
          lastName: 'Test',
          role: 'user',
        });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'login@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe('login@example.com');
      expect(response.headers['set-cookie']).toBeDefined(); // Session cookie should be set
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with missing fields', async () => {
      await request(app)
        .post('/api/login')
        .send({ email: 'login@example.com' })
        .expect(400);

      await request(app)
        .post('/api/login')
        .send({ password: 'SecurePass123!' })
        .expect(400);
    });
  });

  describe('GET /api/profile - Protected Route', () => {
    let authCookie;

    beforeEach(async () => {
      // Register and login
      await request(app)
        .post('/api/register')
        .send({
          username: 'profiletest',
          email: 'profile@example.com',
          password: 'SecurePass123!',
          firstName: 'Profile',
          lastName: 'Test',
          role: 'user',
        });

      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          email: 'profile@example.com',
          password: 'SecurePass123!',
        });

      authCookie = loginResponse.headers['set-cookie'];
    });

    it('should access profile with valid session', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe('profile@example.com');
    });

    it('should reject profile access without session', async () => {
      const response = await request(app)
        .get('/api/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/logout - Logout', () => {
    let authCookie;

    beforeEach(async () => {
      await request(app)
        .post('/api/register')
        .send({
          username: 'logouttest',
          email: 'logout@example.com',
          password: 'SecurePass123!',
          firstName: 'Logout',
          lastName: 'Test',
          role: 'user',
        });

      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          email: 'logout@example.com',
          password: 'SecurePass123!',
        });

      authCookie = loginResponse.headers['set-cookie'];
    });

    it('should logout and destroy session', async () => {
      // Logout
      await request(app)
        .post('/api/logout')
        .set('Cookie', authCookie)
        .expect(200);

      // Try to access protected route (should fail)
      await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(401);
    });
  });

  describe('Role-Based Access Control', () => {
    let userCookie;
    let recruiterCookie;
    let adminCookie;

    beforeEach(async () => {
      // Create user
      await request(app).post('/api/register').send({
        username: 'normaluser',
        email: 'user@example.com',
        password: 'SecurePass123!',
        firstName: 'Normal',
        lastName: 'User',
        role: 'user',
      });

      const userLogin = await request(app).post('/api/login').send({
        email: 'user@example.com',
        password: 'SecurePass123!',
      });
      userCookie = userLogin.headers['set-cookie'];

      // Create recruiter
      await request(app).post('/api/register').send({
        username: 'recruiter',
        email: 'recruiter@example.com',
        password: 'SecurePass123!',
        firstName: 'Recruiter',
        lastName: 'User',
        role: 'recruiter',
      });

      const recruiterLogin = await request(app).post('/api/login').send({
        email: 'recruiter@example.com',
        password: 'SecurePass123!',
      });
      recruiterCookie = recruiterLogin.headers['set-cookie'];

      // Create admin
      await request(app).post('/api/register').send({
        username: 'admin',
        email: 'admin@example.com',
        password: 'SecurePass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      });

      const adminLogin = await request(app).post('/api/login').send({
        email: 'admin@example.com',
        password: 'SecurePass123!',
      });
      adminCookie = adminLogin.headers['set-cookie'];
    });

    it('should allow admin to access admin-only routes', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
    });

    it('should deny non-admin access to admin-only routes', async () => {
      await request(app)
        .get('/api/user')
        .set('Cookie', userCookie)
        .expect(403);

      await request(app)
        .get('/api/user')
        .set('Cookie', recruiterCookie)
        .expect(403);
    });
  });
});

