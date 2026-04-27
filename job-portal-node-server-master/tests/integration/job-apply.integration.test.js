/**
 * Integration Tests - Job Application Flow
 * 
 * Tests the complete job application workflow:
 * - Job posting creation
 * - Job listing and filtering
 * - Job application submission
 * - Application status tracking
 * - Recruiter viewing applications
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
    cookie: { secure: false },
  }));

  // Mount services
  require('../../services/user.service.server')(app);
  require('../../services/job-posting.service.server')(app);
  require('../../services/job-application.service.server')(app);

  return app;
}

describe('Job Application Flow - Integration Tests', () => {
  let app;
  let userCookie;
  let recruiterCookie;
  let userId;
  let recruiterId;
  let jobId;

  beforeAll(async () => {
    await connectTestDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Create and login as user
    const userRegister = await request(app)
      .post('/api/register')
      .send({
        username: 'jobseeker',
        email: 'jobseeker@example.com',
        password: 'SecurePass123!',
        firstName: 'Job',
        lastName: 'Seeker',
        role: 'user',
      });

    userId = userRegister.body._id;

    const userLogin = await request(app)
      .post('/api/login')
      .send({
        email: 'jobseeker@example.com',
        password: 'SecurePass123!',
      });

    userCookie = userLogin.headers['set-cookie'];

    // Create and login as recruiter
    const recruiterRegister = await request(app)
      .post('/api/register')
      .send({
        username: 'recruiter',
        email: 'recruiter@example.com',
        password: 'SecurePass123!',
        firstName: 'Tech',
        lastName: 'Recruiter',
        role: 'recruiter',
      });

    recruiterId = recruiterRegister.body._id;

    const recruiterLogin = await request(app)
      .post('/api/login')
      .send({
        email: 'recruiter@example.com',
        password: 'SecurePass123!',
      });

    recruiterCookie = recruiterLogin.headers['set-cookie'];

    // Create a job posting
    const jobResponse = await request(app)
      .post('/api/jobPosting')
      .set('Cookie', recruiterCookie)
      .send({
        title: 'Full Stack Developer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        type: 'Full-time',
        description: 'We are looking for an experienced full stack developer...',
        skillsRequired: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
        minAnnualSalary: 100000,
        maxAnnualSalary: 150000,
        minWorkExperience: 2,
        maxWorkExperience: 5,
      });

    jobId = jobResponse.body._id;
  });

  describe('Job Posting Creation', () => {
    it('should allow recruiter to create job posting', async () => {
      const response = await request(app)
        .post('/api/jobPosting')
        .set('Cookie', recruiterCookie)
        .send({
          title: 'Backend Developer',
          company: 'StartupXYZ',
          location: 'Remote',
          type: 'Full-time',
          description: 'Join our growing team...',
          skillsRequired: ['Python', 'Django', 'PostgreSQL'],
          minAnnualSalary: 90000,
          maxAnnualSalary: 130000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe('Backend Developer');
      expect(response.body.status).toBe('active');
    });

    it('should deny regular user from creating job posting', async () => {
      await request(app)
        .post('/api/jobPosting')
        .set('Cookie', userCookie)
        .send({
          title: 'Backend Developer',
          company: 'StartupXYZ',
          location: 'Remote',
          type: 'Full-time',
        })
        .expect(403);
    });

    it('should reject job posting without required fields', async () => {
      await request(app)
        .post('/api/jobPosting')
        .set('Cookie', recruiterCookie)
        .send({
          title: 'Backend Developer',
          // Missing required fields
        })
        .expect(400);
    });
  });

  describe('Job Listing and Filtering', () => {
    beforeEach(async () => {
      // Create multiple jobs
      await request(app)
        .post('/api/jobPosting')
        .set('Cookie', recruiterCookie)
        .send({
          title: 'Frontend Developer',
          company: 'Design Co',
          location: 'New York, NY',
          type: 'Part-time',
          description: 'Looking for frontend developer',
          skillsRequired: ['React', 'CSS', 'TypeScript'],
          minAnnualSalary: 80000,
          maxAnnualSalary: 110000,
        });

      await request(app)
        .post('/api/jobPosting')
        .set('Cookie', recruiterCookie)
        .send({
          title: 'DevOps Engineer',
          company: 'Cloud Corp',
          location: 'Seattle, WA',
          type: 'Contract',
          description: 'DevOps position',
          skillsRequired: ['AWS', 'Docker', 'Kubernetes'],
          minAnnualSalary: 120000,
          maxAnnualSalary: 160000,
        });
    });

    it('should list all active job postings', async () => {
      const response = await request(app)
        .get('/api/allJobPosting')
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter jobs by location', async () => {
      const response = await request(app)
        .get('/api/allJobPosting?location=New York')
        .expect(200);

      response.body.forEach(job => {
        expect(job.location).toContain('New York');
      });
    });

    it('should filter jobs by type', async () => {
      const response = await request(app)
        .get('/api/allJobPosting?type=Full-time')
        .expect(200);

      response.body.forEach(job => {
        expect(job.type).toBe('Full-time');
      });
    });

    it('should get single job by ID', async () => {
      const response = await request(app)
        .get(`/api/jobPosting/${jobId}`)
        .expect(200);

      expect(response.body._id).toBe(jobId);
      expect(response.body.title).toBe('Full Stack Developer');
    });
  });

  describe('Job Application Submission', () => {
    it('should allow user to apply to job', async () => {
      const response = await request(app)
        .post('/api/jobApplication')
        .set('Cookie', userCookie)
        .send({
          jobPostingId: jobId,
          coverLetter: 'I am very interested in this position...',
        })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.user).toBe(userId);
      expect(response.body.jobPosting).toBe(jobId);
      expect(response.body.status).toBe('applied');
    });

    it('should prevent duplicate applications (idempotency)', async () => {
      // First application
      await request(app)
        .post('/api/jobApplication')
        .set('Cookie', userCookie)
        .send({
          jobPostingId: jobId,
          coverLetter: 'I am interested...',
        })
        .expect(201);

      // Second application (duplicate)
      const response = await request(app)
        .post('/api/jobApplication')
        .set('Cookie', userCookie)
        .send({
          jobPostingId: jobId,
          coverLetter: 'I am still interested...',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already applied');
    });

    it('should require authentication to apply', async () => {
      await request(app)
        .post('/api/jobApplication')
        .send({
          jobPostingId: jobId,
          coverLetter: 'I am interested...',
        })
        .expect(401);
    });

    it('should reject application to non-existent job', async () => {
      const fakeJobId = '507f1f77bcf86cd799439011';
      
      await request(app)
        .post('/api/jobApplication')
        .set('Cookie', userCookie)
        .send({
          jobPostingId: fakeJobId,
          coverLetter: 'I am interested...',
        })
        .expect(404);
    });
  });

  describe('Application Status Tracking', () => {
    let applicationId;

    beforeEach(async () => {
      // User applies to job
      const applyResponse = await request(app)
        .post('/api/jobApplication')
        .set('Cookie', userCookie)
        .send({
          jobPostingId: jobId,
          coverLetter: 'I am interested in this position...',
        });

      applicationId = applyResponse.body._id;
    });

    it('should allow user to view their applications', async () => {
      const response = await request(app)
        .get('/api/jobApplication')
        .set('Cookie', userCookie)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].user).toBe(userId);
    });

    it('should allow recruiter to view applications for their job', async () => {
      const response = await request(app)
        .get(`/api/jobApplication/${jobId}/:jobSource/appliedUsers`)
        .set('Cookie', recruiterCookie)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
    });

    it('should allow recruiter to update application status', async () => {
      const response = await request(app)
        .put(`/api/jobApplication/${applicationId}`)
        .set('Cookie', recruiterCookie)
        .send({
          status: 'reviewed',
        })
        .expect(200);

      // Verify status was updated
      const updatedApp = await request(app)
        .get(`/api/jobApplication/${jobId}/:jobSource/appliedUsers`)
        .set('Cookie', recruiterCookie);

      const application = updatedApp.body.find(app => app._id === applicationId);
      expect(application.status).toBe('reviewed');
    });

    it('should prevent user from updating application status', async () => {
      await request(app)
        .put(`/api/jobApplication/${applicationId}`)
        .set('Cookie', userCookie)
        .send({
          status: 'reviewed',
        })
        .expect(403);
    });
  });

  describe('Complete Application Workflow', () => {
    it('should complete full application lifecycle', async () => {
      // Step 1: Recruiter creates job
      const jobResponse = await request(app)
        .post('/api/jobPosting')
        .set('Cookie', recruiterCookie)
        .send({
          title: 'Senior Software Engineer',
          company: 'Enterprise Co',
          location: 'Boston, MA',
          type: 'Full-time',
          description: 'Senior position',
          skillsRequired: ['Java', 'Spring', 'Microservices'],
          minAnnualSalary: 130000,
          maxAnnualSalary: 180000,
        })
        .expect(201);

      const newJobId = jobResponse.body._id;

      // Step 2: User applies
      const applyResponse = await request(app)
        .post('/api/jobApplication')
        .set('Cookie', userCookie)
        .send({
          jobPostingId: newJobId,
          coverLetter: 'I have 5 years of experience...',
        })
        .expect(201);

      const applicationId = applyResponse.body._id;
      expect(applyResponse.body.status).toBe('applied');

      // Step 3: Recruiter reviews application
      await request(app)
        .put(`/api/jobApplication/${applicationId}`)
        .set('Cookie', recruiterCookie)
        .send({ status: 'reviewed' })
        .expect(200);

      // Step 4: Move to interview
      await request(app)
        .put(`/api/jobApplication/${applicationId}`)
        .set('Cookie', recruiterCookie)
        .send({ status: 'interview' })
        .expect(200);

      // Step 5: Send offer
      await request(app)
        .put(`/api/jobApplication/${applicationId}`)
        .set('Cookie', recruiterCookie)
        .send({ status: 'offer' })
        .expect(200);

      // Step 6: User accepts
      await request(app)
        .put(`/api/jobApplication/${applicationId}`)
        .set('Cookie', userCookie)
        .send({ status: 'accepted' })
        .expect(200);

      // Verify final status
      const finalApp = await request(app)
        .get(`/api/jobApplication/${newJobId}/:jobSource/appliedUsers`)
        .set('Cookie', recruiterCookie);

      const application = finalApp.body.find(app => app._id === applicationId);
      expect(application.status).toBe('accepted');
    });
  });

  describe('Application Withdrawal', () => {
    let applicationId;

    beforeEach(async () => {
      const applyResponse = await request(app)
        .post('/api/jobApplication')
        .set('Cookie', userCookie)
        .send({
          jobPostingId: jobId,
          coverLetter: 'I am interested...',
        });

      applicationId = applyResponse.body._id;
    });

    it('should allow user to withdraw application', async () => {
      await request(app)
        .delete(`/api/jobApplication/${applicationId}`)
        .set('Cookie', userCookie)
        .expect(204);

      // Verify application is deleted
      const applications = await request(app)
        .get('/api/jobApplication')
        .set('Cookie', userCookie);

      const found = applications.body.find(app => app._id === applicationId);
      expect(found).toBeUndefined();
    });

    it('should prevent withdrawal of other user\'s application', async () => {
      // Create another user
      await request(app)
        .post('/api/register')
        .send({
          username: 'anotheruser',
          email: 'another@example.com',
          password: 'SecurePass123!',
          firstName: 'Another',
          lastName: 'User',
          role: 'user',
        });

      const anotherLogin = await request(app)
        .post('/api/login')
        .send({
          email: 'another@example.com',
          password: 'SecurePass123!',
        });

      const anotherCookie = anotherLogin.headers['set-cookie'];

      // Try to delete first user's application
      await request(app)
        .delete(`/api/jobApplication/${applicationId}`)
        .set('Cookie', anotherCookie)
        .expect(403);
    });
  });
});

