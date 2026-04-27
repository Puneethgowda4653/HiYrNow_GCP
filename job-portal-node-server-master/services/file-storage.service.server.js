/**
 * File Storage Service using S3/GCS
 * Handles profile pictures, resumes, and other file uploads
 */

const multer = require('multer');
const path = require('path');
const storage = require('../infra/storage');
const { requireAuth } = require('../middleware/auth');
const logger = require('../infra/logger').logger;

// Multer memory storage (files kept in memory as buffers)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Validate file types based on upload type
    const uploadType = req.path.includes('profile-pic') ? 'image' : 'document';
    
    if (uploadType === 'image') {
      const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedImageTypes.test(file.mimetype);
      
      if (extname && mimetype) {
        return cb(null, true);
      }
      return cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    } else {
      // Documents (resumes, etc.)
      const allowedDocTypes = /pdf|doc|docx/;
      const extname = allowedDocTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = /pdf|msword|vnd.openxmlformats-officedocument/.test(file.mimetype);
      
      if (extname && mimetype) {
        return cb(null, true);
      }
      return cb(new Error('Only document files (PDF, DOC, DOCX) are allowed'));
    }
  },
});

module.exports = function (app) {
  /**
   * Upload profile picture
   * POST /api/upload-profile-pic
   */
  app.post('/api/upload-profile-pic', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error_code: 1, 
          error_desc: 'No file uploaded' 
        });
      }

      const userId = req.session.user._id;
      const fileKey = storage.generateFileKey(userId, 'profile-pictures', req.file.originalname);

      // Delete existing profile picture if any
      // In a production system, you'd query your database for the old key
      // For now, we'll just upload the new one
      
      // Upload to S3/GCS
      await storage.uploadFile(req.file.buffer, fileKey, {
        contentType: req.file.mimetype,
        metadata: {
          userId: userId.toString(),
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Store the key in your database (user model)
      // You should update the user's profilePictureKey field here
      const UserModel = require('../models/user/user.model.server');
      await UserModel.updateUser(userId, { profilePictureKey: fileKey });

      logger.info('Profile picture uploaded', { userId, fileKey });

      res.json({
        error_code: 0,
        error_desc: null,
        file_uploaded: true,
        fileKey: fileKey,
      });
    } catch (error) {
      logger.error('Profile picture upload failed', { error: error.message });
      res.status(500).json({
        error_code: 1,
        error_desc: error.message,
      });
    }
  });


  /**
   * Upload cover photo
   * POST /api/upload-cover-photo
   */
  app.post('/api/upload-cover-photo', requireAuth, upload.single('coverPhoto'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error_code: 1, error_desc: 'No file uploaded' });
      }

      const userId = req.session.user._id;
      const fileKey = storage.generateFileKey(userId, 'cover-photos', req.file.originalname);

      await storage.uploadFile(req.file.buffer, fileKey, {
        contentType: req.file.mimetype,
        metadata: {
          userId: userId.toString(),
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Get the public URL
      const coverUrl = await storage.getCdnOrSignedUrl(fileKey, 3600 * 24 * 7); // 7 day URL

      // Save to user record
      const UserModel = require('../models/user/user.model.server');
      await UserModel.updateUser(userId, {
        coverPhotoUrl: coverUrl,
        coverPhotoKey: fileKey,
      });

      logger.info('Cover photo uploaded', { userId, fileKey });

      res.json({
        file_uploaded: true,
        success: true,
        url: coverUrl,
      });
    } catch (error) {
      logger.error('Cover photo upload failed', { error: error.message });
      res.status(500).json({ error_code: 1, error_desc: error.message });
    }
  });
  /**
   * Get profile picture URL (signed)
   * GET /api/profile-pic/:userId
   */
  app.get('/api/profile-pic/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      
      // Fetch user's profile picture key from database
      const UserModel = require('../models/user/user.model.server');
      const user = await UserModel.findUserById(userId);
      
      if (!user || !user.profilePictureKey) {
        return res.status(404).json({ 
          message: 'No profile picture found for user' 
        });
      }

      // Generate signed URL with CDN support
      const signedUrl = await storage.getCdnOrSignedUrl(user.profilePictureKey, 3600);

      res.json({
        url: signedUrl,
        expiresIn: 3600,
      });
    } catch (error) {
      logger.error('Failed to get profile picture URL', { error: error.message });
      res.status(500).json({ 
        error: 'Failed to retrieve profile picture' 
      });
    }
  });

  /**
   * Upload resume
   * POST /api/upload-resume
   */
  app.post('/api/upload-resume', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error_code: 1, 
          error_desc: 'No file uploaded' 
        });
      }

      const userId = req.session.user._id;
      const fileKey = storage.generateFileKey(userId, 'resumes', req.file.originalname);

      // Upload to S3/GCS
      const uploadResult = await storage.uploadFile(req.file.buffer, fileKey, {
        contentType: req.file.mimetype,
        metadata: {
          userId: userId.toString(),
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Store the key in your database (resume model or user model)
      const ResumeModel = require('../models/resume-upload/resume-upload.model.server');
      await ResumeModel.createOrUpdateResume(userId, {
        fileKey: fileKey,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date(),
      });

      // Optionally, trigger resume parsing job in the background
      const { resumeQueue } = require('../queues');
      await resumeQueue.add('parse-resume', {
        userId: userId.toString(),
        fileKey: fileKey,
        buffer: req.file.buffer.toString('base64'), // Pass buffer as base64
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      logger.info('Resume uploaded', { userId, fileKey });

      res.json({
        error_code: 0,
        error_desc: null,
        file_uploaded: true,
        fileKey: fileKey,
      });
    } catch (error) {
      logger.error('Resume upload failed', { error: error.message });
      res.status(500).json({
        error_code: 1,
        error_desc: error.message,
      });
    }
  });

  /**
   * Get resume URL (signed)
   * GET /api/resume/:userId
   */
  app.get('/api/resume/:userId', requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      
      // Check authorization (user can only access their own resume, or admin/recruiter)
      const requesterId = req.session.user._id.toString();
      const requesterRole = req.session.user.role;
      
      if (userId !== requesterId && requesterRole !== 'admin' && requesterRole !== 'recruiter') {
        return res.status(403).json({ 
          error: 'Unauthorized to access this resume' 
        });
      }

      // Fetch user's resume key from database
      const ResumeModel = require('../models/resume-upload/resume-upload.model.server');
      const resume = await ResumeModel.findResumeByUserId(userId);
      
      if (!resume || !resume.fileKey) {
        return res.status(404).json({ 
          message: 'No resume found for user' 
        });
      }

      // Generate signed URL
      const signedUrl = await storage.getSignedDownloadUrl(resume.fileKey, 3600);

      res.json({
        url: signedUrl,
        originalName: resume.originalName,
        expiresIn: 3600,
      });
    } catch (error) {
      logger.error('Failed to get resume URL', { error: error.message });
      res.status(500).json({ 
        error: 'Failed to retrieve resume' 
      });
    }
  });

  /**
   * Delete profile picture
   * DELETE /api/profile-pic
   */
  app.delete('/api/profile-pic', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user._id;
      
      // Fetch user's profile picture key from database
      const UserModel = require('../models/user/user.model.server');
      const user = await UserModel.findUserById(userId);
      
      if (!user || !user.profilePictureKey) {
        return res.status(404).json({ 
          message: 'No profile picture to delete' 
        });
      }

      // Delete from S3/GCS
      await storage.deleteFile(user.profilePictureKey);

      // Update database
      await UserModel.updateUser(userId, { profilePictureKey: null });

      logger.info('Profile picture deleted', { userId });

      res.json({
        message: 'Profile picture deleted successfully',
      });
    } catch (error) {
      logger.error('Profile picture deletion failed', { error: error.message });
      res.status(500).json({ 
        error: 'Failed to delete profile picture' 
      });
    }
  });

  /**
   * Get signed upload URL for direct client-side upload
   * POST /api/upload-url/profile-pic
   */
  app.post('/api/upload-url/profile-pic', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user._id;
      const { fileName, contentType } = req.body;

      if (!fileName || !contentType) {
        return res.status(400).json({ 
          error: 'fileName and contentType are required' 
        });
      }

      // Validate content type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(contentType)) {
        return res.status(400).json({ 
          error: 'Invalid content type. Only images allowed.' 
        });
      }

      const fileKey = storage.generateFileKey(userId, 'profile-pictures', fileName);

      // Generate signed upload URL (15 minutes expiry)
      const { url, key } = await storage.getSignedUploadUrl(fileKey, contentType, 900);

      logger.info('Generated signed upload URL', { userId, fileKey });

      res.json({
        uploadUrl: url,
        fileKey: key,
        expiresIn: 900,
      });
    } catch (error) {
      logger.error('Failed to generate signed upload URL', { error: error.message });
      res.status(500).json({ 
        error: 'Failed to generate upload URL' 
      });
    }
  });

  /**
   * Confirm client-side upload (update database after direct upload)
   * POST /api/confirm-upload/profile-pic
   */
  app.post('/api/confirm-upload/profile-pic', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user._id;
      const { fileKey } = req.body;

      if (!fileKey) {
        return res.status(400).json({ 
          error: 'fileKey is required' 
        });
      }

      // Verify file exists in storage
      const exists = await storage.fileExists(fileKey);
      if (!exists) {
        return res.status(404).json({ 
          error: 'File not found in storage' 
        });
      }

      // Update database
      const UserModel = require('../models/user/user.model.server');
      await UserModel.updateUser(userId, { profilePictureKey: fileKey });

      logger.info('Client-side upload confirmed', { userId, fileKey });

      res.json({
        message: 'Upload confirmed successfully',
        fileKey,
      });
    } catch (error) {
      logger.error('Upload confirmation failed', { error: error.message });
      res.status(500).json({ 
        error: 'Failed to confirm upload' 
      });
    }
  });
};

