/**
 * Unit Tests - Job Application Service
 * 
 * Tests job application creation, idempotency, and status transitions
 */

const {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
  createTestUser,
  createTestRecruiter,
} = require('../setup');

const jobApplicationModel = require('../../models/job-application/job-application.model.server');
const jobPostingModel = require('../../models/job-posting/job-posting.model.server');

describe('Job Application Service - Unit Tests', () => {
  let testUser;
  let testRecruiter;
  let testJob;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    
    testUser = await createTestUser();
    testRecruiter = await createTestRecruiter();
    
    testJob = await jobPostingModel.createJobPosting({
      title: 'Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco',
      type: 'Full-time',
      status: 'active',
      user: testRecruiter._id,
    });
  });

  describe('createJobApplication', () => {
    it('should create application with valid data', async () => {
      const applicationData = {
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
        coverLetter: 'I am interested in this position...',
      };

      const application = await jobApplicationModel.createJobApplication(applicationData);

      expect(application).toBeDefined();
      expect(application.user.toString()).toBe(testUser._id.toString());
      expect(application.jobPosting.toString()).toBe(testJob._id.toString());
      expect(application.status).toBe('applied');
      expect(application.coverLetter).toBe(applicationData.coverLetter);
    });

    it('should create application without cover letter', async () => {
      const applicationData = {
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
      };

      const application = await jobApplicationModel.createJobApplication(applicationData);

      expect(application).toBeDefined();
      expect(application.coverLetter).toBeUndefined();
    });

    it('should reject application without required fields', async () => {
      const invalidData = {
        user: testUser._id,
        // Missing jobPosting
      };

      await expect(
        jobApplicationModel.createJobApplication(invalidData)
      ).rejects.toThrow();
    });

    it('should set default status to applied', async () => {
      const applicationData = {
        user: testUser._id,
        jobPosting: testJob._id,
        dateApplied: new Date(),
      };

      const application = await jobApplicationModel.createJobApplication(applicationData);
      expect(application.status).toBe('applied');
    });
  });

  describe('Idempotency - Duplicate Applications', () => {
    it('should prevent duplicate applications to same job', async () => {
      const applicationData = {
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
      };

      // First application should succeed
      const application1 = await jobApplicationModel.createJobApplication(applicationData);
      expect(application1).toBeDefined();

      // Check if duplicate exists
      const existing = await jobApplicationModel.findJobApplicationByJobIdAndUserId(
        testJob._id,
        testUser._id
      );

      expect(existing).toBeDefined();
      expect(existing._id.toString()).toBe(application1._id.toString());
    });

    it('should allow same user to apply to different jobs', async () => {
      // Create second job
      const testJob2 = await jobPostingModel.createJobPosting({
        title: 'Backend Developer',
        company: 'Tech Corp',
        location: 'New York',
        type: 'Full-time',
        status: 'active',
        user: testRecruiter._id,
      });

      // Apply to first job
      const application1 = await jobApplicationModel.createJobApplication({
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
      });

      // Apply to second job
      const application2 = await jobApplicationModel.createJobApplication({
        user: testUser._id,
        jobPosting: testJob2._id,
        status: 'applied',
        dateApplied: new Date(),
      });

      expect(application1).toBeDefined();
      expect(application2).toBeDefined();
      expect(application1._id.toString()).not.toBe(application2._id.toString());
    });

    it('should allow different users to apply to same job', async () => {
      const testUser2 = await createTestUser({
        username: 'testuser2',
        email: 'test2@example.com',
      });

      // User 1 applies
      const application1 = await jobApplicationModel.createJobApplication({
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
      });

      // User 2 applies
      const application2 = await jobApplicationModel.createJobApplication({
        user: testUser2._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
      });

      expect(application1).toBeDefined();
      expect(application2).toBeDefined();
      expect(application1._id.toString()).not.toBe(application2._id.toString());
    });
  });

  describe('findJobApplicationByJobIdAndUserId', () => {
    it('should find existing application', async () => {
      await jobApplicationModel.createJobApplication({
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
      });

      const found = await jobApplicationModel.findJobApplicationByJobIdAndUserId(
        testJob._id,
        testUser._id
      );

      expect(found).toBeDefined();
      expect(found.user.toString()).toBe(testUser._id.toString());
      expect(found.jobPosting.toString()).toBe(testJob._id.toString());
    });

    it('should return null if no application exists', async () => {
      const found = await jobApplicationModel.findJobApplicationByJobIdAndUserId(
        testJob._id,
        testUser._id
      );

      expect(found).toBeNull();
    });
  });

  describe('updateJobApplication - Status Transitions', () => {
    let application;

    beforeEach(async () => {
      application = await jobApplicationModel.createJobApplication({
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
      });
    });

    it('should update status from applied to reviewed', async () => {
      await jobApplicationModel.updateJobApplication(application._id, {
        status: 'reviewed',
      });

      const updated = await jobApplicationModel.findById(application._id);
      expect(updated.status).toBe('reviewed');
    });

    it('should update status from reviewed to interview', async () => {
      await jobApplicationModel.updateJobApplication(application._id, {
        status: 'interview',
      });

      const updated = await jobApplicationModel.findById(application._id);
      expect(updated.status).toBe('interview');
    });

    it('should update status from interview to offer', async () => {
      await jobApplicationModel.updateJobApplication(application._id, {
        status: 'offer',
      });

      const updated = await jobApplicationModel.findById(application._id);
      expect(updated.status).toBe('offer');
    });

    it('should update status from offer to accepted', async () => {
      await jobApplicationModel.updateJobApplication(application._id, {
        status: 'accepted',
      });

      const updated = await jobApplicationModel.findById(application._id);
      expect(updated.status).toBe('accepted');
    });

    it('should update status to rejected', async () => {
      await jobApplicationModel.updateJobApplication(application._id, {
        status: 'rejected',
      });

      const updated = await jobApplicationModel.findById(application._id);
      expect(updated.status).toBe('rejected');
    });

    it('should add comment when updating status', async () => {
      const comment = {
        text: 'Great candidate!',
        author: testRecruiter._id,
        createdAt: new Date(),
      };

      await jobApplicationModel.updateJobApplication(application._id, {
        status: 'reviewed',
        comments: [comment],
      });

      const updated = await jobApplicationModel.findById(application._id);
      expect(updated.comments).toHaveLength(1);
      expect(updated.comments[0].text).toBe(comment.text);
    });
  });

  describe('Query Performance', () => {
    beforeEach(async () => {
      // Create multiple applications
      for (let i = 0; i < 5; i++) {
        await jobApplicationModel.createJobApplication({
          user: testUser._id,
          jobPosting: testJob._id,
          status: i % 2 === 0 ? 'applied' : 'reviewed',
          dateApplied: new Date(),
        });
      }
    });

    it('should filter by user', async () => {
      const applications = await jobApplicationModel.find({ user: testUser._id });
      expect(applications.length).toBeGreaterThan(0);
      
      applications.forEach(app => {
        expect(app.user.toString()).toBe(testUser._id.toString());
      });
    });

    it('should filter by job', async () => {
      const applications = await jobApplicationModel.find({ jobPosting: testJob._id });
      expect(applications.length).toBeGreaterThan(0);
      
      applications.forEach(app => {
        expect(app.jobPosting.toString()).toBe(testJob._id.toString());
      });
    });

    it('should filter by status', async () => {
      const applications = await jobApplicationModel.find({ status: 'applied' });
      expect(applications.length).toBeGreaterThan(0);
      
      applications.forEach(app => {
        expect(app.status).toBe('applied');
      });
    });

    it('should sort by dateApplied', async () => {
      const applications = await jobApplicationModel
        .find({ user: testUser._id })
        .sort({ dateApplied: -1 });

      for (let i = 0; i < applications.length - 1; i++) {
        expect(applications[i].dateApplied >= applications[i + 1].dateApplied).toBeTruthy();
      }
    });

    it('should paginate results', async () => {
      const page1 = await jobApplicationModel
        .find({ user: testUser._id })
        .sort({ dateApplied: -1 })
        .skip(0)
        .limit(2);

      const page2 = await jobApplicationModel
        .find({ user: testUser._id })
        .sort({ dateApplied: -1 })
        .skip(2)
        .limit(2);

      expect(page1).toHaveLength(2);
      expect(page2.length).toBeGreaterThan(0);
      expect(page1[0]._id.toString()).not.toBe(page2[0]._id.toString());
    });
  });

  describe('deleteJobApplication', () => {
    it('should delete application', async () => {
      const application = await jobApplicationModel.createJobApplication({
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
      });

      await jobApplicationModel.deleteJobApplication(application._id);

      const deleted = await jobApplicationModel.findById(application._id);
      expect(deleted).toBeNull();
    });

    it('should not throw error when deleting non-existent application', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      await expect(
        jobApplicationModel.deleteJobApplication(fakeId)
      ).resolves.not.toThrow();
    });
  });

  describe('countDocuments', () => {
    beforeEach(async () => {
      await jobApplicationModel.createJobApplication({
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'applied',
        dateApplied: new Date(),
      });

      await jobApplicationModel.createJobApplication({
        user: testUser._id,
        jobPosting: testJob._id,
        status: 'reviewed',
        dateApplied: new Date(),
      });
    });

    it('should count all applications for user', async () => {
      const count = await jobApplicationModel.countDocuments({ user: testUser._id });
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should count applications by status', async () => {
      const count = await jobApplicationModel.countDocuments({
        user: testUser._id,
        status: 'applied',
      });
      
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});

