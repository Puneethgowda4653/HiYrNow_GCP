/**
 * OPTIMIZED Job Application Service
 * 
 * Improvements:
 * - Idempotency (prevent duplicate applications)
 * - Outbox pattern (reliable notifications)
 * - Caching
 * - Metrics tracking
 * - Request validation
 */

const { requireAuth, requireVerified } = require('../middleware/auth');
const { requireRecruiterOrAdmin } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validate');
const { cache, TTL } = require('../infra/cache');
const { invalidateByEntity } = require('../infra/cache-invalidation');
const { getMetrics } = require('../infra/telemetry');
const { withOutboxEvent } = require('../infra/outbox');
const logger = require('../infra/logger').logger;
const { z } = require('zod');
const mongoose = require('mongoose');

module.exports = function (app) {
  const jobApplicationModel = require('../models/job-application/job-application.model.server');
  const jobPostingModel = require('../models/job-posting/job-posting.model.server');
  const userModel = require('../models/user/user.model.server');
  
  const metrics = getMetrics();

  // Validation schema
  const applyJobSchema = z.object({
    jobId: z.string().regex(/^[0-9a-f]{24}$/),
    coverLetter: z.string().max(2000).optional(),
    customQuestions: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  });

  /**
   * @swagger
   * /api/v1/applications:
   *   post:
   *     summary: Submit job application
   *     tags: [Applications]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - jobId
   *             properties:
   *               jobId:
   *                 type: string
   *               coverLetter:
   *                 type: string
   *               customQuestions:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     question:
   *                       type: string
   *                     answer:
   *                       type: string
   *     responses:
   *       201:
   *         description: Application submitted
   *       409:
   *         description: Already applied to this job
   */
  app.post(
    '/api/v1/applications',
    requireAuth,
    requireVerified,
    validateBody(applyJobSchema),
    async (req, res) => {
      try {
        const userId = req.session.user._id;
        const { jobId, coverLetter, customQuestions } = req.body;

        // Check if job exists
        const job = await jobPostingModel.findJobPostingById(jobId);
        
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        if (job.status !== 'active') {
          return res.status(400).json({ error: 'Job is no longer accepting applications' });
        }

        // Check for duplicate application (idempotency at DB level)
        const existing = await jobApplicationModel.findJobApplicationByJobIdAndUserId(jobId, userId);
        
        if (existing) {
          logger.warn('Duplicate application attempt', { userId, jobId });
          return res.status(409).json({
            error: 'Already applied',
            message: 'You have already applied to this job',
            applicationId: existing._id,
          });
        }

        // Use outbox pattern for reliable event publishing
        await withOutboxEvent(async (session) => {
          // Create application
          const applicationData = {
            user: userId,
            jobPosting: jobId,
            status: 'applied',
            dateApplied: new Date(),
            coverLetter,
            customQuestions: customQuestions || [],
          };

          const application = await jobApplicationModel.createJobApplication(applicationData);

          // Invalidate caches
          await invalidateByEntity('applications', userId.toString());
          await invalidateByEntity('job-applications', jobId);

          // Record metric
          metrics.recordJobApplication(userId, jobId, 'submitted');

          logger.info('Job application submitted', {
            applicationId: application._id,
            userId,
            jobId,
          });

          res.status(201).json({
            message: 'Application submitted successfully',
            applicationId: application._id,
          });

          // Return outbox event data
          return {
            eventType: 'application.submitted',
            aggregateType: 'JobApplication',
            aggregateId: application._id.toString(),
            payload: {
              applicantId: userId.toString(),
              recruiterId: job.user.toString(),
              jobId: jobId,
              jobTitle: job.title,
            },
            metadata: {
              userId: userId.toString(),
              correlationId: req.id,
            },
          };
        });

      } catch (error) {
        logger.error('Error submitting application', {
          error: error.message,
          userId: req.session.user._id,
          jobId: req.body.jobId,
        });
        
        if (error.code === 11000) {
          // Duplicate key error (unique index violation)
          return res.status(409).json({
            error: 'Already applied',
            message: 'You have already applied to this job',
          });
        }
        
        res.status(500).json({ error: 'Failed to submit application' });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/applications:
   *   get:
   *     summary: Get user's applications
   *     tags: [Applications]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/pageParam'
   *       - $ref: '#/components/parameters/limitParam'
   *       - name: status
   *         in: query
   *         schema:
   *           type: string
   *           enum: [applied, reviewed, interview, offer, rejected, accepted]
   *     responses:
   *       200:
   *         description: List of applications
   */
  app.get(
    '/api/v1/applications',
    requireAuth,
    async (req, res) => {
      try {
        const userId = req.session.user._id;
        const { page = 1, limit = 20, status } = req.query;

        // Build filter
        const filter = { user: userId };
        if (status) filter.status = status;

        // Try cache
        const cacheKey = `applications:user:${userId}:${page}:${limit}:${status || 'all'}`;
        const cached = await cache.get(cacheKey);
        
        if (cached) {
          metrics.recordCacheHit(cacheKey);
          return res.json(JSON.parse(cached));
        }
        
        metrics.recordCacheMiss(cacheKey);

        // Query with pagination
        const skip = (page - 1) * limit;
        
        const [applications, total] = await Promise.all([
          jobApplicationModel
            .find(filter)
            .sort({ dateApplied: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('jobPosting', 'title company location status datePosted')
            .lean(),
          jobApplicationModel.countDocuments(filter),
        ]);

        const response = {
          applications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        };

        // Cache for 5 minutes
        await cache.set(cacheKey, JSON.stringify(response), 300);

        res.json(response);
      } catch (error) {
        logger.error('Error fetching applications', {
          error: error.message,
          userId: req.session.user._id,
        });
        res.status(500).json({ error: 'Failed to fetch applications' });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/applications/{id}:
   *   get:
   *     summary: Get application details
   *     tags: [Applications]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Application details
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  app.get(
    '/api/v1/applications/:id',
    requireAuth,
    async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.session.user._id;
        const userRole = req.session.user.role;

        const application = await jobApplicationModel
          .findById(id)
          .populate('user', 'firstName lastName email profilePicture')
          .populate('jobPosting', 'title company location user')
          .lean();

        if (!application) {
          return res.status(404).json({ error: 'Application not found' });
        }

        // Authorization: owner or recruiter or admin
        const isOwner = application.user._id.toString() === userId.toString();
        const isRecruiter = application.jobPosting.user.toString() === userId.toString();
        const isAdmin = userRole === 'admin';

        if (!isOwner && !isRecruiter && !isAdmin) {
          return res.status(403).json({ error: 'Not authorized' });
        }

        res.json(application);
      } catch (error) {
        logger.error('Error fetching application', {
          error: error.message,
          applicationId: req.params.id,
        });
        res.status(500).json({ error: 'Failed to fetch application' });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/applications/{id}/status:
   *   put:
   *     summary: Update application status (recruiter only)
   *     tags: [Applications]
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
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [reviewed, interview, offer, rejected, accepted]
   *               comment:
   *                 type: string
   *     responses:
   *       200:
   *         description: Status updated
   */
  app.put(
    '/api/v1/applications/:id/status',
    requireAuth,
    requireRecruiterOrAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { status, comment } = req.body;
        const userId = req.session.user._id;

        // Get application
        const application = await jobApplicationModel.findById(id).populate('jobPosting');

        if (!application) {
          return res.status(404).json({ error: 'Application not found' });
        }

        // Check authorization
        const isRecruiter = application.jobPosting.user.toString() === userId.toString();
        const isAdmin = req.session.user.role === 'admin';

        if (!isRecruiter && !isAdmin) {
          return res.status(403).json({ error: 'Not authorized' });
        }

        const oldStatus = application.status;

        // Use outbox pattern
        await withOutboxEvent(async (session) => {
          // Update status
          await jobApplicationModel.updateJobApplication(id, {
            status,
            ...(comment && {
              comments: [
                ...(application.comments || []),
                {
                  text: comment,
                  author: userId,
                  createdAt: new Date(),
                },
              ],
            }),
          });

          // Invalidate caches
          await invalidateByEntity('applications', application.user.toString());
          await invalidateByEntity('job-applications', application.jobPosting._id.toString());

          logger.info('Application status updated', {
            applicationId: id,
            oldStatus,
            newStatus: status,
            recruiterId: userId,
          });

          res.json({ message: 'Status updated successfully' });

          // Outbox event
          return {
            eventType: 'application.status.changed',
            aggregateType: 'JobApplication',
            aggregateId: id,
            payload: {
              applicantId: application.user.toString(),
              jobId: application.jobPosting._id.toString(),
              jobTitle: application.jobPosting.title,
              oldStatus,
              newStatus: status,
            },
            metadata: {
              userId: userId.toString(),
            },
          };
        });

      } catch (error) {
        logger.error('Error updating application status', {
          error: error.message,
          applicationId: req.params.id,
        });
        res.status(500).json({ error: 'Failed to update status' });
      }
    }
  );

  /**
   * @swagger
   * /api/v1/applications/{id}:
   *   delete:
   *     summary: Withdraw application
   *     tags: [Applications]
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
   *         description: Application withdrawn
   */
  app.delete(
    '/api/v1/applications/:id',
    requireAuth,
    async (req, res) => {
      try {
        const { id } = req.params;
        const userId = req.session.user._id;

        const application = await jobApplicationModel.findById(id);

        if (!application) {
          return res.status(404).json({ error: 'Application not found' });
        }

        // Only owner can withdraw
        if (application.user.toString() !== userId.toString()) {
          return res.status(403).json({ error: 'Not authorized' });
        }

        await jobApplicationModel.deleteJobApplication(id);

        // Invalidate caches
        await invalidateByEntity('applications', userId.toString());
        await invalidateByEntity('job-applications', application.jobPosting.toString());

        logger.info('Application withdrawn', { applicationId: id, userId });

        res.status(204).send();
      } catch (error) {
        logger.error('Error deleting application', {
          error: error.message,
          applicationId: req.params.id,
        });
        res.status(500).json({ error: 'Failed to withdraw application' });
      }
    }
  );

  // Legacy endpoint redirects
  // app.post('/api/jobApplication', (req, res) => res.redirect(307, '/api/v1/applications'));
  // app.get('/api/jobApplication', (req, res) => res.redirect('/api/v1/applications'));
};

