// resume.service.server.js — FIXED VERSION
// Fixes:
// 1. Duplicate ResumeParser require + instantiation removed
// 2. GridFsStorage now uses mongoose.connection (same DB as main app) instead of hardcoded URL
// 3. gfs uses lazy-init pattern — uses GridFSBucket (not legacy gridfs-stream)
// 4. Duplicate streamToBuffer function removed
// 5. /api/files now returns uploadDate field so the frontend can display it
// 6. /api/user/reusme/:userId also returns uploadDate
// 7. Fixed missing closing braces on /api/files and /api/file/:filename routes

const ResumeParser = require('./resumeParser');
const resumeParser = new ResumeParser();

module.exports = function (app) {
    const multer = require('multer');
    const { GridFsStorage } = require('multer-gridfs-storage');
    const mongoose = require('mongoose');

    const User = require('../models/user/user.model.server');
    const Experience = require('../models/experience/experience.model.server');
    const Education = require('../models/education/education.model.server');
    const Skill = require('../models/skill/skill.model.server');
    const Certificate = require('../models/certificate/certificate.model.server');

    // ─── GridFS lazy initialisation ──────────────────────────────────────────────
    let gfs;
    let storage;
    let upload;

    function initGridFs() {
        if (gfs) return;
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
                bucketName: 'resumeFiles'
            });
        }
    }

    function initStorage() {
        if (storage && upload) return;
        if (mongoose.connection.readyState === 1) {
            storage = new GridFsStorage({
                db: mongoose.connection,
                file: (req, file) => {
                    return {
                        filename: file.originalname,
                        bucketName: 'resumeFiles',
                        metadata: {
                            userId: new mongoose.Types.ObjectId(req.session.user._id),
                            originalname: file.originalname,
                            contentType: file.mimetype,
                        },
                    };
                }
            });
            upload = multer({ storage: storage }).single('file');
        }
    }

    // Initialise when connection is already open
    mongoose.connection.once('open', () => {
        initGridFs();
        initStorage();
        console.log('[Resume] GridFS storage initialised');
    });

    // Authentication middleware
    const requireLogin = (req, res, next) => {
        if (!req.session || !req.session['user'] || !req.session['user']._id) {
            return res.status(401).json({ responseCode: 1, responseMessage: 'Unauthorized' });
        }
        next();
    };

    // ─── Utility ─────────────────────────────────────────────────────────────────
    function streamToBuffer(stream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    // ─── POST /api/upload ─────────────────────────────────────────────────────────
    app.post('/api/upload', requireLogin, (req, res) => {
        initGridFs();
        initStorage();

        if (!gfs || !upload) {
            return res.status(503).json({ error: 'Storage service not ready. Please try again.' });
        }

        const userId = new mongoose.Types.ObjectId(req.session.user._id);

        // Delete existing resume first, then upload new one
        gfs.find({ 'metadata.userId': userId }).toArray(async (err, files) => {
            if (err) {
                console.error('Error finding existing resume:', err);
                return res.status(500).json({ error: 'Error finding existing resume file' });
            }

            if (files && files.length > 0) {
                try {
                    await gfs.delete(files[0]._id);
                } catch (deleteErr) {
                    console.error('Error deleting existing resume:', deleteErr);
                    return res.status(500).json({ error: 'Error deleting existing resume file' });
                }
            }
            doUpload();
        });

        function doUpload() {
            upload(req, res, (err) => {
                if (err) {
                    console.error('Error during file upload:', err);
                    return res.json({ error_code: 1, err_desc: err });
                }
                res.json({ error_code: 0, error_desc: null, file_uploaded: true });
            });
        }
    });

    // ─── GET /api/files ───────────────────────────────────────────────────────────
    app.get('/api/files', requireLogin, (req, res) => {
        initGridFs();
        if (!gfs) {
            return res.status(503).json({ error: 'Storage service not ready.' });
        }

        gfs.find({
            'metadata.userId': new mongoose.Types.ObjectId(req.session['user']._id)
        }).toArray((err, files) => {
            if (err) {
                return res.status(500).json({ responseCode: 1, responseMessage: 'Internal Server Error' });
            }
            if (!files || files.length === 0) {
                return res.status(200).json([]);
            }
            const filesData = files.map((file) => ({
                originalname: file.metadata?.originalname || file.filename,
                filename: file.filename,
                contentType: file.metadata?.contentType || 'application/octet-stream',
                uploadDate: file.uploadDate
            }));
            res.json(filesData);
        });
    });

    // ─── GET /api/file/:filename ──────────────────────────────────────────────────
    app.get('/api/file/:filename', requireLogin, (req, res) => {
        initGridFs();
        if (!gfs) {
            return res.status(503).json({ error: 'Storage service not ready.' });
        }

        gfs.find({
            filename: req.params.filename,
            'metadata.userId': new mongoose.Types.ObjectId(req.session['user']._id)
        }).toArray((err, files) => {
            if (err) return res.status(500).json({ responseCode: 1, responseMessage: 'Internal Server Error' });
            if (!files || files.length === 0) return res.status(404).json({ responseCode: 1, responseMessage: 'File not found for the user' });
            const file = files[0];
            const readstream = gfs.openDownloadStreamByName(file.filename);
            res.set('Content-Type', file.metadata?.contentType || 'application/octet-stream');
            return readstream.pipe(res);
        });
    });

    // ─── GET /api/file/:filename/:userId (recruiter/admin access) ────────────────
    app.get('/api/file/:filename/:userId', requireLogin, (req, res) => {
        const userRole = req.session['user'].role;
        const hasAccess = userRole === 'Admin' || userRole === 'Recruiter';
        if (!hasAccess) {
            return res.status(403).json({ responseCode: 1, responseMessage: 'Forbidden: Access Denied' });
        }

        initGridFs();
        if (!gfs) {
            return res.status(503).json({ error: 'Storage service not ready.' });
        }

        gfs.find({
            filename: req.params.filename,
            'metadata.userId': new mongoose.Types.ObjectId(req.params.userId)
        }).toArray((err, files) => {
            if (err) return res.status(500).json({ responseCode: 1, responseMessage: 'Internal Server Error' });
            if (!files || files.length === 0) return res.status(404).json({ responseCode: 1, responseMessage: 'File not found for the user' });
            const file = files[0];
            const readstream = gfs.openDownloadStreamByName(file.filename);
            res.set('Content-Type', file.metadata?.contentType || 'application/octet-stream');
            return readstream.pipe(res);
        });
    });

    // ─── GET /api/user/reusme/:userId (typo kept to avoid breaking other code) ───
    app.get('/api/user/reusme/:userId', (req, res) => {
        initGridFs();
        if (!gfs) {
            return res.status(503).json({ error: 'Storage service not ready.' });
        }

        const userId = req.params.userId;
        gfs.find({ 'metadata.userId': new mongoose.Types.ObjectId(userId) }).toArray((err, files) => {
            if (err) return res.status(500).json({ responseCode: 1, responseMessage: 'Internal Server Error' });
            if (!files || files.length === 0) return res.status(200).json([]);
            const filesData = files.map((file) => ({
                originalname: file.metadata?.originalname || file.filename,
                filename: file.filename,
                contentType: file.metadata?.contentType || 'application/octet-stream',
                uploadDate: file.uploadDate
            }));
            res.json(filesData);
        });
    });

    // ─── GET /api/parse-resume ────────────────────────────────────────────────────
    app.get('/api/parse-resume', requireLogin, async (req, res) => {
        initGridFs();
        if (!gfs) {
            return res.status(503).json({ responseCode: 1, responseMessage: 'Storage service not ready.' });
        }

        try {
            // Find most recently uploaded resume for this user
            const files = await gfs.find({
                'metadata.userId': new mongoose.Types.ObjectId(req.session.user._id)
            }).sort({ uploadDate: -1 }).toArray();

            if (!files || files.length === 0) {
                return res.status(404).json({
                    responseCode: 1,
                    responseMessage: 'No resume found for parsing'
                });
            }

            const file = files[0];
            const readstream = gfs.openDownloadStreamByName(file.filename);
            const fileBuffer = await streamToBuffer(readstream);
            const fileExtension = file.filename.split('.').pop().toLowerCase();

            // Extract text and parse with Gemini AI
            const extractedText = await resumeParser.extractText(fileBuffer, fileExtension);
            const parsedData = await resumeParser.parseResumeText(extractedText);

            const userId = req.session.user._id;

            // Update user basic info
            const userUpdateFields = {
                firstName: parsedData.personalInfo?.name?.split(' ')[0] || '',
                lastName: parsedData.personalInfo?.name?.split(' ').slice(1).join(' ') || '',
                phone: parsedData.contact?.phone || '',
                currentLocation: parsedData.personalInfo?.location || '',
            };
            // Only update email if parsed — don't blank out existing one
            if (parsedData.contact?.email) {
                userUpdateFields.email = parsedData.contact.email;
            }
            await User.updateUser(userId, userUpdateFields);

            // Upsert education records
            if (parsedData.education?.length > 0) {
                for (const edu of parsedData.education) {
                    await Education.findOneAndUpdate(
                        { user: userId, institute: edu.institute, degree: edu.degree },
                        { $set: {
                            fieldOfStudy: edu.fieldOfStudy,
                            location: edu.location,
                            startDate: edu.startDate,
                            endDate: edu.endDate,
                            ongoingStatus: edu.ongoingStatus,
                            grade: edu.grade,
                            description: edu.description
                        }},
                        { upsert: true, new: true }
                    );
                }
            }

            // Upsert experience records
            if (parsedData.experience?.length > 0) {
                for (const exp of parsedData.experience) {
                    await Experience.findOneAndUpdate(
                        { user: userId, company: exp.company, title: exp.title },
                        { $set: {
                            location: exp.location,
                            startDate: exp.startDate,
                            endDate: exp.endDate,
                            ongoingStatus: exp.ongoingStatus,
                            description: exp.description,
                            responsibilities: exp.responsibilities,
                            stacks: exp.stacks,
                            project: exp.project
                        }},
                        { upsert: true, new: true }
                    );
                }
            }

            // Upsert skill records
            if (parsedData.skills?.length > 0) {
                for (const skill of parsedData.skills) {
                    await Skill.findOneAndUpdate(
                        { user: userId, skillName: skill.skillName },
                        { $set: {
                            skillLevel: skill.skillLevel,
                            category: skill.category
                        }},
                        { upsert: true, new: true }
                    );
                }
            }

            res.json({
                responseCode: 0,
                responseMessage: 'Resume parsed and updated successfully',
                parsedData: parsedData
            });

        } catch (error) {
            console.error('[Resume] Parse error:', error);
            res.status(500).json({
                responseCode: 1,
                responseMessage: 'Error parsing resume',
                error: error.message
            });
        }
    });
};