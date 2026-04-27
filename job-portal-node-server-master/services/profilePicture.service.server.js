// job-portal-node-server-master\services\profilePicture.service.server.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');

// Suppress deprecation warnings
process.noDeprecation = true;

// Initialize GridFS stream
let gfs;
let storage;
let upload;

function initializeGridFsIfNeeded() {
  if (gfs) return;
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'profile-pictures'
    });
  }
}

function initializeStorageIfNeeded() {
  if (storage && upload) return;
  if (mongoose.connection.readyState === 1) {
    storage = new GridFsStorage({
      db: mongoose.connection,
      file: (req, file) => {
        return {
          filename: 'profile-pic-' + Date.now() + path.extname(file.originalname),
          bucketName: 'profile-pictures',
          metadata: {
            userId: mongoose.Types.ObjectId(req.session.user._id)
          },
        };
      }
    });
    upload = multer({ storage }).single('profilePic');
  }
}

// Initialize when connection opens (in case server establishes it after this module loads)
mongoose.connection.once('open', () => {
  initializeGridFsIfNeeded();
  initializeStorageIfNeeded();
  console.log('GridFS storage initialized successfully');
});

module.exports = function (app) {
  // Route for uploading profile picture
  app.post('/upload-profile-pic', (req, res) => {
    initializeGridFsIfNeeded();
    initializeStorageIfNeeded();
    // Check if storage is initialized
    if (!storage || !upload) {
      return res.status(503).json({ error: 'Storage service not ready. Please try again.' });
    }

    // Check if user is authenticated via session
    if (!req.session.user || !req.session.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = mongoose.Types.ObjectId(req.session.user._id);

    // Check if user already has a profile picture
    gfs.find({ 'metadata.userId': userId })
      .toArray((err, files) => {
        if (err) {
          console.error('Error finding existing profile picture:', err);
          return res.status(500).json({ error: 'Error finding existing profile picture' });
        }

        if (files.length > 0) {
          // User already has a profile picture, delete it
          const fileId = files[0]._id;
          gfs.delete(fileId, (deleteErr) => {
            if (deleteErr) {
              console.error('Error deleting existing profile picture:', deleteErr);
              return res.status(500).json({ error: 'Error deleting existing profile picture' });
            }

            // Proceed to upload the new file
            uploadFile();
          });
        } else {
          // No existing profile picture, proceed to upload the new file
          uploadFile();
        }
      });

    function uploadFile() {
      upload(req, res, (err) => {
        if (err) {
          console.error('Error during file upload:', err);
          return res.status(500).json({ error_code: 1, err_desc: err.message });
        }

        if (!req.file) {
          console.error('No file uploaded');
          return res.status(400).json({ error_code: 1, err_desc: 'No file uploaded' });
        }

        console.log('File uploaded successfully:', req.file.filename);
        res.json({ 
          error_code: 0, 
          error_desc: null, 
          file_uploaded: true, 
          profilePicUrl: req.file.filename 
        });
      });
    }
  });

  // Route for fetching uploaded profile picture
  app.get('/profile-pic/:userId', (req, res) => {
    initializeGridFsIfNeeded();
    // Check if gfs is initialized
    if (!gfs) {
      return res.status(503).json({ error: 'Storage service not ready. Please try again.' });
    }

    const userId = req.params.userId;

    gfs.find({ 'metadata.userId': mongoose.Types.ObjectId(userId) })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray((err, files) => {
        if (err) {
          return res.status(500).json({ error: 'Error retrieving profile picture' });
        }

        if (!files || files.length === 0) {
          return res.status(200).json({ message: 'No profile picture for user' });
        }

        const file = files[0];
        const readStream = gfs.openDownloadStream(file._id);
        readStream.pipe(res);
      });
  });
};
