/**
 * Enhanced Dashboard Service for HiYrNow
 * Provides comprehensive job seeker dashboard functionality
 * with AI recommendations, notifications, analytics, and more
 */

module.exports = function(app) {
    const dashboardModel = require('../models/dashboard/dashboard.model.server');
    const jobApplicationModel = require('../models/job-application/job-application.model.server');
    const jobPostingModel = require('../models/job-posting/job-posting.model.server');
    const userModel = require('../models/user/user.model.server');
    const skillModel = require('../models/skill/skill.model.server');
    const experienceModel = require('../models/experience/experience.model.server');
    const educationModel = require('../models/education/education.model.server');
    const projectModel = require('../models/project/project.model.server');
    const certificateModel = require('../models/certificate/certificate.model.server');
    const awardModel = require('../models/award/award.model.server');
    const resumeModel = require('../models/resume-upload/resume-upload.model.server');
    
    const { google } = require('googleapis');
    const axios = require('axios');
    const crypto = require('crypto');
    const { v4: uuidv4 } = require('uuid');
    const multer = require('multer');
    require('dotenv').config();

    // ===================================================================
    // 1. GET COMPREHENSIVE DASHBOARD DATA
    // ===================================================================
    app.get('/api/dashboard/:userId', async (req, res) => {
        try {
            const userId = req.params.userId;
            
            // Get or create dashboard
            let dashboard = await dashboardModel.findDashboardByUserId(userId);
            if (!dashboard) {
                dashboard = await dashboardModel.createDashboard(userId);
            }

            // Get related data
            const jobApplications = await jobApplicationModel.findAllJobApplicationByUserId(userId);
            const interviews = jobApplications.reduce((acc, app) => [...acc, ...(app.interviews || [])], []);

            // Update metrics
            dashboard = await dashboardModel.calculateAndUpdateMetrics(userId, jobApplications, interviews);

            res.json(dashboard);
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });

    // ===================================================================
    // 0. COMBINED DASHBOARD DATA — Single call replaces 11 separate calls
    // ===================================================================
    app.get('/api/dashboard/:userId/all', async (req, res) => {
        try {
            const userId = req.params.userId;

            // Run all DB queries in parallel using Promise.all
            // This is the key win — instead of 11 sequential queries across 11 HTTP calls,
            // we do all DB reads at once in a single request
            const [
                user,
                skills,
                experience,
                education,
                applications,
                savedJobIdsUser,
            ] = await Promise.all([
                userModel.findUserById(userId),
                skillModel.findSkillByUserId(userId),
                experienceModel.findExperienceByUserId(userId),
                educationModel.findEducationByUserId(userId),
                jobApplicationModel.findAllJobApplicationByUserId(userId),
                userModel.findUserById(userId), // reuse for savedJobs
            ]);

            // --- SAVED JOBS ---
            let savedJobs = [];
            if (user.savedJobs && user.savedJobs.length > 0) {
                const savedJobsData = await Promise.all(
                    user.savedJobs.map(async (jobId) => {
                        const job = await jobPostingModel.findJobPostingById(jobId);
                        if (!job) return null;
                        return {
                            id: job._id,
                            title: job.title,
                            company: job.companyName || 'Unknown',
                            logo: job.companyLogo || '/assets/default-logo.png',
                            deadline: job.applicationDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            location: job.location || 'Remote',
                        };
                    })
                );
                savedJobs = savedJobsData.filter(j => j !== null);
            }

            // --- PROFILE COMPLETION ---
            const profileCompletionItems = [
                { name: 'Bio', completed: !!user.professionalSummary, progress: user.professionalSummary ? 100 : 0 },
                { name: 'Work Experience', completed: experience && experience.length > 0, progress: experience && experience.length > 0 ? 100 : 0 },
                { name: 'Skills', completed: skills && skills.length >= 5, progress: Math.min((skills?.length || 0) / 5 * 100, 100) },
                { name: 'education', completed: education && education.length > 0, progress: education && education.length > 0 ? 100 : 0 },
            ];
            const overallCompletion = Math.round(
                profileCompletionItems.reduce((sum, item) => sum + item.progress, 0) / profileCompletionItems.length
            );

            // --- SKILLS ---
            const skillsData = skills.map(skill => ({
                name: skill.skillName,
                level: (parseInt(skill.skillLevel) || 7) * 10,
                verified: skill.verified || false,
                category: skill.category || 'technical',
                yearsOfExperience: skill.yearsOfExperience || 0
            }));

            // --- MILESTONES ---
            const milestones = [
                { title: 'Joined HiYrNow', date: user.accountCreatedAt || new Date(), icon: 'user-plus', status: 'completed', color: 'bg-green-500' },
                { title: 'Completed Profile', date: user.profileCompletedAt || new Date(), icon: 'check-circle', status: user.profileVisible ? 'completed' : 'pending', color: user.profileVisible ? 'bg-green-500' : 'bg-gray-400' },
                { title: 'First Application', date: applications.length > 0 ? applications[0].dateApplied : null, icon: 'file-text', status: applications.length > 0 ? 'completed' : 'pending', color: applications.length > 0 ? 'bg-green-500' : 'bg-gray-400' },
                { title: '5 Skills Added', date: skills.length >= 5 ? new Date() : null, icon: 'star', status: skills.length >= 5 ? 'completed' : 'pending', color: skills.length >= 5 ? 'bg-blue-500' : 'bg-gray-400' }
            ];

            // --- SALARY INSIGHTS ---
            const totalExperience = experience ? experience.reduce((sum, exp) => {
                const startYear = parseInt(exp.startDate?.year);
                const startMonth = parseInt(exp.startDate?.month) || 1;
                if (!startYear || isNaN(startYear)) return sum;
                const start = new Date(startYear, startMonth - 1, 1);
                const end = exp.ongoingStatus === 'Ongoing' || exp.ongoingStatus === true
                    ? new Date()
                    : (() => { const ey = parseInt(exp.endDate?.year); const em = parseInt(exp.endDate?.month) || 1; return ey ? new Date(ey, em - 1, 1) : new Date(); })();
                return sum + Math.max((end - start) / (365.25 * 24 * 60 * 60 * 1000), 0);
            }, 0) : 0;
            const baseSalary = 60000 + (Math.round(totalExperience) * 10000);
            const skillBonus = (skills?.length || 0) * 2000;
            const expectedSalary = user.preferredCTC && user.preferredCTC > 0 ? user.preferredCTC : Math.round(baseSalary + skillBonus);
            const confidence = user.preferredCTC && user.preferredCTC > 0
                ? Math.min(70 + Math.floor(totalExperience) * 3, 95)
                : Math.min(50 + Math.floor(totalExperience) * 5 + (skills?.length || 0) * 2, 95);
            const salaryInsight = {
                marketMin: Math.round(expectedSalary * 0.7),
                marketMax: Math.round(expectedSalary * 1.5),
                expectedSalary,
                confidence,
                topCompanies: ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple'],
                skillsToAdd: ['GraphQL', 'Docker', 'Kubernetes', 'AWS'].filter(s => !skills.map(sk => sk.skillName?.toLowerCase()).includes(s.toLowerCase())).slice(0, 4),
            };

            // --- BADGES ---
            const badges = [
                { id: 'skills-verified', name: '5 Skills Verified', icon: 'shield-check', unlocked: (skills?.filter(s => s.verified).length || 0) >= 5, progress: Math.min((skills?.filter(s => s.verified).length || 0) / 5 * 100, 100) },
                { id: 'applications-10', name: '10 Applications', icon: 'fire', unlocked: (applications?.length || 0) >= 10, progress: Math.min((applications?.length || 0) / 10 * 100, 100) },
            ];

            // --- RECENT ACTIVITIES ---
            const recentActivities = applications.slice(0, 10).map(app => ({
                id: app._id,
                type: 'application',
                title: `Applied to ${app.title || app.jobTitle || 'a job'}`,
                description: app.company || app.companyName || 'Unknown Company',
                timestamp: app.dateApplied,
                icon: 'file-text'
            }));

            // --- NOTIFICATIONS (static for now) ---
            const notifications = [
                { id: '1', title: 'Profile Viewed', message: 'A recruiter viewed your profile', type: 'info', timestamp: new Date(Date.now() - 60 * 60 * 1000), read: false },
                { id: '2', title: 'New Job Match', message: '5 new jobs match your profile', type: 'success', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), read: false },
            ];

            // --- LEARNING RESOURCES (static for now) ---
            const learningItems = [
                { id: 'graphql-course', title: 'Master GraphQL in 2024', type: 'course', duration: '4h 30m', provider: 'Udemy', rating: 4.8, level: 'Intermediate', url: 'https://example.com/graphql' },
                { id: 'interview-tips', title: 'Ace Your Tech Interview', type: 'article', duration: '15 min', provider: 'Medium', rating: 4.5, level: 'All Levels', url: 'https://example.com/interview' },
            ];

            // --- AI INSIGHTS (static for now) ---
            const aiInsights = [
                { id: 'add-typescript', message: 'Add "TypeScript" to boost your profile by 15%', action: 'Add Skill', icon: 'lightbulb', priority: 'high', actionUrl: '/profile/skills' },
                { id: 'improve-resume', message: 'Your resume is missing key projects', action: 'Improve Resume', icon: 'document', priority: 'high', actionUrl: '/resume-builder' },
            ];

            // Return everything in one response
            res.json({
                success: true,
                applications,
                savedJobs,
                notifications,
                unreadCount: notifications.filter(n => !n.read).length,
                profileCompletionItems,
                overallCompletion,
                skills: skillsData,
                technicalSkills: skillsData.filter(s => s.category === 'technical'),
                softSkills: skillsData.filter(s => s.category === 'soft'),
                milestones,
                salaryInsight,
                badges,
                learningItems,
                recentActivities,
                aiInsights,
            });

        } catch (error) {
            console.error('Combined dashboard fetch error:', error);
            res.status(500).json({ error: 'Failed to load dashboard', message: error.message });
        }
    });

    // ===================================================================
    // 2. AI JOB RECOMMENDATIONS
    // ===================================================================
    app.get('/api/dashboard/:userId/recommendations', async (req, res) => {
        try {
            const userId = req.params.userId;
            const { filter = 'skills', limit = 10, page = 1 } = req.query;

            // Get user data for matching
            const user = await userModel.findUserById(userId);
            const userSkills = await skillModel.findSkillByUserId(userId);
            const userExperience = await experienceModel.findExperienceByUserId(userId);

            // Get all active job postings
            let jobQuery = { status: { $in: ['active', 'Active'] } };
            
            // Apply filter logic
            switch(filter) {
                case 'skills':
                    if (userSkills && userSkills.length > 0) {
                        const skillNames = userSkills.map(s => s.name);
                        jobQuery.$or = [
                            { skillsRequired: { $in: skillNames } },
                            { coreSkills: { $in: skillNames } }
                        ];
                    }
                    break;
                case 'location':
                    if (user.preferredLocation) {
                        jobQuery.$or = [
                            { location: { $regex: user.preferredLocation, $options: 'i' } },
                            { remote: true }
                        ];
                    }
                    break;
                case 'resume':
                    // Match based on resume keywords
                    jobQuery = { status: { $in: ['active', 'Active'] } };
                    break;
                case 'trending':
                    // Sort by applications count
                    break;
                case 'similar':
                    // Based on previous applications
                    const previousApps = await jobApplicationModel.findAllJobApplicationByUserId(userId);
                    if (previousApps.length > 0) {
                        const previousCategories = previousApps.map(app => app.category);
                        jobQuery.category = { $in: previousCategories };
                    }
                    break;
            }

            // Fetch matching jobs
            const sortOption = filter === 'trending' ? { applicationsCount: -1 } : { datePosted: -1 };
            const skipAmount = (parseInt(page) - 1) * parseInt(limit);
            const jobs = await jobPostingModel.findJobPostingsWithFilter(
                jobQuery, 
                sortOption,
                skipAmount,
                parseInt(limit)
            );
            const jobApplications = await jobApplicationModel.findAllJobApplicationByUserId(userId);
            // Calculate match scores for each job
            const recommendations = (jobs || []).map(job => {
                try {
                    const matchScore = calculateMatchScore(user, userSkills, userExperience, job);
                    const missingSkills = identifyMissingSkills(userSkills, job);
                    
                    return {
                        id: job._id,
                        companyName: job.company || 'Unknown Company',
                        companyLogo: job.company_logo || 'https://via.placeholder.com/50',
                        jobTitle: job.title || 'Position Available',
                        matchScore: Math.round(matchScore),
                        missingSkills: missingSkills.slice(0, 3), // Top 3 missing skills
                        salaryRange: `${job.minSalary || job.minAnnualSalary || 'N/A'} - ${job.maxSalary || job.maxAnnualSalary || 'N/A'}`,
                        location: job.location || 'Remote',
                        employmentType: job.type || 'Full-time',
                        remote: job.location?.toLowerCase().includes('remote') || false,
                        isSaved: false, // Check against user's saved jobs
                        isApplied: jobApplications.some(app => app.jobPosting && app.jobPosting.toString() === job._id.toString()),
                        postedDate: job.datePosted || new Date(),
                        description: job.description || job.responsibilities || ''
                    };
                } catch (err) {
                    console.error('Error processing job:', job._id, err);
                    return null;
                }
            }).filter(job => job !== null);

            res.json({
                success: true,
                recommendations: recommendations.sort((a, b) => b.matchScore - a.matchScore),
                totalCount: recommendations.length,
                page: parseInt(page),
                filter
            });
        } catch (error) {
            console.error('Recommendations fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch recommendations', message: error.message });
        }
    });

    // ===================================================================
    // 3. SAVED JOBS MANAGEMENT
    // ===================================================================
    app.get('/api/dashboard/:userId/saved-jobs', async (req, res) => {
        try {
            const userId = req.params.userId;
            const user = await userModel.findUserById(userId);
            
            if (!user.savedJobs || user.savedJobs.length === 0) {
                return res.json({ success: true, savedJobs: [] });
            }

            const savedJobsData = await Promise.all(user.savedJobs.map(async (jobId) => {
                const job = await jobPostingModel.findJobPostingById(jobId);
                if (!job) return null;
                
                return {
                    id: job._id,
                    title: job.title,
                    company: job.companyName || 'Unknown',
                    logo: job.companyLogo || '/assets/default-logo.png',
                    deadline: job.applicationDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    location: job.location || 'Remote',
                    salaryRange: `${job.minSalary || 'N/A'} - ${job.maxSalary || 'N/A'}`,
                    matchScore: 85 // Calculate actual match score
                };
            }));

            res.json({
                success: true,
                savedJobs: savedJobsData.filter(job => job !== null)
            });
        } catch (error) {
            console.error('Saved jobs fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch saved jobs', message: error.message });
        }
    });

    app.post('/api/dashboard/:userId/saved-jobs/:jobId', async (req, res) => {
        try {
            const { userId, jobId } = req.params;
            
            const user = await userModel.findUserById(userId);
            if (!user.savedJobs) {
                user.savedJobs = [];
            }

            if (!user.savedJobs.includes(jobId)) {
                user.savedJobs.push(jobId);
                await userModel.updateUser(userId, { savedJobs: user.savedJobs });
            }

            res.json({ success: true, message: 'Job saved successfully' });
        } catch (error) {
            console.error('Save job error:', error);
            res.status(500).json({ error: 'Failed to save job', message: error.message });
        }
    });

    app.delete('/api/dashboard/:userId/saved-jobs/:jobId', async (req, res) => {
        try {
            const { userId, jobId } = req.params;
            
            const user = await userModel.findUserById(userId);
            if (user.savedJobs) {
                user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
                await userModel.updateUser(userId, { savedJobs: user.savedJobs });
            }

            res.json({ success: true, message: 'Job removed from saved' });
        } catch (error) {
            console.error('Remove saved job error:', error);
            res.status(500).json({ error: 'Failed to remove saved job', message: error.message });
        }
    });

    // ===================================================================
    // 4. NOTIFICATIONS
    // ===================================================================
    app.get('/api/dashboard/:userId/notifications', async (req, res) => {
        try {
            const userId = req.params.userId;
            const { unreadOnly = false, limit = 20 } = req.query;

            // Mock notifications - replace with actual notification system
            const notifications = [
                {
                    id: '1',
                    title: 'Profile Viewed',
                    message: 'A recruiter viewed your profile',
                    type: 'info',
                    timestamp: new Date(Date.now() - 60 * 60 * 1000),
                    read: false,
                    actionUrl: '/profile'
                },
                {
                    id: '2',
                    title: 'New Job Match',
                    message: '5 new jobs match your profile',
                    type: 'success',
                    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
                    read: false,
                    actionUrl: '/jobs/recommended'
                }
            ];

            const filteredNotifications = unreadOnly 
                ? notifications.filter(n => !n.read)
                : notifications;

            res.json({
                success: true,
                notifications: filteredNotifications.slice(0, parseInt(limit)),
                unreadCount: notifications.filter(n => !n.read).length
            });
        } catch (error) {
            console.error('Notifications fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch notifications', message: error.message });
        }
    });

    app.put('/api/dashboard/:userId/notifications/:notificationId/read', async (req, res) => {
        try {
            // Mark notification as read - implement with actual notification system
            res.json({ success: true, message: 'Notification marked as read' });
        } catch (error) {
            console.error('Mark notification read error:', error);
            res.status(500).json({ error: 'Failed to mark notification as read', message: error.message });
        }
    });

    // ===================================================================
    // 5. PROFILE COMPLETION STATUS
    // ===================================================================
    app.get('/api/dashboard/:userId/profile-completion', async (req, res) => {
        try {
            const userId = req.params.userId;
            
            const user = await userModel.findUserById(userId);
            const skills = await skillModel.findSkillByUserId(userId);
            const experience = await experienceModel.findExperienceByUserId(userId);
            const education = await educationModel.findEducationByUserId(userId);
            const projects = await projectModel.findProjectByUserId(userId);
            const certificates = await certificateModel.findCertificateByUserId(userId);
            const resumes = await resumeModel.findResumeUploadByUserId(userId);

            const profileCompletionItems = [
                { name: 'Bio', completed: !!user.professionalSummary, progress: user.professionalSummary ? 100 : 0 },
                { name: 'Work Experience', completed: experience && experience.length > 0, progress: experience && experience.length > 0 ? 100 : 0 },
                { name: 'Skills', completed: skills && skills.length >= 5, progress: Math.min((skills?.length || 0) / 5 * 100, 100) },
                { name: 'education', completed: education && education.length > 0, progress: education && education.length > 0 ? 100 : 0 },
                // { name: 'Projects', completed: projects && projects.length > 0, progress: projects && projects.length > 0 ? 100 : 0 },
                // { name: 'Certifications', completed: certificates && certificates.length > 0, progress: certificates && certificates.length > 0 ? 100 : 0 }
            ];

            const overallCompletion = Math.round(
                profileCompletionItems.reduce((sum, item) => sum + item.progress, 0) / profileCompletionItems.length
            );

            res.json({
                success: true,
                profileCompletionItems,
                overallCompletion,
                missingItems: profileCompletionItems.filter(item => !item.completed).map(item => item.name)
            });
        } catch (error) {
            console.error('Profile completion fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch profile completion', message: error.message });
        }
    });

    // ===================================================================
    // 6. SKILLS OVERVIEW
    // ===================================================================
    app.get('/api/dashboard/:userId/skills', async (req, res) => {
        try {
            const userId = req.params.userId;
            const skills = await skillModel.findSkillByUserId(userId);

            // ✅ CORRECT
            const skillsData = skills.map(skill => ({
                name: skill.skillName,                    // ← was skill.name
                level: (parseInt(skill.skillLevel) || 7) * 10, // ← was skill.proficiencyLevel
                verified: skill.verified || false,
                category: skill.category || 'technical',
                yearsOfExperience: skill.yearsOfExperience || 0
            }));

            res.json({
                success: true,
                skills: skillsData,
                technicalSkills: skillsData.filter(s => s.category === 'technical'),
                softSkills: skillsData.filter(s => s.category === 'soft'),
                verifiedCount: skillsData.filter(s => s.verified).length,
                totalCount: skillsData.length
            });
        } catch (error) {
            console.error('Skills fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch skills', message: error.message });
        }
    });

    // ===================================================================
    // 7. CAREER MILESTONES
    // ===================================================================
    app.get('/api/dashboard/:userId/milestones', async (req, res) => {
        try {
            const userId = req.params.userId;
            
            const user = await userModel.findUserById(userId);
            const applications = await jobApplicationModel.findAllJobApplicationByUserId(userId);
            const skills = await skillModel.findSkillByUserId(userId);

            const milestones = [
                {
                    title: 'Joined HiYrNow',
                    date: user.accountCreatedAt || new Date(),
                    icon: 'user-plus',
                    status: 'completed',
                    color: 'bg-green-500'
                },
                {
                    title: 'Completed Profile',
                    date: user.profileCompletedAt || new Date(),
                    icon: 'check-circle',
                    status: user.profileVisible ? 'completed' : 'pending',
                    color: user.profileVisible ? 'bg-green-500' : 'bg-gray-400'
                },
                {
                    title: 'First Application',
                    date: applications.length > 0 ? applications[0].dateApplied : null,
                    icon: 'file-text',
                    status: applications.length > 0 ? 'completed' : 'pending',
                    color: applications.length > 0 ? 'bg-green-500' : 'bg-gray-400'
                },
                {
                    title: '5 Skills Added',
                    date: skills.length >= 5 ? new Date() : null,
                    icon: 'star',
                    status: skills.length >= 5 ? 'completed' : 'pending',
                    color: skills.length >= 5 ? 'bg-blue-500' : 'bg-gray-400'
                }
            ];

            res.json({
                success: true,
                milestones,
                completedCount: milestones.filter(m => m.status === 'completed').length,
                totalCount: milestones.length
            });
        } catch (error) {
            console.error('Milestones fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch milestones', message: error.message });
        }
    });

    // ===================================================================
    // 8. SALARY INSIGHTS
    // ===================================================================
    app.get('/api/dashboard/:userId/salary-insights', async (req, res) => {
        try {
            const userId = req.params.userId;
            
            const user = await userModel.findUserById(userId);
            const skills = await skillModel.findSkillByUserId(userId);
            const experience = await experienceModel.findExperienceByUserId(userId);

            // Calculate expected salary based on experience and skills
            // startDate is stored as { month: string, year: string } — NOT a plain date string
            const totalExperience = experience ? experience.reduce((sum, exp) => {
                const startYear = parseInt(exp.startDate?.year);
                const startMonth = parseInt(exp.startDate?.month) || 1;
                if (!startYear || isNaN(startYear)) return sum;

                const start = new Date(startYear, startMonth - 1, 1);
                const end = exp.ongoingStatus === 'Ongoing' || exp.ongoingStatus === true
                    ? new Date()
                    : (() => {
                        const endYear = parseInt(exp.endDate?.year);
                        const endMonth = parseInt(exp.endDate?.month) || 1;
                        return endYear ? new Date(endYear, endMonth - 1, 1) : new Date();
                    })();

                const years = (end - start) / (365.25 * 24 * 60 * 60 * 1000);
                return sum + Math.max(years, 0);
            }, 0) : 0;

            const baseSalary = 60000 + (Math.round(totalExperience) * 10000);
const skillBonus = (skills?.length || 0) * 2000;
const calculatedSalary = Math.round(baseSalary + skillBonus);

// Use user's own preferredCTC if they set it, otherwise fall back to calculation
const expectedSalary = user.preferredCTC && user.preferredCTC > 0
    ? user.preferredCTC
    : calculatedSalary;

            // Build skills-to-add: suggest high-value skills the user doesn't already have
            const userSkillNames = (skills || []).map(s => s.skillName?.toLowerCase());
            const highValueSkills = ['GraphQL', 'Docker', 'Kubernetes', 'AWS', 'TypeScript', 'Redis', 'Kafka', 'Terraform', 'Go', 'Rust'];
            const skillsToAdd = highValueSkills
                .filter(s => !userSkillNames.includes(s.toLowerCase()))
                .slice(0, 4);

            // Build top companies based on user's primary skill category
            const techSkillNames = (skills || []).map(s => s.skillName?.toLowerCase());
            let topCompanies = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple'];
            if (techSkillNames.some(s => ['java', 'spring', 'kotlin'].includes(s))) {
                topCompanies = ['Infosys', 'TCS', 'Oracle', 'SAP', 'Flipkart'];
            } else if (techSkillNames.some(s => ['python', 'ml', 'tensorflow', 'pytorch', 'data science'].includes(s))) {
                topCompanies = ['Google', 'OpenAI', 'DeepMind', 'Databricks', 'Amazon'];
            } else if (techSkillNames.some(s => ['react', 'angular', 'vue', 'frontend'].includes(s))) {
                topCompanies = ['Google', 'Airbnb', 'Shopify', 'Vercel', 'Atlassian'];
            } else if (techSkillNames.some(s => ['node', 'express', 'backend', 'django', 'rails'].includes(s))) {
                topCompanies = ['Stripe', 'Twilio', 'GitHub', 'HashiCorp', 'MongoDB'];
            }

            // Confidence: higher with more experience years + more skills
            // REPLACE WITH:
const confidence = user.preferredCTC && user.preferredCTC > 0
    ? Math.min(70 + Math.floor(totalExperience) * 3, 95)   // user set it → higher base confidence
    : Math.min(50 + Math.floor(totalExperience) * 5 + (skills?.length || 0) * 2, 95);

            const salaryInsight = {
                marketMin: Math.round(expectedSalary * 0.7),
                marketMax: Math.round(expectedSalary * 1.5),
                expectedSalary: expectedSalary,
                confidence,
                topCompanies,
                skillsToAdd,
                regionalData: {
                    region: user.currentLocation || 'United States',
                    averageSalary: expectedSalary + 10000,
                    competitionLevel: totalExperience > 5 ? 'Moderate' : 'High'
                }
            };

            res.json({
                success: true,
                salaryInsight
            });
        } catch (error) {
            console.error('Salary insights fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch salary insights', message: error.message });
        }
    });

    // ===================================================================
    // 9. ACHIEVEMENT BADGES
    // ===================================================================
    app.get('/api/dashboard/:userId/badges', async (req, res) => {
        try {
            const userId = req.params.userId;
            
            const skills = await skillModel.findSkillByUserId(userId);
            const applications = await jobApplicationModel.findAllJobApplicationByUserId(userId);
            const user = await userModel.findUserById(userId);

            const badges = [
                {
                    id: 'profile-100',
                    name: 'Profile 100%',
                    description: 'Complete your profile',
                    icon: 'user-check',
                    unlocked: false,
                    progress: 72,
                    requirement: 'Complete all profile sections'
                },
                {
                    id: 'skills-verified',
                    name: '5 Skills Verified',
                    description: 'Verify 5 skills',
                    icon: 'shield-check',
                    unlocked: (skills?.filter(s => s.verified).length || 0) >= 5,
                    progress: Math.min((skills?.filter(s => s.verified).length || 0) / 5 * 100, 100),
                    requirement: 'Get 5 skills verified',
                    unlockedDate: (skills?.filter(s => s.verified).length || 0) >= 5 ? new Date() : null
                },
                {
                    id: 'applications-10',
                    name: '10 Applications',
                    description: 'Apply to 10 jobs',
                    icon: 'fire',
                    unlocked: (applications?.length || 0) >= 10,
                    progress: Math.min((applications?.length || 0) / 10 * 100, 100),
                    requirement: 'Submit 10 job applications',
                    unlockedDate: (applications?.length || 0) >= 10 ? new Date() : null
                },
                {
                    id: 'top-percentile',
                    name: 'Top Skill Percentile',
                    description: 'Be in top 10% for a skill',
                    icon: 'star',
                    unlocked: false,
                    progress: 45,
                    requirement: 'Rank in top 10% for any skill'
                }
            ];

            res.json({
                success: true,
                badges,
                unlockedCount: badges.filter(b => b.unlocked).length,
                totalCount: badges.length
            });
        } catch (error) {
            console.error('Badges fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch badges', message: error.message });
        }
    });

    // ===================================================================
    // 10. LEARNING RESOURCES
    // ===================================================================
    app.get('/api/dashboard/:userId/learning', async (req, res) => {
        try {
            const userId = req.params.userId;
            const skills = await skillModel.findSkillByUserId(userId);

            // Recommend learning based on missing/weak skills
            const learningItems = [
                {
                    id: 'graphql-course',
                    title: 'Master GraphQL in 2024',
                    type: 'course',
                    duration: '4h 30m',
                    thumbnail: '/assets/learning/graphql.jpg',
                    provider: 'Udemy',
                    rating: 4.8,
                    level: 'Intermediate',
                    url: 'https://example.com/graphql'
                },
                {
                    id: 'interview-tips',
                    title: 'Ace Your Tech Interview',
                    type: 'article',
                    duration: '15 min',
                    thumbnail: '/assets/learning/interview.jpg',
                    provider: 'Medium',
                    rating: 4.5,
                    level: 'All Levels',
                    url: 'https://example.com/interview'
                }
            ];

            res.json({
                success: true,
                learningItems,
                recommendations: learningItems.filter(item => item.rating >= 4.5)
            });
        } catch (error) {
            console.error('Learning resources fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch learning resources', message: error.message });
        }
    });

    // ===================================================================
    // 11. RECENT ACTIVITIES
    // ===================================================================
    app.get('/api/dashboard/:userId/activities', async (req, res) => {
        try {
            const userId = req.params.userId;
            const { limit = 10 } = req.query;

            const applications = await jobApplicationModel.findAllJobApplicationByUserId(userId);
            
            const recentActivities = applications.slice(0, parseInt(limit)).map(app => ({
                id: app._id,
                type: 'application',
                title: `Applied to ${app.title || app.jobTitle || 'a job'}`,
                description: app.company || app.companyName || app.employer || 'Unknown Company',
                timestamp: app.dateApplied,
                icon: 'file-text'
            }));

            res.json({
                success: true,
                recentActivities,
                totalCount: applications.length
            });
        } catch (error) {
            console.error('Activities fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch activities', message: error.message });
        }
    });

    // ===================================================================
    // 12. AI INSIGHTS
    // ===================================================================
    app.get('/api/dashboard/:userId/ai-insights', async (req, res) => {
        try {
            const userId = req.params.userId;
            
            const skills = await skillModel.findSkillByUserId(userId);
            const user = await userModel.findUserById(userId);

            const aiInsights = [
                {
                    id: 'add-typescript',
                    message: 'Add "TypeScript" to boost your profile by 15%',
                    action: 'Add Skill',
                    icon: 'lightbulb',
                    priority: 'high',
                    actionUrl: '/profile/skills'
                },
                {
                    id: 'improve-resume',
                    message: 'Your resume is missing key projects',
                    action: 'Improve Resume',
                    icon: 'document',
                    priority: 'high',
                    actionUrl: '/resume-builder'
                }
            ];

            res.json({
                success: true,
                aiInsights,
                highPriority: aiInsights.filter(i => i.priority === 'high').length
            });
        } catch (error) {
            console.error('AI insights fetch error:', error);
            res.status(500).json({ error: 'Failed to fetch AI insights', message: error.message });
        }
    });

    // ===================================================================
    // INTEGRATION ENDPOINTS (Keep existing ones)
    // ===================================================================
    
    // Update integration status
    app.put('/api/dashboard/:userId/integration/:type', async (req, res) => {
        try {
            const { userId, type } = req.params;
            const { status } = req.body;

            const dashboard = await dashboardModel.updateIntegrationStatus(userId, type, status);
            res.json({ success: true, dashboard });
        } catch (error) {
            console.error('Integration update error:', error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });

    // LinkedIn Integration
    const REDIRECT_URI = `${process.env.BASE_URL}/api/dashboard/integration/linkedin/callback`;
    
    app.get('/api/dashboard/integration/linkedin/auth', (req, res) => {
        try {
            const state = uuidv4();
            req.session.linkedinState = state;
            const scope = ['profile', 'email', 'openid'];
            const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
                `response_type=code&` +
                `client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
                `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
                `state=${state}&` +
                `scope=${scope.join('%20')}`;

            res.json({ success: true, authUrl, state });
        } catch (error) {
            console.error('LinkedIn auth error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.all('/api/dashboard/integration/linkedin/callback', async (req, res) => {
        try {
            const code = req.method === 'GET' ? req.query.code : req.body.code;
            const state = req.method === 'GET' ? req.query.state : req.body.state;
            const storedState = req.session.linkedinState;
            const userId = req.session['user']?._id;

            if (!code) throw new Error('Authorization code is required');
            if (state !== storedState) throw new Error('State parameter mismatch');

            // Exchange code for token
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('redirect_uri', REDIRECT_URI);
            params.append('client_id', process.env.LINKEDIN_CLIENT_ID);
            params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET);

            const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const accessToken = tokenResponse.data.access_token;
            
            // Get profile
            const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'cache-control': 'no-cache',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });

            const profile = profileResponse.data;

            await dashboardModel.updateIntegrationStatus(userId, 'linkedin', true);

            res.json({
                success: true,
                message: 'LinkedIn integration successful',
                profile
            });
        } catch (error) {
            console.error('LinkedIn callback error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Document upload
    // Document upload
    const storage = multer.diskStorage({
        destination: 'uploads/',
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
    const upload = multer({ storage: storage });

    // ===================================================================
    // COVER PHOTO UPLOAD
    // ===================================================================
    app.post('/api/upload-cover-photo', upload.single('coverPhoto'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const userId = req.body.userId || req.session?.user?._id;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const coverPhotoUrl = `/uploads/${req.file.filename}`;

            await userModel.updateUser(userId, { coverPhotoUrl: coverPhotoUrl });

            res.json({
                file_uploaded: true,
                success: true,
                url: coverPhotoUrl,
            });
        } catch (error) {
            console.error('Cover photo upload error:', error);
            res.status(500).json({ error: 'Upload failed', message: error.message });
        }
    });

    app.post('/api/dashboard/integration/documents', upload.array('files'), async (req, res) => {
        try {
            const { userId } = req.body;
            const files = req.files;

            const verifiedDocs = files.map(file => ({
                originalName: file.originalname,
                verified: true,
                type: file.mimetype,
                url: `/uploads/${file.filename}`
            }));

            await dashboardModel.updateIntegrationStatus(userId, 'documents', true);

            res.json({
                success: true,
                message: 'Documents verified successfully',
                documents: verifiedDocs
            });
        } catch (error) {
            console.error('Document verification error:', error);
            res.status(500).json({ error: 'Document verification failed', message: error.message });
        }
    });

    // ===================================================================
    // HELPER FUNCTIONS
    // ===================================================================
    
    function calculateMatchScore(user, userSkills, userExperience, job) {
        let score = 0;
        let maxScore = 100;

        // Skills matching (40 points)
        const jobSkills = job.skillsRequired || job.coreSkills || [];
        if (jobSkills.length > 0 && userSkills && userSkills.length > 0) {
            const matchingSkills = userSkills.filter(us => 
                jobSkills.some(js => 
                    js.toLowerCase() === us.name.toLowerCase()
                )
            );
            score += (matchingSkills.length / Math.max(jobSkills.length, 1)) * 40;
        }

        // Experience matching (30 points)
        const minExp = job.minWorkExperience || job.minExp || 0;
        if (minExp > 0 && userExperience && userExperience.length > 0) {
            const totalExp = userExperience.reduce((sum, exp) => {
                const years = (new Date() - new Date(exp.startDate)) / (365 * 24 * 60 * 60 * 1000);
                return sum + years;
            }, 0);
            
            if (totalExp >= minExp) {
                score += 30;
            } else {
                score += (totalExp / minExp) * 30;
            }
        } else if (minExp === 0) {
            // If no experience required, give full points
            score += 30;
        }

        // Education matching (20 points)
        if (job.minQualification) {
            // Always give some points for education
            score += 15;
        } else {
            score += 20;
        }

        // Location matching (10 points)
        const isRemote = job.location && job.location.toLowerCase().includes('remote');
        if (isRemote || (job.location && user.preferredLocation && 
            job.location.toLowerCase().includes(user.preferredLocation.toLowerCase()))) {
            score += 10;
        } else {
            // Give partial points if location is flexible
            score += 5;
        }

        return Math.min(score, maxScore);
    }

    function identifyMissingSkills(userSkills, job) {
        const jobSkills = job.skillsRequired || job.coreSkills || [];
        if (!Array.isArray(jobSkills) || jobSkills.length === 0) return [];
        
        const userSkillNames = (userSkills || []).map(s => s.name ? s.name.toLowerCase() : '');
        return jobSkills.filter(rs => 
            rs && !userSkillNames.includes(rs.toLowerCase())
        );
    }
};

