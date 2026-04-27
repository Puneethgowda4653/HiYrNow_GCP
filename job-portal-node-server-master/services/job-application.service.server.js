module.exports = function (app) {
    const jobApplicationSchema = require('../models/job-application/job-application.schema.server');
    const jobApplicationModel = require('./../models/job-application/job-application.model.server');
    const jobPostingModel = require('./../models/job-posting/job-posting.model.server'); // Correct import
  const userModel= require('./../models/user/user.model.server')
  const nodemailer = require('nodemailer');
  const { google } = require('googleapis');
    const { OAuth2 } = google.auth;

 
    app.post('/api/job-applications/:id/schedule-interview', scheduleInterview);
    app.get('/api/jobApplication', findAllJobApplicationByUserId);
    app.post('/api/jobApplication', createJobApplication);
    app.delete('/api/jobApplication/:jobApplicationId', deleteJobApplication);
    app.delete('/api/jobApplication/:jobApplicationId/:source', deleteJobApplicationForJobPosting);
    app.put('/api/jobApplication/:jobApplicationId', updateJobApplication);
    app.get('/api/jobApplication/:jobId/:jobSource/appliedUsers', getAppliedUsersForJob); // New route
    app.put('/api/jobApplication/:jobApplicationId/moveToPVC', moveToPVC);
    app.get('/api/pvcList/:jobId', getPVCListUsers); // Updated route
    app.get('/api/jobApplication/:jobId/user/:userId', getJobApplicationByJobIdAndUserId);
    app.get('/api/job-applications/:id/comments', getCommentsForJobApplication);
// Add this new route in the module.exports function
app.post('/api/job-applications/:id/send-assignment', sendAssignment);
    // New route for posting a comment to a job application
    app.post('/api/job-applications/:id/comments', postCommentToJobApplication);
    // New route for fetching all jobs a user has applied to
    app.get('/api/user/:userId/appliedJobs', getAllJobsAppliedByUser);
    app.post('/api/job-description/send', sendJobDescriptionToUser);
    app.get('/api/user/:userId/scheduled-interviews', getAllScheduledInterviewsForUserJobs);
    app.get('/api/job-applications/:id', getApplicationDetailsById); // New route to get application details

    
    // function createJobApplication(req, res) {
    //     if (req.session && req.session['user']) {
    //         const jobApplication = req.body;
    //         const userId = req.session['user']._id;
    //         jobApplication['user'] = userId;
    //         jobApplicationModel.createJobApplication(jobApplication)
    //             .then(function (status) {
    //                 res.send(status);
    //             });
    //     } else {
    //         res.send({ status: 'session expired' });
    //     }
    // }
    async function getJobApplicationByJobIdAndUserId(req, res) {
        try {
            const jobId = req.params['jobId'];
            const userId = req.params['userId'];
            const user = req.session?.user;
    
            // Ensure the user is authenticated and session exists
            if (!user) {
                return res.status(401).json({ error: 'Session expired or unauthorized access' });
            }
    
            // Fetch the job posting to verify recruiter ownership
            const jobPosting = await jobPostingModel.findJobPostingById(jobId);
            if (!jobPosting) {
                return res.status(404).json({ error: 'Job not found' });
            }
    
            // Check if the user is the job owner (recruiter) or an Admin
            // AFTER — also allow 'Recruiter' role to view:
            const isOwner = jobPosting.user.toString() === userId.toString();
            const isAdmin = req.session.user.role === 'Admin';
            const isRecruiter = req.session.user.role === 'Recruiter';

            if (!isOwner && !isAdmin && !(isRecruiter)) {
                return res.status(403).json({ error: "Unauthorized access" });
            }
    
            // Fetch the job application based on jobId and userId
            const jobApplication = await jobApplicationModel.findJobApplicationByJobIdAndUserId(jobId, userId);
            if (!jobApplication) {
                return res.status(404).json({ error: 'Job application not found' });
            }
    
            // Return the job application details
            return res.json(jobApplication);
        } catch (error) {
            console.error('Error fetching job application:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    
    
    // ADD THIS — missing route for recruiter dashboard status update
app.put('/api/jobApplication/:jobApplicationId/status', async (req, res) => {
    const { jobApplicationId } = req.params;
    const { status } = req.body;
    try {
        const statusMap = {
            'shortlisted': 'Shortlisted',
            'viewed':      'Viewed',
            'interview':   'Interview',
            'interviewing':'Interview',
            'rejected':    'Rejected',
            'accepted':    'Offer',
            'applied':     'Applied'
        };
        const normalizedStatus = statusMap[status?.toLowerCase()] || status;
        const updated = await jobApplicationModel.findJobApplicationById(jobApplicationId);
        if (!updated) return res.status(404).json({ error: 'Job application not found' });
        updated.status = normalizedStatus;
        await updated.save();
        res.json({ message: 'Status updated successfully', jobApplication: updated });
    } catch (error) {
        console.error('Error updating job application status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

    app.put('/api/job-applications/:id/status', async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
      
        try {
          const jobApplication = await jobApplicationModel.findJobApplicationById(id);
          if (!jobApplication) {
            return res.status(404).json({ error: 'Job application not found' });
          }
      
          jobApplication.status = status;
          await jobApplication.save();
      
          res.json({ message: 'Status updated successfully', jobApplication });
        } catch (error) {
          console.error('Error updating job application status:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      
    
      app.put('/api/job-applications/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const statusMap = {
            'shortlisted': 'Shortlisted',
            'viewed':      'Viewed',
            'interview':   'Interview',
            'interviewing':'Interview',
            'rejected':    'Rejected',
            'accepted':    'Offer',
            'applied':     'Applied'
        };
        const normalizedStatus = statusMap[status?.toLowerCase()] || status;
        const jobApplication = await jobApplicationModel.findJobApplicationById(id); // ← fixed
        if (!jobApplication) {
            return res.status(404).json({ error: 'Job application not found' });
        }
        jobApplication.status = normalizedStatus; // ← normalized case
        await jobApplication.save();
        res.json({ message: 'Status updated successfully', jobApplication });
    } catch (error) {
        console.error('Error updating job application status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

      function getCommentsForJobApplication(req, res) {
        const jobApplicationId = req.params.id;
        
        // if (!req.session || !req.session['user']) {
        //     return res.status(401).json({ error: 'Unauthorized' });
        // }
        jobApplicationModel.findJobApplicationByJobId(jobApplicationId)
            .then(jobApplication => {
                if (!jobApplication) {
                    return res.status(404).json({ error: 'Job application not found' });
                }
                
                // Check if the user is authorized to view the comments
                // if (jobApplication.user.toString() !== req.session['user']._id.toString()) {
                //     return res.status(403).json({ error: 'Forbidden' });
                // }

                res.json(jobApplication.comments);
            })
            .catch(error => {
                console.error('Error fetching comments:', error);
                res.status(500).json({ error: 'Internal server error' });
            });
    }

    function postCommentToJobApplication(req, res) {
        const jobApplicationId = req.params.id;
        const { text } = req.body;
        
        // if (!req.session || !req.session['user']) {
        //     return res.status(401).json({ error: 'Unauthorized' });
        // }

        if (!text) {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        const newComment = {
            text,
            // author: req.session['user']._id,
            createdAt: new Date()
        };

        jobApplicationModel.findJobApplicationByJobId(jobApplicationId)
            .then(jobApplication => {
                if (!jobApplication) {
                    return res.status(404).json({ error: 'Job application not found' });
                }

                // Check if the user is authorized to post a comment
                // if (jobApplication.user.toString() !== req.session['user']._id.toString()) {
                //     return res.status(403).json({ error: 'Forbidden' });
                // }

                jobApplication.comments.push(newComment);
                return jobApplication.save();
            })
            .then(updatedJobApplication => {
                res.status(201).json(updatedJobApplication.comments[updatedJobApplication.comments.length - 1]);
            })
            .catch(error => {
                console.error('Error posting comment:', error);
                res.status(500).json({ error: 'Internal server error' });
            });
    }


    async function scheduleInterview(req, res) {
        const jobApplicationId = req.params.id;
        const { 
            startDateTime, 
            duration, 
            jobTitle, 
            applicantName, 
            applicantEmail, 
            interviewerEmail,
            notes 
        } = req.body;
    
        try {
            // Fetch the job application
            const jobApplication = await jobApplicationModel.findJobApplicationByJobId(jobApplicationId);
            if (!jobApplication) {
                return res.status(404).json({ error: 'Job application not found' });
            }
    
            // Create Google Meet link
            const meetLink = await createGoogleMeetLink(startDateTime, duration, jobTitle);
    
            // Create new interview object
            const newInterview = {
                startDateTime: new Date(startDateTime),
                duration,
                meetLink,
                jobTitle,
                applicantName,
                applicantEmail,
                interviewerEmail,
                notes,
                status: 'scheduled',
                createdAt: new Date()
            };
    
            // Add interview to the job application's interviews array
            if (!jobApplication.interviews) {
                jobApplication.interviews = [];
            }
            jobApplication.interviews.push(newInterview);
    
            // Update job application status
            jobApplication.status = 'interviewing';
            
            // Save the updated job application
            await jobApplication.save();
    
            // Send email to applicant and interviewer
            await sendInterviewInvitation(
                applicantEmail, 
                interviewerEmail, 
                applicantName, 
                jobTitle, 
                startDateTime, 
                duration, 
                meetLink
            );
    
            // Return success response with interview details
            res.json({ 
                message: 'Interview scheduled successfully',
                interview: newInterview
            });
    
        } catch (error) {
            console.error('Error scheduling interview:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    }
    
    const mongoose = require('mongoose');
    function getAllScheduledInterviewsForUserJobs(req, res) {
        // Extract userId from URL path parameter instead of session
        const userId = req.params.userId;
    
        // Validate userId
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                error: 'Invalid User ID',
                interviews: [],
                totalInterviewCount: 0
            });
        }
    
        async function fetchScheduledInterviews() {
            try {
                // Validate user existence first
                // const user = await userModel.findById(userId);
                // if (!user) {
                //     throw new Error('User not found');
                // }
    
                // Find all job postings by the user
                const userJobPostings = await jobPostingModel.findJobPostingByUserId(userId);
                
                // If no job postings, return empty result
                if (!userJobPostings || userJobPostings.length === 0) {
                    return {
                        interviews: [],
                        totalInterviewCount: 0
                    };
                }
    
                // Extract job IDs
                const jobIds = userJobPostings.map(job => job._id);
    
                // Find job applications for these job postings that have interviews
                const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

                const jobApplicationsWithInterviews = await JobApplication.aggregate([
                    { 
                        $match: { 
                            jobPosting: { $in: jobIds },
                            'interviews': { $exists: true, $not: { $size: 0 } } 
                        } 
                    },
                    {
                        $project: {
                            jobPosting: 1,
                            applicantName: 1,
                            applicantEmail: 1,
                            interviews: 1
                        }
                    }
                ]);
    
                // Transform the results
                const scheduledInterviews = jobApplicationsWithInterviews.flatMap(application => 
                    application.interviews.map(interview => ({
                        ...interview,
                        applicantName: application.applicantName,
                        applicantEmail: application.applicantEmail,
                        jobPostingId: application.jobPosting
                    }))
                );
    
                // Fetch job posting details for each interview
                const detailedInterviews = await Promise.all(
                    scheduledInterviews.map(async (interview) => {
                        const jobPosting = await jobPostingModel.findJobPostingById(interview.jobPostingId);
                        return {
                            ...interview,
                            jobTitle: jobPosting ? jobPosting.title : 'Unknown Job',
                            companyName: jobPosting ? jobPosting.company : 'Unknown Company'
                        };
                    })
                );
    
                // Sort interviews by start date (upcoming first)
                const sortedInterviews = detailedInterviews.sort((a, b) => 
                    new Date(a.startDateTime || a.dateTime) - new Date(b.startDateTime || b.dateTime)
                );
    
                return {
                    interviews: sortedInterviews,
                    totalInterviewCount: sortedInterviews.length
                };
            } catch (error) {
                console.error('Error in fetchScheduledInterviews:', error);
                throw new Error('Failed to fetch scheduled interviews: ' + error.message);
            }
        }
    
        fetchScheduledInterviews()
            .then(result => {
                res.json(result);
            })
            .catch(error => {
                console.error('Scheduled Interviews Error:', error);
                res.status(500).json({ 
                    error: 'Internal server error', 
                    message: error.message,
                    interviews: [],
                    totalInterviewCount: 0
                });
            });
    }

    app.get('/api/job-applications/:id/interviews', async (req, res) => {
        try {
            const jobId = req.params.id;
            
            // Validate if the provided ID is a valid MongoDB ObjectId
            // if (!mongoose.Types.ObjectId.isValid(jobId)) {
            //     return res.status(400).json({ 
            //         error: 'Invalid job application ID format'
            //     });
            // }
            // Find job application and explicitly select the interviews field
            const jobApplication = await jobApplicationModel
                .findJobApplicationInterviewByJobId(jobId)
              
            if (!jobApplication) {
                return res.status(404).json({ 
                    error: 'Job application not found',
                    queriedId: jobId 
                });
            }
            // Return interviews array or empty array if interviews field doesn't exist
            res.json({
                success: true,
                interviews: jobApplication.interviews || [],
                jobApplicationId: jobId
            });
    
        } catch (error) {
            console.error('Error fetching interviews:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                message: error.message 
            });
        }
    });
    
    // Add new route for updating interview status
    app.put('/api/job-applications/:id/interviews/:interviewId', async (req, res) => {
        try {
            const { id, interviewId } = req.params;
            const { status, notes } = req.body;
    
            const jobApplication = await jobApplicationModel.findJobApplicationInterviewByJobId(id);
            if (!jobApplication) {
                return res.status(404).json({ error: 'Job application not found' });
            }
    
            const interview = jobApplication.interviews.id(interviewId);
            if (!interview) {
                return res.status(404).json({ error: 'Interview not found' });
            }
    
            // Update interview details
            interview.status = status;
            if (notes) interview.notes = notes;
            interview.updatedAt = new Date();
    
            await jobApplication.save();
    
            res.json({ 
                message: 'Interview updated successfully',
                interview 
            });
        } catch (error) {
            console.error('Error updating interview:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    async function createGoogleMeetLink(startDateTime, duration, jobTitle) {
        const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
        const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
        const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
    
        const oauth2Client = new OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET
        );
    
        oauth2Client.setCredentials({
            refresh_token: GOOGLE_REFRESH_TOKEN,
        });
    
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
        // Create calendar event
        const event = {
            summary: `Interview for ${jobTitle}`,
            description: 'Job interview scheduled through HYRNOW',
            start: {
                dateTime: startDateTime,
                timeZone: 'UTC',
            },
            end: {
                dateTime: new Date(new Date(startDateTime).getTime() + duration * 60000).toISOString(),
                timeZone: 'UTC',
            },
            conferenceData: {
                createRequest: {
                    requestId: `interview-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' },
                },
            },
        };
        const { data } = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
        });
        return data.hangoutLink;
    }
    async function sendInterviewInvitation(applicantEmail, interviewerEmail, applicantName, jobTitle, startDateTime, duration, meetLink) {
        // REPLACE EVERY ONE OF THESE (regardless of what password/user is currently there):
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
        const candidateMailOptions = {
            from: 'interview@hiyrnow.in',
            to: applicantEmail,
            subject: `Interview Invitation for ${jobTitle}`,
            html: `
                <h1>Interview Invitation</h1>
                <p>Dear ${applicantName},</p>
                <p>You have been invited to an interview for the position of ${jobTitle}.</p>
                <p>Date and Time: ${new Date(startDateTime).toLocaleString()}</p>
                <p>Duration: ${duration} minutes</p>
                <p>Please join the interview using this link: <a href="${meetLink}">${meetLink}</a></p>
                <p>Best regards,<br>HYRNOW Team</p>
            `,
        };
        const interviewerMailOptions = {
            from: 'interview@hiyrnow.in',
            to: interviewerEmail,
            subject: `Scheduled Interview for ${jobTitle || 'a position'}`,
            html: `
                <h1>Scheduled Interview Details</h1>
                <p>Dear Interviewer,</p>
                <p>An interview has been scheduled for the position of <strong>${jobTitle || 'the specified job'}</strong>.</p>
                <p><strong>Candidate:</strong> ${applicantName || 'Not Specified'}</p>
                <p><strong>Date and Time:</strong> ${startDateTime ? new Date(startDateTime).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }) : 'To be scheduled'}</p>
                <p><strong>Duration:</strong> ${duration || 'N/A'} minutes</p>
                ${meetLink 
                    ? `<p>You can join the interview using this link: <a href="${meetLink}" target="_blank">${meetLink}</a></p>` 
                    : `<p>The meeting link will be shared separately.</p>`}
                <p>Best regards,<br>HYRNOW Team</p>
            `,
        };
        
        await transporter.sendMail(interviewerMailOptions);
        await transporter.sendMail(candidateMailOptions);
    }

    function createJobApplication(req, res) {
        if (req.session && req.session['user']) {
            const jobApplication = req.body;
            const userId = req.session['user']._id;
            jobApplication['user'] = userId;
            
            jobApplicationModel.createJobApplication(jobApplication)
                .then(async function (status) {
                    if (status) {
                        try {
                        // Fetch job posting details to get recruiter ID
                        const jobPosting = await jobPostingModel.findJobPostingById(jobApplication.jobPosting);
                        
                        if (jobPosting && jobPosting.user) {
                            const recruiterId = jobPosting.user;
                            const recruiter = await userModel.findUserById(recruiterId).exec();
                            
                            if (recruiter && recruiter.email) {
                                const recruiterEmail = recruiter.email;
                                const transporter = nodemailer.createTransport({
                                    service: 'gmail',
                                    auth: {
                                        user: process.env.EMAIL_USER,
                                        pass: process.env.EMAIL_PASS
                                    }
                                });

                                let mailOptions = {
                                    from: 'HYRNOW-Jobposting Updates',
                                    to: recruiterEmail,
                                    subject: 'New Job Application Received',
                                    text: `A new job application has been submitted by ${req.session['user'].firstName} ${req.session['user'].lastName}.`,
                                    html: `<p>A new job application has been submitted by ${req.session['user'].firstName} ${req.session['user'].lastName}.</p>
                                        <p>Job Title: ${jobPosting.title}</p>
                                        <p>Applicant Name: ${req.session['user'].firstName} ${req.session['user'].lastName}</p>`,
                                };

                                transporter.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        console.log('Error sending email:', error);
                                    } else {
                                        console.log('Email sent:', info.response);
                                    }
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching recruiter details:', error);
                        // Don't return 500 - application was already saved successfully
                    }
                    }
    
                    res.send(status);
                })
                .catch(function (error) {
                    console.error('Error creating job application:', error);
                    res.status(500).json({ error: 'Internal Server Error' });
                });
        } else {
            res.send({ status: 'session expired' });
        }
    }


    function findAllJobApplicationByUserId(req, res) {
        if (req.session && req.session['user']) {
            const userId = req.session['user']._id;
            jobApplicationModel.findAllJobApplicationByUserId(userId)
                .then(function (jobApplications) {
                    res.json(jobApplications);
                });
        } else {
            res.send({ status: 'session expired' });
        }
    }

    function updateJobApplication(req, res) {
        const jobApplication = req.body;
        const id = req.params['jobApplicationId'];
        if (req.session && req.session['user']) {
            jobApplicationModel.updateJobApplication(id, jobApplication)
                .then(function (status) {
                    res.send(status);
                });
        } else {
            res.send({ status: 'session expired' });
        }
    }

    function deleteJobApplication(req, res) {
        if (req.session && req.session['user']) {
            const id = req.params['jobApplicationId'];
            jobApplicationModel.deleteJobApplication(id).then(function (status) {
                res.send(status);
            });
        } else {
            res.send('no-session-exists');
        }
    }

    function deleteJobApplicationForJobPosting(req, res) {
        const jobPosting = req.body;
        if (req.session && req.session['user']) {
            const id = req.params['jobApplicationId'];
            const source = req.params['source'];
            jobApplicationModel.deleteJobApplicationForJobPosting(id, source).then(function (status) {
                res.send(status);
            });
        } else {
            res.send('no-session-exists');
        }
    }

    // function getAppliedUsersForJob(req, res) {
    //     const jobId = req.params['jobId'];
    //     const jobSource = req.params['jobSource'];

    //     jobApplicationModel.findAppliedUsersForJob(jobId, jobSource)
    //         .then(function (appliedUsers) {
    //             res.json({ appliedUsers: appliedUsers });
    //         })
    //         .catch(function (error) {
    //             console.error("Error fetching applied users:", error);
    //             res.status(500).json({ error: "Internal Server Error" });
    //         });
    // }
    const util = require('util');

    function safeStringify(obj) {
        const cache = new Set();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (cache.has(value)) {
                    return "[Circular]";
                }
                cache.add(value);
            }
            return value;
        });
    }

    var Skill = mongoose.models['Skill'] || mongoose.model('Skill', require('../models/skill/skill.schema.server'));

        async function getAppliedUsersForJob(req, res) {
            try {
                const jobId = req.params['jobId'];
                const jobSource = req.params['jobSource'];
                const userId = req.session?.user?._id; // Safe access
        
                if (!userId) {
                    return res.status(401).json({ error: "User not authenticated" });
                }
        
                const jobPosting = await jobPostingModel.findJobPostingById(jobId);
                if (!jobPosting) {
                    return res.status(404).json({ error: "Job not found" });
                }
        
                const isOwner = jobPosting.user.toString() === userId.toString();
                const isAdmin = req.session.user.role === 'Admin';
        
                if (!isOwner && !isAdmin) {
                    return res.status(403).json({ error: "Unauthorized access" });
                }
                const appliedUsers = await jobApplicationModel.findAppliedUsersForJob(jobId, jobSource);
                // Fetch skills for each applied user
                const appliedUsersWithSkills = await Promise.all(
                    appliedUsers.map(async (appliedUser) => {
                        const user = appliedUser.application?.user; // Safe access
                        if (!user || !user._id) {
                            console.warn("Skipping user due to missing _id:", user);
                            return { ...appliedUser, skills: [] };
                        }
        
                        try {
                            const skills = await Skill.find({ user: user._id });
                           

                            return { ...appliedUser, skills: skills };
                        } catch (skillError) {
                            console.error("Error fetching skills for user:", user._id, skillError);
                            return { ...appliedUser, skills: [] }; // Return empty skills array on failure
                        }
                    })
                );
        
                res.json({ appliedUsers: appliedUsersWithSkills });
            } catch (error) {
                console.error("Error fetching applied users:", error);
                if (!res.headersSent) {
                    res.status(500).json({ error: "Internal Server Error", details: error.message });
                }
            }
        }
        
        
    
    
    
    function moveToPVC(req, res) {
       
        const id = req.params['jobApplicationId'];
        const userId = req.body.userId; // Fetch userId from the request body
        jobApplicationModel.moveToPVC(id, userId).then(function (status) {
            res.send(status);
        }).catch(function (error) {
            console.error("Error moving to PVC:", error);
            res.status(500).json({ error: "Internal Server Error" });
        });
    }

    function getPVCListUsers(req, res) {
        const jobId = req.params.jobId; // Assume jobId is passed as a route parameter
    
        jobApplicationModel.findAllPVCListUsers(jobId).then(function (users) {
            res.json(users);
        }).catch(function (error) {
            console.error("Error fetching PVC list users:", error);
            res.status(500).json({ error: "Internal Server Error" });
        });
    }

    function getAllJobsAppliedByUser(req, res) {
        const userId = req.params.userId;
        if (req.session && req.session['user'] && req.session['user']._id.toString() === userId.toString()) {
            jobApplicationModel.findAllJobsAppliedByUser(userId)
                .then(async function (jobs) {
                    const jobsWithDetails = await Promise.all(jobs.map(async (job) => {
                        const jobPostingDetails = await jobPostingModel.findJobPostingById(job.jobId); // Use correct model
                        return {
                            ...job._doc, // Assuming jobs is a list of MongoDB documents
                            jobPostingDetails
                        };
                    }));
                    res.json(jobsWithDetails);
                })
                .catch(function (error) {
                    console.error("Error fetching jobs applied by user:", error);
                    res.status(500).json({ error: "Internal Server Error" });
                });
        } else {
            res.send({ status: 'session expired' });
        }
    
}



async function sendAssignment(req, res) {
    const jobApplicationId = req.params.id;
    const {
        applicantEmail,
        deadline,
        deadlineDays,
        description,
        pdfLink,
        sentDate,
        title,
        userId
    } = req.body;

    try {
        // Find the job application
        const jobApplication = await jobApplicationModel.findJobApplicationByJobId(jobApplicationId);
        if (!jobApplication) {
            return res.status(404).json({ error: 'Job application not found' });
        }

        // Create assignment details object
        const assignmentDetails = {
            title,
            description,
            pdfLink,
            sentDate,
            deadline,
            deadlineDays,
            status: 'sent' // You can add more status types as needed
        };

        // Update job application with assignment details
        jobApplication.assignment = assignmentDetails;
        jobApplication.status = 'assignment_sent'; // Update status to reflect assignment sent
        await jobApplication.save();

        // Set up email transporter
        // REPLACE EVERY ONE OF THESE (regardless of what password/user is currently there):
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

        // Calculate deadline in human-readable format
        const deadlineDate = new Date(deadline);
        const formattedDeadline = deadlineDate.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        // Prepare email content
        const mailOptions = {
            from: 'no-reply@hiyrnow.in',
            to: applicantEmail,
            subject: `Assignment: ${title}`,
            html: `
                <h1>Assignment Details</h1>
                <p>Dear Candidate,</p>
                <p>As part of your application process, we would like you to complete the following assignment:</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
                    <h2>${title}</h2>
                    <p><strong>Description:</strong><br>${description}</p>
                    <p><strong>Deadline:</strong> ${formattedDeadline}</p>
                    <p><strong>Time Allowed:</strong> ${deadlineDays} days</p>
                    ${pdfLink ? `<p><strong>Assignment Document:</strong> <a href="${pdfLink}" target="_blank">Click here to view</a></p>` : ''}
                </div>

                <p><strong>Important Notes:</strong></p>
                <ul>
                    <li>Please ensure to submit your assignment before the deadline</li>
                    <li>Make sure to follow all instructions provided in the assignment document</li>
                    <li>If you have any questions, please reply to this email</li>
                </ul>

                <p>Best regards,<br>HIYRNOW Team</p>
            `,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({ 
            message: 'Assignment sent successfully',
            assignmentDetails: assignmentDetails
        });

    } catch (error) {
        console.error('Error sending assignment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function sendJobDescriptionToUser(req, res) {
    const { email, jobLink } = req.body;

    try {
        // Set up email transporter (using the same configuration as interview invitation)
        // REPLACE EVERY ONE OF THESE (regardless of what password/user is currently there):
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
        // Fetch job posting details
        const jobId = jobLink.split('/').pop(); // Extract job ID from the link
        const jobPosting = await jobPostingModel.findJobPostingById(jobId);

        if (!jobPosting) {
            return res.status(404).json({ error: 'Job posting not found' });
        }

        // Prepare email content
        const mailOptions = {
            from: 'info@hiyrnow.in',
            to: email,
            subject: `Job Description: ${jobPosting.title}`,
            html: `
                <h1>Job Description</h1>
                <p>Dear Candidate,</p>
                <p>We wanted to share the job description for the position you're interested in:</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
                    <h2>${jobPosting.title}</h2>
                    <p><strong>Company:</strong> ${jobPosting.company || 'Not specified'}</p>
                    <p><strong>Location:</strong> ${jobPosting.location || 'Not specified'}</p>
                    <p><strong>Description:</strong><br>${jobPosting.description || 'No description available'}</p>
                    ${jobPosting.requirements ? `<p><strong>Requirements:</strong><br>${jobPosting.requirements}</p>` : ''}
                </div>

                <p>You can view the full job details here: <a href="${jobLink}" target="_blank">View Job Posting</a></p>

                <p>Best regards,<br>HIYRNOW Team</p>
            `,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({ 
            message: 'Job description sent successfully',
            jobLink: jobLink
        });

    } catch (error) {
        console.error('Error sending job description:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getApplicationDetailsById(req, res) {
    const applicationId = req.params.id;

    try {
        const jobApplication = await jobApplicationModel.findJobApplicationById(applicationId); // Assuming this method exists
        if (!jobApplication) {
            return res.status(404).json({ error: 'Job application not found' });
        }
        res.json(jobApplication);
    } catch (error) {
        console.error('Error fetching job application details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

};
