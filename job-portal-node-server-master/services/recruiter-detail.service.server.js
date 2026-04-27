module.exports = function (app) {

    var recruiterModel =
        require('./../models/recruiter-detail/recruiter-detail.model.server');
    var usage = require('../utils/plan-usage');

    async function refreshUsageIfNeeded(recruiterDetails) {
        if (!recruiterDetails?._id) {
            return recruiterDetails;
        }

        const startBefore = recruiterDetails.usageCycleStart
            ? new Date(recruiterDetails.usageCycleStart).toISOString()
            : null;
        const usageBefore = JSON.stringify(recruiterDetails.usage || {});

        usage.ensureCycle(recruiterDetails);

        const startAfter = recruiterDetails.usageCycleStart
            ? new Date(recruiterDetails.usageCycleStart).toISOString()
            : null;
        const usageAfter = JSON.stringify(recruiterDetails.usage || {});

        const cycleChanged = startBefore !== startAfter || usageBefore !== usageAfter;
        if (cycleChanged) {
            await recruiterModel.updateRecruiterDetail(recruiterDetails._id, {
                usage: recruiterDetails.usage,
                usageCycleStart: recruiterDetails.usageCycleStart
            });
        }

        return recruiterDetails;
    }

    app.get('/api/recruiter', findAllRecruiter);
    app.get('/api/recruiter/user', findRecruiterDetailByUserId);
    app.get('/api/recruiter/user/:userId', findRecruiterDetailBySpecificUserId);
    app.post('/api/recruiter', createRecruiterDetail);
    app.put('/api/recruiter/:recruiterId', updateRecruiterDetail);
    app.delete('/api/recruiter/:recruiterId', deleteRecruiterDetail);
    app.get('/api/recruiter/dashboard', getRecruiterDashboardData);


    function findAllRecruiter(req, res) {
        recruiterModel.findAllRecruiter()
            .then(function (recruiter) {
                res.send(recruiter);
            });
    }

    function createRecruiterDetail(req, res) {
        var recruiter = req.body;
        if (req.session && req.session['user']) {
            recruiter['user'] = req.session['user']._id;
            recruiterModel.createRecruiterDetail(recruiter)
                .then(function (status) {
                    res.send(status);
                });
        } else {
            res.send({status: 'session expired'});
        }
    }


    async function findRecruiterDetailByUserId(req, res) {
        if (req.session && req.session['user']) {
            var userId = req.session['user']._id;
            try {
                const recruiterDetails = await recruiterModel.findRecruiterDetailByUserId(userId);
                const refreshed = await refreshUsageIfNeeded(recruiterDetails);
                res.json(refreshed);
            } catch (error) {
                console.error('Error fetching recruiter details by user ID:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        } else {
            res.send({status: 'session expired'});
        }
    }

    async function findRecruiterDetailBySpecificUserId(req, res) {
        var userId = req.params['userId'];
        try {
            const recruiterDetails = await recruiterModel.findRecruiterDetailByUserId(userId);
            const refreshed = await refreshUsageIfNeeded(recruiterDetails);
            res.json(refreshed);
        } catch (error) {
            console.error('Error fetching recruiter details by user ID:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    function updateRecruiterDetail(req, res) {
        var recruiter = req.body;
        var recruiterId = req.params['recruiterId'];
        if (req.session && req.session['user']) {
            recruiterModel.updateRecruiterDetail(recruiterId,recruiter)
                .then(function (status) {
                    res.send(status);
                });
        } else {
            res.send({status: 'session expired'});
        }
    }

    function deleteRecruiterDetail(req, res) {
        if (req.session && req.session['user']) {
            var id = req.params['recruiterId'];
            recruiterModel.deleteRecruiterDetail(id).then(function (status) {
                res.send(status);
            })

        }
        else {
            res.send('session expired');
        }
    }

    // --- Recruiter Dashboard Aggregated Data ---
    const APPLICATION_STATUS = {
        PENDING: 'pending',
        SCREENING: 'screening',
        INTERVIEW: 'interviewing',
        SHORTLISTED: 'shortlisted',
        ASSIGNMENT_SENT: 'assignment_sent',
        OFFER_SENT: 'offer_sent',
        HIRED: 'hired',
        REJECTED: 'rejected'
    };
    
    async function getRecruiterDashboardData(req, res) {
        // Session validation
        if (!(req.session?.user?._id)) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Session expired. Please login again.' 
            });
        }
    
        try {
            const userId = req.session.user._id;
            
            // Fetch recruiter details with error handling
            const recruiterDetails = await recruiterModel.findRecruiterDetailByUserId(userId);
            await refreshUsageIfNeeded(recruiterDetails);
            if (!recruiterDetails) {
                return res.status(404).json({ 
                    status: 'error', 
                    message: 'Recruiter profile not found' 
                });
            }
    
            // Fetch job postings
            const jobPostingModel = require('./../models/job-posting/job-posting.model.server');
            const jobPostings = await jobPostingModel.findJobPostingByUserId(userId) || [];
            
            if (jobPostings.length === 0) {
                return res.json({
                    status: 'success',
                    data: {
                        recruiterDetails,
                        jobPostings: [],
                        applications: [],
                        interviews: [],
                        stats: { activeJobs: 0, totalApplications: 0, weeklyInterviews: 0, hireRate: 0 },
                        pipelineStages: [],
                        recentActivities: [],
                        aiInsights: ['No job postings found. Create your first job posting to start receiving applications.'],
                        topCandidates: [],
                        marketTrends: []
                    }
                });
            }
    
            // Get job IDs and fetch applications
            const jobIds = jobPostings.map(job => job._id).filter(Boolean);
            const jobApplicationModel = require('./../models/job-application/job-application.model.server');
            const applications = await jobApplicationModel.findJobApplicationByAllJobId(jobIds) || [];
    
            // Normalize application statuses to lowercase
            const normalizedApplications = applications.map(app => ({
                ...app,
                status: app.status?.toLowerCase()
            }));
    
            // Extract interviews with enhanced data
            const interviews = [];
            normalizedApplications.forEach(app => {
                if (app?.interviews && Array.isArray(app.interviews)) {
                    app.interviews.forEach(interview => {
                        interviews.push({
                            ...interview,
                            jobTitle: app.title || 'Untitled Position',
                            applicantName: app.user || 'Unknown Applicant',
                            jobPosting: app.jobPosting,
                            applicationId: app._id,
                            status: app.status
                        });
                    });
                }
            });
    
            // Calculate enhanced stats
            const stats = calculateDashboardStats(jobPostings, normalizedApplications, interviews);
            
            // Pipeline stages with better analytics
            const pipelineStages = calculatePipelineStages(normalizedApplications);
            
            // Recent activities with improved formatting
            const recentActivities = generateRecentActivities(normalizedApplications, interviews);
            
            // AI insights with actionable recommendations
            const aiInsights = generateAIInsights(jobPostings, normalizedApplications, interviews);
            
            // Top candidates with better scoring
            const topCandidates = calculateTopCandidates(normalizedApplications);
            
            // Market trends with comparative data
            const marketTrends = calculateMarketTrends(normalizedApplications, interviews, stats);
    
            // Success response
            res.json({
                status: 'success',
                data: {
                    recruiterDetails,
                    jobPostings,
                    applications: normalizedApplications,
                    interviews,
                    stats,
                    pipelineStages,
                    recentActivities,
                    aiInsights,
                    topCandidates,
                    marketTrends
                }
            });
    
        } catch (err) {
            console.error('Dashboard API Error:', {
                error: err.message,
                stack: err.stack,
                userId: req.session?.user?._id,
                timestamp: new Date().toISOString()
            });
    
            // Handle specific error types
            if (err.name === 'ValidationError') {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Invalid data format',
                    details: err.message 
                });
            }
    
            if (err.name === 'CastError') {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Invalid ID format' 
                });
            }
    
            // Generic server error
            res.status(500).json({ 
                status: 'error', 
                message: 'Internal server error. Please try again later.' 
            });
        }
    }
    
    // Helper function to calculate dashboard stats
    function calculateDashboardStats(jobPostings, applications, interviews) {
        const activeJobs = jobPostings.filter(job => 
            job?.status?.toLowerCase() === 'active'
        ).length;
        
        const totalApplications = applications.length;
        
        // Weekly interviews (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyInterviews = interviews.filter(interview => 
            interview?.startDateTime && new Date(interview.startDateTime) >= weekAgo
        ).length;
        
        // Hire rate calculation
        const hiredCount = applications.filter(app => 
            app?.status === APPLICATION_STATUS.HIRED
        ).length;
        const hireRate = totalApplications > 0 ? 
            Math.round((hiredCount / totalApplications) * 100) : 0;
    
        return {
            activeJobs,
            totalApplications,
            weeklyInterviews,
            hireRate,
            hiredCount
        };
    }
    
    // Helper function to calculate pipeline stages
    function calculatePipelineStages(applications) {
        const total = applications.length || 1; // Avoid division by zero
        
        const stages = [
            { 
                name: 'Applied', 
                count: applications.length, 
                percentage: 100,
                status: 'applied'
            },
          
            { 
                name: 'Shortlisted', 
                count: applications.filter(app => app?.status === APPLICATION_STATUS.SHORTLISTED).length,
                status: APPLICATION_STATUS.SHORTLISTED
            },
            { 
                name: 'Interview', 
                count: applications.filter(app => app?.status === APPLICATION_STATUS.INTERVIEW).length,
                status: APPLICATION_STATUS.INTERVIEW
            },
            
            { 
                name: 'Offer Sent', 
                count: applications.filter(app => app?.status === APPLICATION_STATUS.OFFER_SENT).length,
                status: APPLICATION_STATUS.OFFER_SENT
            },
            { 
                name: 'Hired', 
                count: applications.filter(app => app?.status === APPLICATION_STATUS.HIRED).length,
                status: APPLICATION_STATUS.HIRED
            }
        ];
    
        // Calculate percentages for non-applied stages
        return stages.map(stage => ({
            ...stage,
            percentage: stage.name === 'Applied' ? 100 : Math.round((stage.count / total) * 100)
        }));
    }
    
    // Helper function to generate recent activities
    function generateRecentActivities(applications, interviews, limit = 10) {
        const activities = [];
        
        // Add recent applications
        applications
            .filter(app => app?.dateApplied)
            .sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied))
            .slice(0, limit)
            .forEach(app => {
                activities.push({
                    type: 'application',
                    message: `New application received for ${app.title || 'Unknown Position'}`,
                    time: new Date(app.dateApplied).toLocaleString(),
                    timestamp: new Date(app.dateApplied),
                    icon: '📝',
                    status: app.status,
                    applicantName: app.user || 'Unknown'
                });
            });
    
        // Add recent interviews
        interviews
            .filter(interview => interview?.startDateTime)
            .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime))
            .slice(0, limit)
            .forEach(interview => {
                activities.push({
                    type: 'interview',
                    message: `Interview scheduled with ${interview.applicantName || 'candidate'}`,
                    time: new Date(interview.startDateTime).toLocaleString(),
                    timestamp: new Date(interview.startDateTime),
                    icon: '👥',
                    jobTitle: interview.jobTitle
                });
            });
    
        // Sort by timestamp and return limited results
        return activities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
            .map(({ timestamp, ...activity }) => activity);
    }
    
    // Helper function to generate AI insights
    function generateAIInsights(jobPostings, applications, interviews) {
        const insights = [];
        
        // Low applicant flow analysis
        const lowApplicantJobs = jobPostings.filter(job => {
            const jobApplications = applications.filter(app => 
                String(app.jobPosting) === String(job._id)
            );
            return jobApplications.length < 3;
        });
        
        if (lowApplicantJobs.length > 0) {
            insights.push(`${lowApplicantJobs.length} job${lowApplicantJobs.length > 1 ? 's have' : ' has'} low applicant flow. Consider improving job descriptions or increasing visibility.`);
        }
        
        // Interview to hire ratio
        const interviewCount = applications.filter(app => app?.status === APPLICATION_STATUS.INTERVIEW).length;
        const hiredCount = applications.filter(app => app?.status === APPLICATION_STATUS.HIRED).length;
        
        if (interviewCount > 0 && hiredCount > 0) {
            const conversionRate = Math.round((hiredCount / interviewCount) * 100);
            if (conversionRate < 30) {
                insights.push(`Interview to hire conversion rate is ${conversionRate}%. Consider refining your screening process.`);
            }
        }
        
        // Weekly activity trends
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentApplications = applications.filter(app => 
            app?.dateApplied && new Date(app.dateApplied) >= weekAgo
        ).length;
        
        if (recentApplications === 0) {
            insights.push('No applications received this week. Consider reviewing your job postings and recruitment strategy.');
        }
        
        return insights.length > 0 ? insights : ['Your recruitment process is performing well. Keep up the good work!'];
    }
    
    // Helper function to calculate top candidates
    function calculateTopCandidates(applications, limit = 5) {
        const candidateScores = {};
        
        applications.forEach(app => {
            if (!app?.user) return;
            
            if (!candidateScores[app.user]) {
                candidateScores[app.user] = { 
                    name: app.user, 
                    score: 0, 
                    applications: 0,
                    statuses: []
                };
            }
            
            candidateScores[app.user].applications++;
            candidateScores[app.user].statuses.push(app.status);
            
            // Scoring system
            const statusScores = {
                [APPLICATION_STATUS.PENDING]: 1,
                [APPLICATION_STATUS.SCREENING]: 2,
                [APPLICATION_STATUS.INTERVIEW]: 5,
                [APPLICATION_STATUS.SHORTLISTED]: 8,
                [APPLICATION_STATUS.OFFER_SENT]: 10,
                [APPLICATION_STATUS.HIRED]: 15
            };
            
            candidateScores[app.user].score += statusScores[app.status] || 0;
        });
        
        return Object.values(candidateScores)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(candidate => ({
                name: candidate.name,
                matchScore: candidate.score,
                applications: candidate.applications,
                highestStatus: candidate.statuses.includes(APPLICATION_STATUS.HIRED) ? 'Hired' : 
                              candidate.statuses.includes(APPLICATION_STATUS.OFFER_SENT) ? 'Offer Sent' :
                              candidate.statuses.includes(APPLICATION_STATUS.SHORTLISTED) ? 'Shortlisted' :
                              candidate.statuses.includes(APPLICATION_STATUS.INTERVIEW) ? 'Interview' : 'Applied',
                avatar: '' // Can be populated from user profile
            }));
    }
    
    // Helper function to calculate market trends
    function calculateMarketTrends(applications, interviews, stats) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const weeklyApplications = applications.filter(app => 
            app?.dateApplied && new Date(app.dateApplied) >= weekAgo
        ).length;
        
        const monthlyApplications = applications.filter(app => 
            app?.dateApplied && new Date(app.dateApplied) >= monthAgo
        ).length;
        
        return [
            { 
                trend: 'Weekly Applications', 
                value: weeklyApplications.toString(), 
                change: weeklyApplications > (monthlyApplications / 4) ? 'up' : 'down',
                percentage: monthlyApplications > 0 ? Math.round(((weeklyApplications * 4) / monthlyApplications - 1) * 100) : 0
            },
            { 
                trend: 'Interview Rate', 
                value: `${Math.round((stats.weeklyInterviews / (weeklyApplications || 1)) * 100)}%`, 
                change: stats.weeklyInterviews > 0 ? 'up' : 'down',
                percentage: 0
            },
            { 
                trend: 'Hire Success Rate', 
                value: `${stats.hireRate}%`, 
                change: stats.hireRate > 20 ? 'up' : 'down',
                percentage: stats.hireRate
            }
        ];}
};
