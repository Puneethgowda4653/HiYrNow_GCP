/**
 * Unit Tests - Job Posting Service
 * 
 * Tests the optimized job posting service
 */

const {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
  createTestUser,
  createTestRecruiter,
  mockRequest,
  mockResponse,
} = require('../setup');

const jobPostingModel = require('../../models/job-posting/job-posting.model.server');

describe('Job Posting Service - Unit Tests', () => {
  let testRecruiter;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    testRecruiter = await createTestRecruiter();
  });

  describe('createJobPosting', () => {
    it('should create a job posting with valid data', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco',
        type: 'Full-time',
        description: 'We are looking for a talented software engineer...',
        skillsRequired: ['JavaScript', 'Node.js', 'React'],
        minAnnualSalary: 80000,
        maxAnnualSalary: 120000,
        minWorkExperience: 2,
        maxWorkExperience: 5,
        user: testRecruiter._id,
        status: 'active',
      };

      const job = await jobPostingModel.createJobPosting(jobData);

      expect(job).toBeDefined();
      expect(job.title).toBe(jobData.title);
      expect(job.company).toBe(jobData.company);
      expect(job.location).toBe(jobData.location);
      expect(job.type).toBe(jobData.type);
      expect(job.status).toBe('active');
      expect(job.user.toString()).toBe(testRecruiter._id.toString());
    });

    it('should reject job posting without required fields', async () => {
      const invalidJobData = {
        title: 'Software Engineer',
        // Missing required fields
      };

      await expect(
        jobPostingModel.createJobPosting(invalidJobData)
      ).rejects.toThrow();
    });

    it('should set default status to active', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        type: 'Full-time',
        user: testRecruiter._id,
      };

      const job = await jobPostingModel.createJobPosting(jobData);
      expect(job.status).toBe('active');
    });
  });

  describe('findJobPostingById', () => {
    it('should find job by ID', async () => {
      const jobData = {
        title: 'Backend Developer',
        company: 'StartupXYZ',
        location: 'New York',
        type: 'Full-time',
        user: testRecruiter._id,
      };

      const createdJob = await jobPostingModel.createJobPosting(jobData);
      const foundJob = await jobPostingModel.findJobPostingById(createdJob._id);

      expect(foundJob).toBeDefined();
      expect(foundJob._id.toString()).toBe(createdJob._id.toString());
      expect(foundJob.title).toBe(jobData.title);
    });

    it('should return null for non-existent job', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const job = await jobPostingModel.findJobPostingById(fakeId);
      expect(job).toBeNull();
    });
  });

  describe('findJobPostingsWithFilter', () => {
    beforeEach(async () => {
      // Create multiple test jobs
      await jobPostingModel.createJobPosting({
        title: 'Frontend Developer',
        company: 'CompanyA',
        location: 'San Francisco',
        type: 'Full-time',
        status: 'active',
        user: testRecruiter._id,
        minAnnualSalary: 90000,
        maxAnnualSalary: 130000,
      });

      await jobPostingModel.createJobPosting({
        title: 'Backend Developer',
        company: 'CompanyB',
        location: 'New York',
        type: 'Part-time',
        status: 'active',
        user: testRecruiter._id,
        minAnnualSalary: 70000,
        maxAnnualSalary: 100000,
      });

      await jobPostingModel.createJobPosting({
        title: 'Full Stack Developer',
        company: 'CompanyC',
        location: 'Remote',
        type: 'Contract',
        status: 'closed',
        user: testRecruiter._id,
      });
    });

    it('should filter by status', async () => {
      const jobs = await jobPostingModel.findJobPostingsWithFilter(
        { status: 'active' },
        { datePosted: -1 },
        0,
        10
      );

      expect(jobs).toHaveLength(2);
      jobs.forEach(job => {
        expect(job.status).toBe('active');
      });
    });

    it('should filter by type', async () => {
      const jobs = await jobPostingModel.findJobPostingsWithFilter(
        { type: 'Full-time' },
        { datePosted: -1 },
        0,
        10
      );

      expect(jobs.length).toBeGreaterThan(0);
      jobs.forEach(job => {
        expect(job.type).toBe('Full-time');
      });
    });

    it('should paginate results', async () => {
      // Get first page
      const page1 = await jobPostingModel.findJobPostingsWithFilter(
        { status: 'active' },
        { datePosted: -1 },
        0,
        1
      );

      // Get second page
      const page2 = await jobPostingModel.findJobPostingsWithFilter(
        { status: 'active' },
        { datePosted: -1 },
        1,
        1
      );

      expect(page1).toHaveLength(1);
      expect(page2).toHaveLength(1);
      expect(page1[0]._id.toString()).not.toBe(page2[0]._id.toString());
    });

    it('should sort results', async () => {
      const jobs = await jobPostingModel.findJobPostingsWithFilter(
        { status: 'active' },
        { datePosted: -1 },
        0,
        10
      );

      // Check that results are sorted by datePosted descending
      for (let i = 0; i < jobs.length - 1; i++) {
        expect(jobs[i].datePosted >= jobs[i + 1].datePosted).toBeTruthy();
      }
    });
  });

  describe('updateJobPosting', () => {
    it('should update job posting fields', async () => {
      const job = await jobPostingModel.createJobPosting({
        title: 'DevOps Engineer',
        company: 'CloudCorp',
        location: 'Seattle',
        type: 'Full-time',
        user: testRecruiter._id,
      });

      const updates = {
        title: 'Senior DevOps Engineer',
        location: 'Remote',
        minAnnualSalary: 100000,
      };

      await jobPostingModel.updateJobPosting(job._id, updates);

      const updatedJob = await jobPostingModel.findJobPostingById(job._id);

      expect(updatedJob.title).toBe(updates.title);
      expect(updatedJob.location).toBe(updates.location);
      expect(updatedJob.minAnnualSalary).toBe(updates.minAnnualSalary);
      expect(updatedJob.company).toBe('CloudCorp'); // Unchanged
    });

    it('should not update immutable fields', async () => {
      const job = await jobPostingModel.createJobPosting({
        title: 'Data Scientist',
        company: 'DataCo',
        location: 'Boston',
        type: 'Full-time',
        user: testRecruiter._id,
      });

      const originalUserId = job.user.toString();

      const newUser = await createTestUser({
        username: 'anotheruser',
        email: 'another@example.com',
      });

      // Try to change user (should be prevented by business logic)
      await jobPostingModel.updateJobPosting(job._id, {
        user: newUser._id,
      });

      const updatedJob = await jobPostingModel.findJobPostingById(job._id);

      // User should remain unchanged
      expect(updatedJob.user.toString()).toBe(originalUserId);
    });
  });

  describe('deleteJobPosting', () => {
    it('should delete job posting', async () => {
      const job = await jobPostingModel.createJobPosting({
        title: 'QA Engineer',
        company: 'TestCo',
        location: 'Austin',
        type: 'Full-time',
        user: testRecruiter._id,
      });

      await jobPostingModel.deleteJobPosting(job._id);

      const deletedJob = await jobPostingModel.findJobPostingById(job._id);
      expect(deletedJob).toBeNull();
    });

    it('should not throw error when deleting non-existent job', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      await expect(
        jobPostingModel.deleteJobPosting(fakeId)
      ).resolves.not.toThrow();
    });
  });

  describe('countJobPostingsWithFilter', () => {
    beforeEach(async () => {
      await jobPostingModel.createJobPosting({
        title: 'Job 1',
        company: 'Co1',
        location: 'NYC',
        type: 'Full-time',
        status: 'active',
        user: testRecruiter._id,
      });

      await jobPostingModel.createJobPosting({
        title: 'Job 2',
        company: 'Co2',
        location: 'SF',
        type: 'Full-time',
        status: 'active',
        user: testRecruiter._id,
      });

      await jobPostingModel.createJobPosting({
        title: 'Job 3',
        company: 'Co3',
        location: 'LA',
        type: 'Part-time',
        status: 'closed',
        user: testRecruiter._id,
      });
    });

    it('should count active jobs', async () => {
      const count = await jobPostingModel.countJobPostingsWithFilter({
        status: 'active',
      });

      expect(count).toBe(2);
    });

    it('should count all jobs with empty filter', async () => {
      const count = await jobPostingModel.countJobPostingsWithFilter({});
      expect(count).toBe(3);
    });
  });

  describe('Performance - .lean() usage', () => {
    it('should return plain objects (not Mongoose documents)', async () => {
      const job = await jobPostingModel.createJobPosting({
        title: 'Test Job',
        company: 'Test Co',
        location: 'Test City',
        type: 'Full-time',
        user: testRecruiter._id,
      });

      const jobs = await jobPostingModel.findJobPostingsWithFilter(
        {},
        { datePosted: -1 },
        0,
        10
      );

      // If using .lean(), should not have Mongoose methods
      expect(typeof jobs[0].save).toBe('undefined');
      expect(typeof jobs[0].toJSON).toBe('undefined');
    });
  });
});

