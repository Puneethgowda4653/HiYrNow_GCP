module.exports = function (app) {
    const PVCRequest = require('../models/PVC/pvc-request.schema.server');
    const User = require('../models/user/user.model.server');
    const JobPosting = require('../models/job-posting/job-posting.model.server');
    const nodemailer = require('nodemailer');
    // const config = require('../config/config');

    // Middleware to check if user is authenticated
    const authMiddleware = (req, res, next) => {
        if (req.session && req.session["user"]) {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. user not found ' });
        }
    };

    // Middleware to check if user is admin
    // const adminMiddleware = require('../middleware/admin');
    // Middleware to check if user is admin
    const adminMiddleware = (req, res, next) => {
        if (req.session && req.session["user"] && req.session["user"].role === "Admin") {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Admin rights required.' });
        }
    };
    // Configure mail transporter

    // Email transporter setup
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    // Utility function to send emails
    const sendEmail = async (to, subject, html) => {
        try {
            await transporter.sendMail({
                from: `"Job Portal" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html
            });
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    };

    // Create a new PVC request
    // Create a new PVC request
    app.post('/api/pvc-requests', authMiddleware, async (req, res) => {
        try {
            const { jobId, pvcCount, pointsDeducted } = req.body;
            const userId = req.session["user"]._id
            // Validate request data
            if (!jobId || !userId || !pvcCount || !pointsDeducted) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Check if job exists
            const job = await JobPosting.findJobPostingById(jobId);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            // Get user information
            const user = await User.findUserById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            let creditInfo = null;

            // Determine the feature type based on pvcCount
            let featureType = "";
            if (pvcCount === 3) {
                featureType = "pvc1";
            } else if (pvcCount === 5) {
                featureType = "pvc2";
            } else if (pvcCount === 10) {
                featureType = "pvc3";
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid pvcCount value",
                });
            }

            // Check if this is a paid feature request
            try {
                // Attempt to deduct credits
                const deductionResult = await fetch(
                    "https://hiyrnow-v1-721026586154.europe-west1.run.app/api/credits/deduct",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Cookie: req.headers.cookie,
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            feature: featureType, // Use the determined feature type
                        }),
                    }
                );

                creditInfo = await deductionResult.json();

                if (!deductionResult.ok) {
                    return res.status(400).json({
                        success: false,
                        message: "Insufficient credits to request pre-verified candidates",
                        details: creditInfo.error,
                    });
                }
            } catch (error) {
                console.error("Credit deduction error:", error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to process credit deduction",
                    error: error.message || "Internal server error",
                });
            }


            // Create the PVC request
            const pvcRequest = new PVCRequest({
                job: jobId,
                user: userId,
                pvcCount,
                pointsDeducted,
                status: 'Pending'
            });

            // Deduct points from user
            user.points -= pointsDeducted;

            // Save both the request and updated user points
            await Promise.all([
                pvcRequest.save(),
                user.save()
            ]);

            // Send notification email to admin
            const adminEmailSent = await sendEmail(
                process.env.ADMIN_EMAIL,
                'New PVC Request Received',
                `
            <h2>New Pre-Verified Candidates Request</h2>
            <p><strong>Job Title:</strong> ${job.title}</p>
            <p><strong>Company:</strong> ${job.company}</p>
            <p><strong>Requested By:</strong> ${user.firstName} ${user.lastName} (${user.email})</p>
            <p><strong>Number of Candidates:</strong> ${pvcCount}</p>
            <p><strong>Points Deducted:</strong> ${pointsDeducted}</p>
            <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Request ID:</strong> ${pvcRequest._id}</p>
            <p>Please review this request in the admin dashboard.</p>
            <a href="${process.env.BASE_URL}/admin/pvc-requests/${pvcRequest._id}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Request</a>
            `
            );

            // Send confirmation email to user
            const userEmailSent = await sendEmail(
                user.email,
                'Your PVC Request Confirmation',
                `
            <h2>Pre-Verified Candidates Request Confirmed</h2>
            <p>Hello ${user.firstName},</p>
            <p>We have received your request for ${pvcCount} pre-verified candidates for the following job:</p>
            <p><strong>Job Title:</strong> ${job.title}</p>
            <p><strong>Company:</strong> ${job.company}</p>
            <p><strong>Points Deducted:</strong> ${pointsDeducted}</p>
            <p><strong>Remaining Points Balance:</strong> ${user.points}</p>
            <p>Our team will start working on your request immediately. You will receive a notification when we have selected suitable candidates for your job posting.</p>
            <p>Request ID: ${pvcRequest._id}</p>
            <p>You can track the status of your request in your dashboard.</p>
            <a href="${process.env.BASE_URL}/dashboard/pvc-requests" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Request Status</a>
            <p style="margin-top: 20px;">Thank you for using our Pre-Verified Candidates service!</p>
            `
            );

            // Return success response
            return res.status(201).json({
                success: true,
                message: 'PVC request created successfully',
                data: {
                    requestId: pvcRequest._id,
                    status: pvcRequest.status,
                    adminEmailSent,
                    userEmailSent,
                    remainingPoints: user.points,
                    creditInfo
                }
            });

        } catch (error) {
            console.error('Error creating PVC request:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    // Get all PVC requests for a user
    app.get('/api/users/:userId/pvc-requests', authMiddleware, async (req, res) => {
        try {
            const userId = req.params.userId;

            const requests = await PVCRequest.find({ user: userId })
                .populate('job', 'title company status')
                .sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                count: requests.length,
                data: requests
            });
        } catch (error) {
            console.error('Error fetching user PVC requests:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    // Get all PVC requests (admin only)
    app.get('/api/admin/pvc-requests', [authMiddleware, adminMiddleware], async (req, res) => {
        try {
            const requests = await PVCRequest.find()
                .populate('job', 'title company status')
                .populate('user', 'firstName lastName email')
                .sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                count: requests.length,
                data: requests
            });
        } catch (error) {
            console.error('Error fetching all PVC requests:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    // Update PVC request status (admin only)
    app.put('/api/admin/pvc-requests/:requestId', [authMiddleware, adminMiddleware], async (req, res) => {
        try {
            const { requestId } = req.params;
            const { status, notes } = req.body;

            // Validate status
            const validStatuses = ['Pending', 'Approved', 'Rejected', 'Fulfilled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status value'
                });
            }

            // Find and update the request
            const pvcRequest = await PVCRequest.findById(requestId)
                .populate('job', 'title company')
                .populate('user', 'firstName lastName email points');

            if (!pvcRequest) {
                return res.status(404).json({
                    success: false,
                    message: 'PVC request not found'
                });
            }

            // Handle status-specific logic
            if (status === 'Rejected' && pvcRequest.status !== 'Rejected') {
                // Refund points to user if request is being rejected
                const user = await User.findById(pvcRequest.user._id);
                user.points += pvcRequest.pointsDeducted;
                await user.save();

                // Send notification email about the rejection and refund
                await sendEmail(
                    pvcRequest.user.email,
                    'Your PVC Request Status Update',
                    `
                    <h2>Pre-Verified Candidates Request Update</h2>
                    <p>Hello ${pvcRequest.user.firstName},</p>
                    <p>We regret to inform you that your request for ${pvcRequest.pvcCount} pre-verified candidates for the job "${pvcRequest.job.title}" has been rejected.</p>
                    <p><strong>Reason:</strong> ${notes || 'Unable to fulfill this request at this time.'}</p>
                    <p><strong>Points Refunded:</strong> ${pvcRequest.pointsDeducted}</p>
                    <p><strong>Updated Points Balance:</strong> ${user.points}</p>
                    <p>If you have any questions, please contact our support team.</p>
                    `
                );
            } else if (status === 'Fulfilled' && pvcRequest.status !== 'Fulfilled') {
                // Set fulfillment date when status changes to Fulfilled
                pvcRequest.fulfillmentDate = new Date();

                // Send notification email about the fulfillment
                await sendEmail(
                    pvcRequest.user.email,
                    'Your PVC Request Has Been Fulfilled',
                    `
                    <h2>Pre-Verified Candidates Are Ready!</h2>
                    <p>Hello ${pvcRequest.user.firstName},</p>
                    <p>Great news! We have fulfilled your request for ${pvcRequest.pvcCount} pre-verified candidates for the job "${pvcRequest.job.title}".</p>
                    <p>You can now view the candidates in your dashboard and contact them directly.</p>
                    <a href="${process.env.baseUrl}/dashboard/jobs/${pvcRequest.job._id}/candidates" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Candidates</a>
                    <p style="margin-top: 20px;">Thank you for using our Pre-Verified Candidates service!</p>
                    `
                );
            } else if (status === 'Approved' && pvcRequest.status === 'Pending') {
                // Send notification email about the approval
                await sendEmail(
                    pvcRequest.user.email,
                    'Your PVC Request Has Been Approved',
                    `
                    <h2>Pre-Verified Candidates Request Approved</h2>
                    <p>Hello ${pvcRequest.user.firstName},</p>
                    <p>We're pleased to inform you that your request for ${pvcRequest.pvcCount} pre-verified candidates for the job "${pvcRequest.job.title}" has been approved.</p>
                    <p>Our team is now working on finding the best matches for your position. You will receive another notification when the candidates are ready.</p>
                    <p>Thank you for your patience!</p>
                    `
                );
            }

            // Update the request
            pvcRequest.status = status;
            if (notes) pvcRequest.notes = notes;
            await pvcRequest.save();

            return res.status(200).json({
                success: true,
                message: 'PVC request status updated successfully',
                data: pvcRequest
            });

        } catch (error) {
            console.error('Error updating PVC request status:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });
};