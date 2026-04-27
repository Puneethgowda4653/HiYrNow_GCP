/**
 * OPTIMIZED Job Posting Service
 * 
 * Improvements applied:
 * - Caching with Redis
 * - Pagination with .lean()
 * - Field projections
 * - Metrics tracking
 * - Outbox pattern for events
 * - Request validation
 * - Swagger documentation
 */

const { requireAuth, requireVerified } = require('../middleware/auth');
const { requireRecruiterOrAdmin, requireOwnershipOrAdmin } = require('../middleware/rbac');
const { validateBody, validateQuery } = require('../middleware/validate');
const { cache, TTL } = require('../infra/cache');
const { invalidateByPattern } = require('../infra/cache-invalidation');
const { getMetrics } = require('../infra/telemetry');
const { withOutboxEvent } = require('../infra/outbox');
const logger = require('../infra/logger').logger;
const { z } = require('zod');

module.exports = function (app) {
  const jobPostingModel = require('../models/job-posting/job-posting.model.server');
  const jobApplicationModel = require('../models/job-application/job-application.model.server');
  const userModel = require('../models/user/user.model.server');
  const recruiterDetailModel = require('../models/recruiter-detail/recruiter-detail.model.server');
  
  const metrics = getMetrics();

  // Validation schemas
  const createJobSchema = z.object({
    title: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    location: z.string().min(1).max(200),
    type: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']),
    description: z.string().min(50).optional(),
    skillsRequired: z.array(z.string()).optional(),
    minAnnualSalary: z.number().positive().optional(),
    maxAnnualSalary: z.number().positive().optional(),
    minWorkExperience: z.number().min(0).optional(),
    maxWorkExperience: z.number().min(0).optional(),
  });

  const listJobsSchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
    location: z.string().optional(),
    type: z.string().optional(),
    minSalary: z.string().regex(/^\d+$/).transform(Number).optional(),
    maxSalary: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['active', 'closed', 'draft']).optional(),
  });

  /**
   * @swagger
   * /api/v1/jobs:
   *   get:
   *     summary: List job postings with pagination
   *     tags: [Jobs]
   *     security: []
   *     parameters:
   *       - $ref: '#/components/parameters/pageParam'
   *       - $ref: '#/components/parameters/limitParam'
   *       - name: location
   *         in: query
   *         schema:
   *           type: string
   *       - name: type
   *         in: query
   *         schema:
   *           type: string
   *           enum: [Full-time, Part-time, Contract, Internship]
   *       - name: minSalary
   *         in: query
   *         schema:
   *           type: number
   *       - name: maxSalary
   *         in: query
   *         schema:
   *           type: number
   *       - name: status
   *         in: query
   *         schema:
   *           type: string
   *           enum: [active, closed, draft]
   *           default: active
   *     responses:
   *       200:
   *         description: List of jobs
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 jobs:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/JobPosting'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   */
  app.get('/api/v1/jobs', validateQuery(listJobsSchema), async (req, res) => {
    try {
      const { page, limit, location, type, minSalary, maxSalary, status } = req.query;
      
      // Build filter
      const filter = { status: status || 'active' };
      if (location) filter.location = new RegExp(location, 'i');
      if (type) filter.type = type;
      if (minSalary) filter.maxAnnualSalary = { $gte: minSalary };
      if (maxSalary) filter.minAnnualSalary = { $lte: maxSalary };

      // Create cache key
      const cacheKey = `jobs:list:${JSON.stringify({ page, limit, filter })}`;
      
      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        metrics.recordCacheHit(cacheKey);
        return res.json(JSON.parse(cached));
      }
      
      metrics.recordCacheMiss(cacheKey);

      // Query with pagination and projection
      const skip = (page - 1) * limit;
      
      const [jobs, total] = await Promise.all([
        jobPostingModel.findJobPostingsWithFilter(
          filter,
          { datePosted: -1 },
          skip,
          limit
        ),
        jobPostingModel.countJobPostingsWithFilter(filter),
      ]);

      const response = {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };

      // Cache for 10 minutes
      await cache.set(cacheKey, JSON.stringify(response), TTL.JOBS);

      res.json(response);
    } catch (error) {
      logger.error('Error listing jobs', { error: error.message });
      res.status(500).json({ error: 'Failed to list jobs' });
    }
  });

  /**
   * @swagger
   * /api/v1/jobs/{id}:
   *   get:
   *     summary: Get job posting by ID
   *     tags: [Jobs]
   *     security: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Job details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/JobPosting'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  app.get('/api/v1/jobs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Try cache first
      const cacheKey = `job:${id}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        metrics.recordCacheHit(cacheKey);
        return res.json(JSON.parse(cached));
      }
      
      metrics.recordCacheMiss(cacheKey);

      const job = await jobPostingModel.findJobPostingById(id);
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Populate recruiter info
      await job.populate('user', 'firstName lastName profilePicture').execPopulate();

      // Cache for 1 hour
      await cache.set(cacheKey, JSON.stringify(job), TTL.JOB_DETAIL);

      res.json(job);
    } catch (error) {
      logger.error('Error fetching job', { error: error.message, jobId: req.params.id });
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  /**
   * @swagger
   * /api/v1/jobs:
   *   post:
   *     summary: Create job posting
   *     tags: [Jobs]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/JobPosting'
   *     responses:
   *       201:
   *         description: Job created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/JobPosting'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  app.post(
    '/api/v1/jobs',
    requireAuth,
    requireVerified,
    requireRecruiterOrAdmin,
    validateBody(createJobSchema),
    async (req, res) => {
      try {
        const userId = req.session.user._id;
        
        // Use outbox pattern for reliable event publishing
        await withOutboxEvent(async (session) => {
          // Create job posting in transaction
          const jobData = {
            ...req.body,
            user: userId,
            status: 'active',
            datePosted: new Date(),
          };
          
          const job = await jobPostingModel.createJobPosting(jobData);

          // Invalidate related caches
          await invalidateByPattern('jobs:list:*');
          await invalidateByPattern('jobs:user:*');

          // Record metric
          metrics.recordJobApplication(userId, job._id, 'created');

          logger.info('Job posting created', {
            jobId: job._id,
            userId,
            title: job.title,
          });

          res.status(201).json(job);

          // Return outbox event data
          return {
            eventType: 'job.posted',
            aggregateType: 'JobPosting',
            aggregateId: job._id.toString(),
            payload: {
              title: job.title,
              company: job.company,
              location: job.location,
              recruiterId: userId.toString(),
            },
            metadata: {
              userId: userId.toString(),
              correlationId: req.id,
            },
          };
        });

      } catch (error) {
        logger.error('Error creating job posting', {
          error: error.message,
          userId: req.session.user._id,
        });
        res.status(500).json({ error: 'Failed to create job posting' });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/jobs/{id}:
   *   put:
   *     summary: Update job posting
   *     tags: [Jobs]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/JobPosting'
   *     responses:
   *       200:
   *         description: Job updated
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  app.put(
    '/api/v1/jobs/:id',
    requireAuth,
    requireVerified,
    async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.session.user._id;

        // Check ownership
        const job = await jobPostingModel.findJobPostingById(id);
        
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        if (job.user.toString() !== userId.toString() && req.session.user.role !== 'admin') {
          return res.status(403).json({ error: 'Not authorized to update this job' });
        }

        // Update with outbox pattern
        await withOutboxEvent(async (session) => {
          await jobPostingModel.updateJobPosting(id, req.body);

          // Invalidate caches
          await cache.del(`job:${id}`);
          await invalidateByPattern('jobs:list:*');

          logger.info('Job posting updated', { jobId: id, userId });

          res.json({ message: 'Job updated successfully' });

          // Outbox event
          return {
            eventType: 'job.updated',
            aggregateType: 'JobPosting',
            aggregateId: id,
            payload: { changes: req.body },
            metadata: { userId: userId.toString() },
          };
        });

      } catch (error) {
        logger.error('Error updating job', { error: error.message, jobId: req.params.id });
        res.status(500).json({ error: 'Failed to update job' });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/jobs/{id}:
   *   delete:
   *     summary: Delete job posting
   *     tags: [Jobs]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Job deleted
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  app.delete(
    '/api/v1/jobs/:id',
    requireAuth,
    async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.session.user._id;

        // Check ownership
        const job = await jobPostingModel.findJobPostingById(id);
        
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        if (job.user.toString() !== userId.toString() && req.session.user.role !== 'admin') {
          return res.status(403).json({ error: 'Not authorized to delete this job' });
        }

        await jobPostingModel.deleteJobPosting(id);

        // Invalidate caches
        await cache.del(`job:${id}`);
        await invalidateByPattern('jobs:list:*');

        logger.info('Job posting deleted', { jobId: id, userId });

        res.status(204).send();
      } catch (error) {
        logger.error('Error deleting job', { error: error.message, jobId: req.params.id });
        res.status(500).json({ error: 'Failed to delete job' });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/jobs/{id}/applications:
   *   get:
   *     summary: Get applications for a job (recruiter only)
   *     tags: [Jobs]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *       - $ref: '#/components/parameters/pageParam'
   *       - $ref: '#/components/parameters/limitParam'
   *     responses:
   *       200:
   *         description: List of applications
   */
  app.get(
    '/api/v1/jobs/:id/applications',
    requireAuth,
    requireRecruiterOrAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Check ownership
        const job = await jobPostingModel.findJobPostingById(id);
        
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        const userId = req.session.user._id;
        if (job.user.toString() !== userId.toString() && req.session.user.role !== 'admin') {
          return res.status(403).json({ error: 'Not authorized' });
        }

        // Try cache
        const cacheKey = `job:${id}:applications:${page}:${limit}`;
        const cached = await cache.get(cacheKey);
        
        if (cached) {
          metrics.recordCacheHit(cacheKey);
          return res.json(JSON.parse(cached));
        }
        
        metrics.recordCacheMiss(cacheKey);

        // Query applications with pagination
        const skip = (page - 1) * limit;
        const applications = await jobApplicationModel
          .find({ jobPosting: id })
          .sort({ dateApplied: -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'firstName lastName email profilePicture')
          .lean();

        const total = await jobApplicationModel.countDocuments({ jobPosting: id });

        const response = {
          applications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
          },
        };

        // Cache for 5 minutes (shorter TTL as applications change frequently)
        await cache.set(cacheKey, JSON.stringify(response), 300);

        res.json(response);
      } catch (error) {
        logger.error('Error fetching applications', { error: error.message, jobId: req.params.id });
        res.status(500).json({ error: 'Failed to fetch applications' });
      }
    }
  );

  // Legacy endpoints (redirect to new ones)
  // app.get('/api/allJobPosting', (req, res) => res.redirect('/api/v1/jobs'));
  // app.get('/api/jobPosting/:id', (req, res) => res.redirect(`/api/v1/jobs/${req.params.id}`));
  // app.post('/api/jobPosting', (req, res) => res.redirect(307, '/api/v1/jobs'));
};

