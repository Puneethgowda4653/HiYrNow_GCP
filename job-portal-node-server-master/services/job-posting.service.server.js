module.exports = function (app) {
var userModel = require('./../models/user/user.model.server'); // Adjust the path based on your file structure
var skillModel = require('./../models/skill/skill.model.server')
const jobApplicationModel = require('./../models/job-application/job-application.model.server');
  var jobPostingModel =
      require('./../models/job-posting/job-posting.model.server');
  var recruiterDetailModel = require('../models/recruiter-detail/recruiter-detail.model.server');
  var planModel = require('../models/pricing-plan/plan.model.server');
  var usage = require('../utils/plan-usage');
  var seedPlans = require('../utils/seed-plans.json');

  async function getOrCreateRecruiterWithPlan(userId) {
      let recruiter = await recruiterDetailModel.findRecruiterDetailByUserId(userId);
      if (!recruiter) {
          const starter = await planModel.findPlanByCode('starter');
          const now = new Date();
          const end = new Date(now);
          end.setMonth(end.getMonth() + 1);
          recruiter = await recruiterDetailModel.createRecruiterDetail({
              user: userId,
              plan: starter ? starter._id : undefined,
              planStartDate: now,
              planEndDate: end,
              billingCycle: 'monthly',
              isCustomPlan: false,
              usageCycleStart: now,
              usage: { jobPostsThisCycle: 0, aiJdThisCycle: 0, aiProfileAnalysisThisCycle: 0, jobBoostsThisCycle: 0, candidateProfileCredits: 0 }
          });
      }
      return recruiter;
  }
const aiAnalysisResultModel = require('../models/ai-analysis-result.model.server');
var experienceModel = require('./../models/experience/experience.model.server');
var educationModel = require('./../models/education/education.model.server');
var projectModel = require('./../models/project/project.model.server');

  app.get('/api/jobPosting/:jobPostingId', findJobPostingById);
  app.get('/api/allJobPosting', findAllJobPostings);
  app.get('/api/jobPosting', findAllJobPostingByUserId);
  app.post('/api/jobPosting', createJobPosting);
  app.put('/api/jobPosting/:jobPostingId', updateJobPosting);
  app.delete('/api/jobPosting/:jobPostingId', deleteJobPosting);
  app.get('/api/jobPosting/applications/count', getJobApplicationsCount);
  app.get('/api/jobPosting/:jobPostingId/matchUsersWithScore', matchUsersWithScore);
  app.post('/api/user/ai-analyze', analyzeJobUserMatch);  // New endpoint
  app.post('/api/jobPosting/fix-dates', fixJobPostingDates);  // Utility endpoint to fix missing dates
  
  // AI-powered job posting endpoints
  app.post('/api/jobPosting/ai/generate', generateAIJobDescription);
  app.post('/api/jobPosting/ai/enhance', enhanceJobDescription);
  app.post('/api/jobPosting/ai/skills', generateSkills);
  app.post('/api/jobPosting/ai/titles', generateJobTitles);
  app.post('/api/jobPosting/ai/analyze', analyzeJobPosting);
  app.post('/api/jobPosting/ai/custom-questions', generateCustomQuestions);

  const fetch = require('node-fetch');  // Add this at the top with other requires
  const { GoogleGenerativeAI } = require('@google/generative-ai'); // Gemini for AI analysis

  async function createJobPosting(req, res) {
    try {
        if (!req.session || !req.session['user'] || req.session['user'].role === 'JobSeeker') {
            return res.status(401).send({ status: 'session expired' });
        }

        const jobPosting = req.body;
        const userId = req.session['user']._id;

        // Enforce plan limit for job postings per month
        try {
            const recruiter = await getOrCreateRecruiterWithPlan(userId);
            if (recruiter) {
                usage.ensureCycle(recruiter);
                let plan = null;
                if (recruiter.plan) {
                    plan = await planModel.findPlanById(recruiter.plan);
                } else {
                    plan = await planModel.findPlanByCode('starter');
                }
                if (!plan) { plan = seedPlans.find(p => p.code === 'starter'); }
                if (plan && plan.features && plan.features['Job Posting']) {
                    const jpFeature = String(plan.features['Job Posting']).toLowerCase();
                    if (jpFeature !== 'unlimited') {
                        const monthlyLimit = usage.parseMonthlyLimit(jpFeature);
                        if (monthlyLimit >= 0) {
                            recruiter.usage = recruiter.usage || {};
                            const posted = recruiter.usage.jobPostsThisCycle || 0;
                            console.log('[PLAN CHECK] Job Posting limit', { userId, used: posted, limit: monthlyLimit, feature: jpFeature });
                            if (posted >= monthlyLimit) {
                                return res.status(403).json({ error: 'Plan limit reached', message: 'You have reached your monthly job posting limit. Upgrade your plan to post more jobs.' });
                            }
                        }
                    }
                }
            }
        } catch (limitErr) {
            console.error('Plan limit check failed:', limitErr);
        }

        // Assign the user ID to the job posting
        jobPosting['user'] = userId;
        
        // Ensure datePosted is set to current date if not provided
        if (!jobPosting.datePosted) {
            jobPosting.datePosted = new Date();
        }

        // Create job posting in the database
        const status = await jobPostingModel.createJobPosting(jobPosting);

        // increment usage counter if plan exists
        try {
            const recruiter = await recruiterDetailModel.findRecruiterDetailByUserId(userId);
            if (recruiter) {
                usage.ensureCycle(recruiter);
                recruiter.usage = recruiter.usage || {};
                recruiter.usage.jobPostsThisCycle = (recruiter.usage.jobPostsThisCycle || 0) + 1;
                await recruiterDetailModel.updateRecruiterDetail(recruiter._id, { usage: recruiter.usage, usageCycleStart: recruiter.usageCycleStart });
            }
        } catch (incErr) {
            console.error('Failed to increment job posting usage:', incErr);
        }

        // Return success response
        res.json({
            status: 'success',
            jobPosting: status
        });

    } catch (error) {
        console.error('Job posting creation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create job posting',
            error: error.message || 'Internal server error'
        });
    }
}



async function findAllJobPostingByUserId(req, res) {
    try {
        if (req.session && req.session['user'] && req.session['user'].role !== 'JobSeeker') {
            const userId = req.session['user']._id;
            
            // Get all job postings for the user, sorted by creation date (most recent first)
            const jobPostings = await jobPostingModel.findJobPostingByUserId(userId);

            // Get application counts for all job postings
            const jobIds = jobPostings.map(job => job._id);
            const applicationCounts = await jobApplicationModel.countApplicationsPerJob(jobIds);

            // Create a map of job ID to application count
            const applicationCountMap = applicationCounts.reduce((map, item) => {
                map[item._id.toString()] = item.applicationCount;
                return map;
            }, {});

            // Combine job postings with their application counts
            const jobPostingsWithApplications = jobPostings.map(job => ({
                ...job.toObject(),  // Convert mongoose document to plain object
                applicationDetails: {
                    totalApplications: applicationCountMap[job._id.toString()] || 0
                }
            }));

            res.json(jobPostingsWithApplications);
        } else {
            res.status(401).send({ status: 'session expired' });
        }
    } catch (error) {
        console.error('Error fetching job postings with applications:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch job postings',
            error: error.message || 'Internal server error'
        });
    }
}


  function findJobPostingById(req, res) {
    const jobPostingId = req.params['jobPostingId'];
    jobPostingModel.findJobPostingById(jobPostingId)
        .then(function (jobPosting) {
            // Check if it's a crawler (LinkedIn, Facebook, etc.)
            const userAgent = req.headers['user-agent'];
            const isCrawler = /facebookexternalhit|LinkedInBot|TwitterBot|Googlebot/i.test(userAgent);

            if (isCrawler) {
                // Render an HTML page with Open Graph metadata
                res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta property="og:title" content="${jobPosting.title || 'HiyrNow Job Posting'}">
                        <meta property="og:description" content="${jobPosting.description || 'Find your next career opportunity on HiyrNow.'}">
                        <meta property="og:image" content="${jobPosting.imageUrl || 'https://hiyrnow.in/default-job-image.jpg'}">
                        <meta property="og:url" content="https://hiyrnow.in/job/${jobPostingId}">
                        <meta property="og:type" content="website">
                    </head>
                    <body>
                        <h1>${jobPosting.title || 'Job Posting'}</h1>
                        <p>${jobPosting.description || 'Details about this job are available on HiyrNow.'}</p>
                    </body>
                    </html>
                `);
            } else {
                // Default JSON response for API requests
                res.json(jobPosting);
            }
        })
        .catch(function (error) {
            res.status(500).send('Error fetching job posting');
        });
}


function findAllJobPostings(req, res) {
    try {
        // Extract query parameters for filtering and pagination
        const {
            page = 1,
            limit = 10,
            keyword = '',
            location = '',
            jobType = '',
            experienceLevel = '',
            salaryRange = '',
            remoteOption = '',
            sortBy = 'newest',
            minSalary,
            maxSalary,
            minExp,
            maxExp
        } = req.query;

        // Convert to numbers
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build filter object
        const filter = {};

        // Always filter for active job postings (case-insensitive — jobs are stored as 'active')
        filter.status = { $regex: /^active$/i };

        // Keyword search (title, description, company)
        if (keyword) {
            filter.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } },
                { company: { $regex: keyword, $options: 'i' } },
                { 'coreSkills.name': { $regex: keyword, $options: 'i' } }
            ];
        }

        // Location filter
        if (location) {
            filter.location = { $regex: location, $options: 'i' };
        }

        // Job type filter
        if (jobType) {
            const jobTypes = jobType.split(',').map(type => type.trim());
            if (jobTypes.length > 1) {
                filter.type = { $in: jobTypes.map(type => new RegExp(type, 'i')) };
            } else {
                filter.type = { $regex: jobType, $options: 'i' };
            }
        }

        // Experience level filter
        if (experienceLevel) {
            const experienceLevels = experienceLevel.split(',').map(level => level.trim());
            const experienceFilters = [];
            
            experienceLevels.forEach(level => {
                switch (level) {
                    case 'Entry Level':
                        experienceFilters.push({ minExp: { $lte: 1 } });
                        break;
                    case '1-3 years':
                        experienceFilters.push({ minExp: { $gte: 1, $lte: 3 } });
                        break;
                    case '3-5 years':
                        experienceFilters.push({ minExp: { $gte: 3, $lte: 5 } });
                        break;
                    case '5+ years':
                        experienceFilters.push({ minExp: { $gte: 5 } });
                        break;
                }
            });
            
            if (experienceFilters.length > 1) {
                filter.$or = experienceFilters;
            } else if (experienceFilters.length === 1) {
                Object.assign(filter, experienceFilters[0]);
            }
        }

        // Salary range filter
        if (salaryRange) {
            const salaryRanges = salaryRange.split(',').map(range => range.trim());
            const salaryFilters = [];
            
            salaryRanges.forEach(range => {
                switch (range) {
                    case '0-30k':
                        salaryFilters.push({ maxSalary: { $lte: 30000 } });
                        break;
                    case '30k-60k':
                        salaryFilters.push({ 
                            minSalary: { $gte: 30000 },
                            maxSalary: { $lte: 60000 }
                        });
                        break;
                    case '60k-90k':
                        salaryFilters.push({ 
                            minSalary: { $gte: 60000 },
                            maxSalary: { $lte: 90000 }
                        });
                        break;
                    case '90k+':
                        salaryFilters.push({ minSalary: { $gte: 90000 } });
                        break;
                }
            });
            
            if (salaryFilters.length > 1) {
                if (!filter.$or) filter.$or = [];
                filter.$or.push(...salaryFilters);
            } else if (salaryFilters.length === 1) {
                Object.assign(filter, salaryFilters[0]);
            }
        }

        // Remote option filter
        if (remoteOption) {
            const remoteOptions = remoteOption.split(',').map(option => option.trim());
            if (remoteOptions.length > 1) {
                filter.remoteOption = { $in: remoteOptions.map(option => new RegExp(option, 'i')) };
            } else {
                filter.remoteOption = { $regex: remoteOption, $options: 'i' };
            }
        }

        // Custom salary range
        if (minSalary) filter.minSalary = { $gte: parseInt(minSalary) };
        if (maxSalary) filter.maxSalary = { $lte: parseInt(maxSalary) };

        // Custom experience range
        if (minExp) filter.minExp = { $gte: parseInt(minExp) };
        if (maxExp) filter.maxExp = { $lte: parseInt(maxExp) };

        // Build sort object
        let sort = {};
        switch (sortBy) {
            case 'newest':
                // Sort by datePosted first, then by _id as fallback (newer ObjectIds are more recent)
                sort = { datePosted: -1, _id: -1 };
                break;
            case 'relevant':
                sort = { title: 1 };
                break;
            case 'salary-high':
                sort = { maxSalary: -1 };
                break;
            case 'salary-low':
                sort = { minSalary: 1 };
                break;
            default:
                // Sort by datePosted first, then by _id as fallback
                sort = { datePosted: -1, _id: -1 };
        }

        console.log('Sort object:', sort);
        console.log('Filter object:', filter);

        // Execute query with pagination
        Promise.all([
            jobPostingModel.findJobPostingsWithFilter(filter, sort, skip, limitNum),
            jobPostingModel.countJobPostingsWithFilter(filter)
        ]).then(([jobPostings, totalCount]) => {
            const totalPages = Math.ceil(totalCount / limitNum);
            
            // Additional debugging for date sorting
            if (sortBy === 'newest' && jobPostings.length > 0) {
                console.log('First job datePosted:', jobPostings[0].datePosted);
                console.log('Last job datePosted:', jobPostings[jobPostings.length - 1].datePosted);
            }
            
            res.json({
                jobs: jobPostings,
                pagination: {
                    currentPage: pageNum,
                    totalPages: totalPages,
                    totalJobs: totalCount,
                    jobsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                },
                filters: {
                    applied: Object.keys(filter).length > 0,
                    keyword,
                    location,
                    jobType,
                    experienceLevel,
                    salaryRange,
                    remoteOption
                }
            });
        }).catch(error => {
            console.error('Error fetching job postings:', error);
            res.status(500).json({
                error: 'Failed to fetch job postings',
                details: error.message
            });
        });

    } catch (error) {
        console.error('Error in findAllJobPostings:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
}


  function updateJobPosting(req, res) {
      var jobPosting = req.body;
      var jobPostingId = req.params['jobPostingId'];
      if (req.session && req.session['user'] && req.session['user'].role != 'JobSeeker') {
          jobPostingModel.updateJobPosting(jobPostingId, jobPosting)
              .then(function (status) {
                  res.send(status);
              });
      } else {
          res.send({status: 'session expired'});
      }
  }

  function deleteJobPosting(req, res) {
      if (req.session && req.session['user'] && req.session['user'].role != 'JobSeeker') {
          var id = req.params['jobPostingId'];
          jobPostingModel.deleteJobPosting(id).then(function (status) {
              res.send(status);
          })

      }
      else {
          res.send('session expired');
      }
  }



  async function matchUsersWithScore(req, res) {
    try {
        const jobPostingId = req.params['jobPostingId'];
        const user = req.session?.user;
        if (!user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const jobPosting = await jobPostingModel.findJobPostingById(jobPostingId);
        if (!jobPosting) {
            return res.status(404).json({ error: "Job posting not found" });
        }
        const isOwner = jobPosting.user.toString() === user._id.toString();
        const isAdmin = user.role === 'Admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: "Unauthorized access" });
        }
        // Fetch all job seekers who are open to jobs and have visible profiles
        const jobSeekers = await userModel.find({ role: "JobSeeker", openToJobs: true, profileVisible: true });
        const matchedUsers = await Promise.all(
            jobSeekers.map(async (user) => {
                let matchScore = {
                    skills: 0,
                    experience: 0,
                    education: 0,
                    location: 0,
                    salary: 0,
                    qualification: 0,
                    additionalFactors: 0
                };
                // --- Skills Matching (Most Important) ---
                const userSkills = await skillModel.findSkillByUserId(user._id).lean();
                const coreSkillNames = (jobPosting.coreSkills || []).map(skill => (skill.name || skill.skillName || skill).toLowerCase());
                const userSkillNames = userSkills.map(skill => skill.skillName.toLowerCase());
                const skillMatchPercentage = calculateSkillMatch(coreSkillNames, userSkillNames);
                matchScore.skills = calculateSkillScore(skillMatchPercentage); // up to 40
                // Bonus for skill level (if available)
                const highSkillLevel = userSkills.filter(skill => coreSkillNames.includes(skill.skillName.toLowerCase()) && (skill.skillLevel === 'Expert' || skill.skillLevel === 'Advanced')).length;
                if (highSkillLevel > 0) matchScore.skills += 5;
                // --- Experience Matching (Second Most Important) ---
                let userTotalExp = Number(user.totalExp) || 0;
                // Deep experience match: relevant job titles or companies
                const userExperiences = await experienceModel.findExperienceByUserId(user._id).lean();
                let relevantExperience = false;
                if (userExperiences && userExperiences.length > 0) {
                    relevantExperience = userExperiences.some(exp => {
                        return (
                            (jobPosting.position && exp.title && exp.title.toLowerCase().includes(jobPosting.position.toLowerCase())) ||
                            (jobPosting.company && exp.company && exp.company.toLowerCase() === jobPosting.company.toLowerCase())
                        );
                    });
                }
                if (userTotalExp >= jobPosting.minExp && userTotalExp <= jobPosting.maxExp) {
                    matchScore.experience = 25;
                } else {
                    matchScore.experience = calculateExperienceScore(userTotalExp, jobPosting.minExp, jobPosting.maxExp);
                }
                if (relevantExperience) matchScore.experience += 5;
                // --- Education Matching (Third Most Important) ---
                const userEducations = await educationModel.findEducationByUserId(user._id).lean();
                let relevantEducation = false;
                if (userEducations && userEducations.length > 0) {
                    relevantEducation = userEducations.some(edu => {
                        return (
                            (jobPosting.minQualification && edu.degree && edu.degree.toLowerCase() === jobPosting.minQualification.toLowerCase()) ||
                            (edu.fieldOfStudy && jobPosting.description && jobPosting.description.toLowerCase().includes(edu.fieldOfStudy.toLowerCase()))
                        );
                    });
                }
                if (user.qualification && jobPosting.minQualification && user.qualification === jobPosting.minQualification) {
                    matchScore.qualification = 10;
                }
                if (relevantEducation) matchScore.education = 10;
                // --- Project Matching (Bonus for relevant projects) ---
                const userProjects = await projectModel.findProjectByUserId(user._id).lean();
                let relevantProject = false;
                if (userProjects && userProjects.length > 0) {
                    relevantProject = userProjects.some(proj =>
                        proj.skillsUsed && proj.skillsUsed.some(skill => coreSkillNames.includes(skill.toLowerCase()))
                    );
                }
                if (relevantProject) matchScore.skills += 3;
                // --- Location Matching ---
                if (user.currentLocation === jobPosting.location) {
                    matchScore.location = 10;
                } else if (user.preferredLocation === jobPosting.location) {
                    matchScore.location = 7;
                }
                // --- Salary Matching ---
                if (user.currentCTC >= jobPosting.minSalary && user.currentCTC <= jobPosting.maxSalary) {
                    matchScore.salary = 7;
                } else {
                    matchScore.salary = calculateSalaryScore(user.currentCTC, jobPosting.minSalary, jobPosting.maxSalary) * 0.35; // scale down
                }
                // --- Additional Factors ---
                matchScore.additionalFactors = calculateAdditionalFactors(user, jobPosting);
                // --- Total Score (Skills > Experience > Education) ---
                // Skills: 40+5+3=48, Experience: 25+5=30, Education: 10, Qualification: 10, Location: 10, Salary: 7, Additional: 5
                const totalScore = matchScore.skills + matchScore.experience + matchScore.education + matchScore.qualification + matchScore.location + matchScore.salary + matchScore.additionalFactors;
                return {
                    user: {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        profilePicture: user.profilePicture,
                        skills: userSkillNames,
                        totalExp: userTotalExp,
                        education: userEducations.map(e => ({ degree: e.degree, fieldOfStudy: e.fieldOfStudy })),
                        projects: userProjects.map(p => ({ projectName: p.projectName, skillsUsed: p.skillsUsed }))
                    },
                    matchScoreBreakdown: matchScore,
                    totalScore: totalScore,
                    skillMatchPercentage: skillMatchPercentage
                };
            })
        );
        // Filter and Sort Matches
        const validMatches = matchedUsers
            .filter(match => match.totalScore > 0 && match.skillMatchPercentage > 0)
            .sort((a, b) => b.totalScore - a.totalScore);
        // Recommend Top Matches
        const topMatches = validMatches.slice(0, 10); // Top 10 matches
        res.json({
            totalMatchesFound: validMatches.length,
            topMatches: topMatches
        });
    } catch (err) {
        console.error("Error in matchUsersWithScore:", err.message);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
}

// Helper Functions
function calculateSkillMatch(jobSkills, userSkills) {
    const matchedSkills = userSkills.filter(skill => jobSkills.includes(skill));
    return (matchedSkills.length / jobSkills.length) * 100;
}

function calculateSkillScore(matchPercentage) {
    if (matchPercentage >= 80) return 40;
    if (matchPercentage >= 60) return 30;
    if (matchPercentage >= 40) return 20;
    if (matchPercentage >= 20) return 10;
    return 0;
}

function calculateExperienceScore(userExp, minExp, maxExp) {
    if (userExp < minExp) {
        // Partial score for slightly less experience
        return Math.max(0, 15 * (1 - (minExp - userExp) / minExp));
    }
    if (userExp > maxExp) {
        // Partial score for slightly more experience
        return Math.max(0, 15 * (1 - (userExp - maxExp) / userExp));
    }
    return 25; // Perfect match
}

function calculateSalaryScore(userSalary, minSalary, maxSalary) {
    if (userSalary >= minSalary && userSalary <= maxSalary) return 20;
    
    // Calculate partial score based on proximity to salary range
    const lowerOffset = Math.abs(userSalary - minSalary);
    const upperOffset = Math.abs(userSalary - maxSalary);
    const rangeSpread = maxSalary - minSalary;
    
    const proximityScore = Math.max(0, 20 * (1 - Math.min(lowerOffset, upperOffset) / rangeSpread));
    return proximityScore;
}

function calculateAdditionalFactors(user, jobPosting) {
    let additionalScore = 0;

    // Language matching
    if (user.languagesKnown && user.languagesKnown.length > 0) {
        additionalScore += 5;
    }

    // Job type preference
    if (user.preferredJobType === jobPosting.type) {
        additionalScore += 5;
    }

    // Notice period consideration
    if (user.noticePeriod && parseInt(user.noticePeriod) <= 90) {
        additionalScore += 5;
    }

    return additionalScore;
}

    // ... (existing code remains the same) ...

    // Add this new route after the existing routes
   

    async function getJobApplicationsCount(req, res) {
        try {
            // Check if user is logged in and is not a JobSeeker
            if (!req.session || !req.session['user'] || req.session['user'].role === 'JobSeeker') {
                return res.status(401).send({ status: 'session expired' });
            }
    
            const userId = req.session['user']._id;
    
            // First get all job postings by this user
            const userJobPostings = await jobPostingModel.findJobPostingByUserId(userId);

            if (!userJobPostings || userJobPostings.length === 0) {
                return res.json({
                    totalApplications: 0,
                    jobWiseCount: []
                });
            }
    
            // Extract job IDs
            const jobIds = userJobPostings.map(job => job._id);
    
            const jobWiseCount = await jobApplicationModel.countApplicationsPerJob(jobIds);

    
            // Convert aggregation result to match job details
            const jobCountMap = jobWiseCount.reduce((map, job) => {
                map[job._id.toString()] = job.applicationCount;
                return map;
            }, {});
    
            const formattedJobWiseCount = userJobPostings.map(job => ({
                jobId: job._id,
                jobTitle: job.title,
                applicationCount: jobCountMap[job._id.toString()] || 0 // Default to 0 if no applications
            }));
    
            // Calculate total applications
            const totalApplications = formattedJobWiseCount.reduce((sum, job) => sum + job.applicationCount, 0);
    
            res.json({
                totalApplications,
                jobWiseCount: formattedJobWiseCount
            });
    
        } catch (err) {
            console.error("Error occurred while getting application counts:", err);
            res.status(500).send({ error: err.message });
        }
    }
    
  async function analyzeJobUserMatch(req, res) {
    try {
      const { jobId, userId } = req.body;

      if (!jobId || !userId) {
        return res.status(400).json({ error: "Job ID and User ID are required" });
      }

      // Plan usage check for AI Profile Analysis
      const recruiterUserId = req.session["user"]._id; 
      const recruiter = await getOrCreateRecruiterWithPlan(recruiterUserId);
      if (recruiter) {
        usage.ensureCycle(recruiter);
        let plan = null;
        if (recruiter.plan) plan = await planModel.findPlanById(recruiter.plan);
        else plan = await planModel.findPlanByCode('starter');
        if (!plan) { plan = seedPlans.find(p => p.code === 'starter'); }
        const limit = usage.parseMonthlyLimit(plan?.features?.['AI Profile Analysis']);
        const used = recruiter.usage?.aiProfileAnalysisThisCycle || 0;
        console.log('[PLAN CHECK] AI Profile Analysis limit', { recruiterUserId, used, limit, feature: plan?.features?.['AI Profile Analysis'] });
        if (used >= limit) {
          return res.status(403).json({ error: 'Plan limit reached', message: 'AI Profile Analysis monthly limit reached.' });
        }
        recruiter.usage.aiProfileAnalysisThisCycle = used + 1;
        await recruiterDetailModel.updateRecruiterDetail(recruiter._id, { usage: recruiter.usage, usageCycleStart: recruiter.usageCycleStart });
      }

      // Check for existing analysis in DB
      const existing = await aiAnalysisResultModel.findByJobAndUser(jobId, userId);
      if (existing && existing.analysisData && (!existing.expiresAt || new Date(existing.expiresAt) > new Date())) {
        return res.json(existing.analysisData);
      }

            // Fetch job posting and user details
            const jobPosting = await jobPostingModel.findJobPostingById(jobId);
            const user = await userModel.findUserById(userId);
            const userSkills = await skillModel.findSkillByUserId(userId);

            if (!jobPosting || !user) {
                return res.status(404).json({ error: "Job posting or user not found" });
            }

            // Prepare data for Gemini
            const jobData = {
                title: jobPosting.title,
                description: jobPosting.description,
                location: jobPosting.location,
                type: jobPosting.type,
                minExp: jobPosting.minExp,
                maxExp: jobPosting.maxExp,
                minSalary: jobPosting.minSalary,
                maxSalary: jobPosting.maxSalary,
                minQualification: jobPosting.minQualification,
                coreSkills: (jobPosting.coreSkills || []).map(s => typeof s === 'string' ? s : s.name || s.skillName || ''),
                responsibilities: jobPosting.responsibilities
            };
            const userData = {
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                totalExp: user.totalExp,
                currentLocation: user.currentLocation,
                preferredLocation: user.preferredLocation,
                currentCTC: user.currentCTC,
                qualification: user.qualification,
                languagesKnown: user.languagesKnown,
                preferredJobType: user.preferredJobType,
                noticePeriod: user.noticePeriod,
                skills: userSkills.map(s => s.skillName)
            };

            // Compose prompt for Gemini
            const prompt = `You are an expert job matching AI. Analyze the following job description and user profile. Return a JSON with these fields:\n{\n  "matchScore": number (0-100, at least 70% accurate),\n  "strengths": [string],\n  "gaps": [string],\n  "summary": string (short summary of the match),\n  "recommendedAction": string (one of: 'Invite to interview', 'Request more info', 'Assign skill test', 'Reject', or a custom actionable suggestion for the recruiter)\n}\n\nJob Description:\n${JSON.stringify(jobData, null, 2)}\n\nUser Profile:\n${JSON.stringify(userData, null, 2)}\n\nInstructions:\n- Consider skills, experience, location, salary, and qualification.\n- Be strict but fair. If the user is a strong match, score 70+; if weak, score below 70.\n- List strengths (good matches) and gaps (missing requirements).\n- The summary should be clear and actionable.\n- Based on the match, recommend an action for the recruiter (see recommendedAction above).\n- Only return the JSON, no extra text.`;

            // Initialize Gemini
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            // Call Gemini
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();
            // Extract JSON from Gemini response
            let matchJson;
            try {
                const match = text.match(/\{[\s\S]*\}/);
                matchJson = match ? JSON.parse(match[0]) : null;
            } catch (e) {
                return res.status(500).json({ error: "Failed to parse Gemini response", details: text });
            }
            if (!matchJson) {
                return res.status(500).json({ error: "No valid JSON from Gemini", details: text });
            }
            // Store in DB for 60 days
            await aiAnalysisResultModel.createOrUpdate(jobId, userId, matchJson);
            res.json(matchJson);
        } catch (error) {
            console.error("Error in Gemini AI analysis:", error);
            res.status(500).json({ error: "Internal server error", details: error.message });
        }
    }

    async function performDetailedAnalysis(jobPosting, user, userSkills) {
        // Initialize analysis object
        const analysis = {
            overallScore: 0,
            strengths: [],
            gaps: [],
            assignments: [],
            confidence: 0,
            detailedBreakdown: {}
        };

        // Skill Analysis
        const skillAnalysis = analyzeSkills(jobPosting.coreSkills, userSkills);
        analysis.detailedBreakdown.skills = skillAnalysis;
        analysis.strengths.push(...skillAnalysis.matchingSkills);
        analysis.gaps.push(...skillAnalysis.missingSkills);

        // Experience Analysis
        const experienceAnalysis = analyzeExperience(user.totalExp, jobPosting.minExp, jobPosting.maxExp);
        analysis.detailedBreakdown.experience = experienceAnalysis;
        if (experienceAnalysis.isMatch) {
            analysis.strengths.push("Experience matches job requirements");
        } else {
            analysis.gaps.push(experienceAnalysis.gap);
        }

        // Location Analysis
        const locationAnalysis = analyzeLocation(user.currentLocation, user.preferredLocation, jobPosting.location);
        analysis.detailedBreakdown.location = locationAnalysis;
        if (locationAnalysis.isMatch) {
            analysis.strengths.push("Location matches job requirements");
        } else {
            analysis.gaps.push(locationAnalysis.gap);
        }

        // Salary Analysis
        const salaryAnalysis = analyzeSalary(user.currentCTC, jobPosting.minSalary, jobPosting.maxSalary);
        analysis.detailedBreakdown.salary = salaryAnalysis;
        if (salaryAnalysis.isMatch) {
            analysis.strengths.push("Salary expectations align with job offering");
        } else {
            analysis.gaps.push(salaryAnalysis.gap);
        }

        // Qualification Analysis
        const qualificationAnalysis = analyzeQualification(user.qualification, jobPosting.minQualification);
        analysis.detailedBreakdown.qualification = qualificationAnalysis;
        if (qualificationAnalysis.isMatch) {
            analysis.strengths.push("Qualification meets job requirements");
        } else {
            analysis.gaps.push(qualificationAnalysis.gap);
        }

        // Calculate overall score
        analysis.overallScore = calculateOverallScore(analysis.detailedBreakdown);

        // Generate assignments based on gaps
        analysis.assignments = generateAssignments(analysis.gaps);

        // Calculate confidence score
        analysis.confidence = calculateConfidenceScore(analysis);

        return analysis;
    }

    function analyzeSkills(jobSkills, userSkills) {
        const jobSkillNames = jobSkills.map(skill => skill.name.toLowerCase());
        const userSkillNames = userSkills.map(skill => skill.skillName.toLowerCase());
        
        const matchingSkills = userSkillNames.filter(skill => jobSkillNames.includes(skill));
        const missingSkills = jobSkillNames.filter(skill => !userSkillNames.includes(skill));

        return {
            matchingSkills,
            missingSkills,
            matchPercentage: (matchingSkills.length / jobSkillNames.length) * 100
        };
    }

    function analyzeExperience(userExp, minExp, maxExp) {
        const isMatch = userExp >= minExp && userExp <= maxExp;
        return {
            isMatch,
            gap: isMatch ? null : `Experience ${userExp < minExp ? 'below' : 'above'} required range (${minExp}-${maxExp} years)`
        };
    }

    function analyzeLocation(userCurrentLocation, userPreferredLocation, jobLocation) {
        const isMatch = userCurrentLocation === jobLocation || userPreferredLocation === jobLocation;
        return {
            isMatch,
            gap: isMatch ? null : `Location mismatch: Job in ${jobLocation}, User in ${userCurrentLocation}`
        };
    }

    function analyzeSalary(userSalary, minSalary, maxSalary) {
        const isMatch = userSalary >= minSalary && userSalary <= maxSalary;
        return {
            isMatch,
            gap: isMatch ? null : `Salary expectations ${userSalary < minSalary ? 'below' : 'above'} job offering range`
        };
    }

    function analyzeQualification(userQualification, requiredQualification) {
        const isMatch = userQualification === requiredQualification;
        return {
            isMatch,
            gap: isMatch ? null : `Qualification mismatch: Required ${requiredQualification}, User has ${userQualification}`
        };
    }

    function calculateOverallScore(breakdown) {
        let score = 0;
        
        // Skills weight: 40%
        score += (breakdown.skills.matchPercentage * 0.4);
        
        // Experience weight: 20%
        score += (breakdown.experience.isMatch ? 20 : 0);
        
        // Location weight: 15%
        score += (breakdown.location.isMatch ? 15 : 0);
        
        // Salary weight: 15%
        score += (breakdown.salary.isMatch ? 15 : 0);
        
        // Qualification weight: 10%
        score += (breakdown.qualification.isMatch ? 10 : 0);
        
        return Math.round(score);
    }

    function generateAssignments(gaps) {
        return gaps.map(gap => ({
            type: gap.includes('Skills') ? 'skill_development' :
                  gap.includes('Experience') ? 'experience_gain' :
                  gap.includes('Location') ? 'relocation_consideration' :
                  gap.includes('Salary') ? 'salary_negotiation' :
                  gap.includes('Qualification') ? 'qualification_upgrade' : 'other',
            description: gap,
            priority: gap.includes('Skills') || gap.includes('Experience') ? 'high' : 'medium'
        }));
    }

    function calculateConfidenceScore(analysis) {
        // Base confidence on number of strengths vs gaps
        const strengthWeight = analysis.strengths.length * 10;
        const gapWeight = analysis.gaps.length * 5;
        const baseConfidence = Math.min(100, strengthWeight - gapWeight);
        
        // Adjust confidence based on overall score
        const scoreAdjustment = analysis.overallScore * 0.5;
        
        return Math.min(100, Math.max(0, baseConfidence + scoreAdjustment));
    }

    // Utility function to fix job postings with missing datePosted
    async function fixJobPostingDates(req, res) {
        try {
            // Check if user is admin
            if (!req.session || !req.session['user'] || req.session['user'].role !== 'Admin') {
                return res.status(401).json({ error: 'Unauthorized - Admin access required' });
            }

            // Find all job postings without datePosted
            const jobPostingsWithoutDate = await jobPostingModel.find({ 
                $or: [
                    { datePosted: { $exists: false } },
                    { datePosted: null }
                ]
            });

            console.log(`Found ${jobPostingsWithoutDate.length} job postings without datePosted`);

            // Update each job posting with a default date
            const updatePromises = jobPostingsWithoutDate.map(job => {
                return jobPostingModel.updateJobPosting(job._id, {
                    ...job.toObject(),
                    datePosted: new Date()
                });
            });

            await Promise.all(updatePromises);

            res.json({
                message: `Updated ${jobPostingsWithoutDate.length} job postings with datePosted`,
                updatedCount: jobPostingsWithoutDate.length
            });

        } catch (error) {
            console.error('Error fixing job posting dates:', error);
            res.status(500).json({
                error: 'Failed to fix job posting dates',
                details: error.message
            });
        }
    }

    // AI-powered job posting functions
    async function generateAIJobDescription(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role === 'JobSeeker') {
                return res.status(401).json({ error: 'Unauthorized' });
            }

        // Usage check for AI JD Generator
        try {
            const userId = req.session['user']._id;
            const recruiter = await getOrCreateRecruiterWithPlan(userId);
            if (recruiter) {
                usage.ensureCycle(recruiter);
                let plan = null;
                if (recruiter.plan) plan = await planModel.findPlanById(recruiter.plan);
                else plan = await planModel.findPlanByCode('starter');
                if (!plan) { plan = seedPlans.find(p => p.code === 'starter'); }
                const limit = usage.parseMonthlyLimit(plan?.features?.['AI JD Generator']);
                const used = recruiter.usage?.aiJdThisCycle || 0;
                console.log('[PLAN CHECK] AI JD limit', { userId, used, limit, feature: plan?.features?.['AI JD Generator'] });
                if (used >= limit) {
                    return res.status(403).json({ error: 'Plan limit reached', message: 'AI JD Generator monthly limit reached.' });
                }
                recruiter.usage.aiJdThisCycle = used + 1;
                await recruiterDetailModel.updateRecruiterDetail(recruiter._id, { usage: recruiter.usage, usageCycleStart: recruiter.usageCycleStart });
            }
        } catch (e) { console.error('AI JD usage check failed', e); }

            const {
                jobTitle,
                company,
                location,
                jobType,
                minExp,
                maxExp,
                minSalary,
                maxSalary,
                minQualification,
                industry,
                additionalContext
            } = req.body;

            // AFTER
if (!jobTitle || !company || !location || !jobType || minExp == null || maxExp == null || !minQualification) {
    return res.status(400).json({ error: 'Missing required fields' });
}

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `Create a comprehensive job posting for the following position. Return a JSON object with the following structure:
            {
                "title": "${jobTitle}",
                "locationType": "On-site",
                "location": "${location}",
                "jobType": "${jobType}",
                "minExp": ${minExp},
                "maxExp": ${maxExp},
                "minQualification": ${minQualification},
                "minSalary": ${minSalary || null},
                "maxSalary": ${maxSalary || null},
                "description": "Detailed job description (2-3 paragraphs)",
                "responsibilities": ["Responsibility 1", "Responsibility 2", ...],
                "requirements": ["Requirement 1", "Requirement 2", ...],
                "skills": [
                    {"name": "Skill Name", "mustHave": true/false, "niceToHave": true/false}
                ],
                "benefits": ["Benefit 1", "Benefit 2", ...],
                "summary": "Brief 2-3 sentence summary",
                "customQuestions": [
                    {
                        "question": "Question text here",
                        "answerType": "Short Answer",
                        "options": [],
                        "required": true
                    },
                    {
                        "question": "Question text here",
                        "answerType": "Multiple Choice",
                        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                        "required": false
                    },
                    {
                        "question": "Question text here",
                        "answerType": "Paragraph",
                        "options": [],
                        "required": true
                    }
                ]
            }

            Job Details:
            - Title: ${jobTitle}
            - Company: ${company}
            - Location: ${location}
            - Job Type: ${jobType}
            - Experience: ${minExp}-${maxExp} years 
            - Salary: ${minSalary ? `$${minSalary}` : 'Not specified'} - ${maxSalary ? `$${maxSalary}` : 'Not specified'}
            - Qualification: ${minQualification}
            - Industry: ${industry || 'Technology'}
            - Additional Context: ${additionalContext || 'None'}

            Guidelines:
            - Make the description engaging and professional
            - Include 5-8 responsibilities
            - Include 4-6 requirements
            - Include 6-10 skills (mix of must-have and nice-to-have)
            - Include 3-5 benefits
            - Use industry-standard terminology
            - Make it inclusive and appealing to diverse candidates

            Return only the JSON object, no additional text.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return res.status(500).json({ error: 'Failed to generate job description' });
            }

            const jobData = JSON.parse(jsonMatch[0]);
            res.json(jobData);

        } catch (error) {
            console.error('Error generating AI job description:', error);
            res.status(500).json({ error: 'Failed to generate job description', details: error.message });
        }
    }

    async function enhanceJobDescription(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role === 'JobSeeker') {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { currentDescription, jobTitle, company, enhancementType } = req.body;

            if (!currentDescription || !jobTitle || !company || !enhancementType) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            let enhancementInstruction = '';
            switch (enhancementType) {
                case 'improve':
                    enhancementInstruction = 'Improve the job description to be more engaging, clear, and professional while maintaining the same information.';
                    break;
                case 'expand':
                    enhancementInstruction = 'Expand the job description with more details, responsibilities, and requirements while keeping the existing content.';
                    break;
                case 'simplify':
                    enhancementInstruction = 'Simplify the job description to be more concise and easy to understand while keeping all essential information.';
                    break;
                case 'professional':
                    enhancementInstruction = 'Make the job description more professional and formal while maintaining clarity and engagement.';
                    break;
                default:
                    enhancementInstruction = 'Improve the job description to be more engaging and professional.';
            }

            const prompt = `Enhance the following job description according to this instruction: "${enhancementInstruction}"

            Job Title: ${jobTitle}
            Company: ${company}
            Current Description: ${currentDescription}

            Return only the enhanced description as plain text, no JSON or additional formatting.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const enhancedDescription = response.text().trim();

            res.json({ description: enhancedDescription });

        } catch (error) {
            console.error('Error enhancing job description:', error);
            res.status(500).json({ error: 'Failed to enhance job description', details: error.message });
        }
    }

    async function generateSkills(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role === 'JobSeeker') {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { jobTitle, description } = req.body;

            if (!jobTitle || !description) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `Based on the following job title and description, generate a list of relevant skills. Return a JSON array of skill names as strings.

            Job Title: ${jobTitle}
            Description: ${description}

            Guidelines:
            - Include technical skills, soft skills, and tools
            - Focus on skills that are commonly required for this role
            - Include both specific technologies and general competencies
            - Return 8-15 relevant skills

            Return only the JSON array, no additional text.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON array from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return res.status(500).json({ error: 'Failed to generate skills' });
            }

            const skills = JSON.parse(jsonMatch[0]);
            res.json({ skills });

        } catch (error) {
            console.error('Error generating skills:', error);
            res.status(500).json({ error: 'Failed to generate skills', details: error.message });
        }
    }

    async function generateJobTitles(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role === 'JobSeeker') {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { company, context } = req.body;

            if (!company || !context) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `Based on the following company and context, suggest relevant job titles. Return a JSON array of job title strings.

            Company: ${company}
            Context: ${context}

            Guidelines:
            - Suggest 5-8 relevant job titles
            - Include different seniority levels (Junior, Mid-level, Senior, Lead, etc.)
            - Make titles specific to the context
            - Use industry-standard job titles

            Return only the JSON array, no additional text.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON array from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return res.status(500).json({ error: 'Failed to generate job titles' });
            }

            const titles = JSON.parse(jsonMatch[0]);
            res.json({ titles });

        } catch (error) {
            console.error('Error generating job titles:', error);
            res.status(500).json({ error: 'Failed to generate job titles', details: error.message });
        }
    }

  async function analyzeJobPosting(req, res) {
    try {
      if (!req.session || !req.session['user'] || req.session['user'].role === 'JobSeeker') {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const jobData = req.body;

      if (!jobData) {
        return res.status(400).json({ error: 'Missing job data' });
      }

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `Analyze the following job posting data and provide feedback. Return a JSON object with:
            {
                "completeness": number (0-100),
                "suggestions": ["suggestion1", "suggestion2", ...],
                "missingFields": ["field1", "field2", ...]
            }

            Job Data: ${JSON.stringify(jobData, null, 2)}

            Guidelines:
            - Calculate completeness based on required fields and content quality
            - Provide 3-5 actionable suggestions for improvement
            - List any missing important fields
            - Consider job title, description, requirements, skills, salary, location, etc.

            Return only the JSON object, no additional text.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return res.status(500).json({ error: 'Failed to analyze job posting' });
            }

            const analysis = JSON.parse(jsonMatch[0]);
            res.json(analysis);

        } catch (error) {
            console.error('Error analyzing job posting:', error);
            res.status(500).json({ error: 'Failed to analyze job posting', details: error.message });
        }
    }

    async function generateCustomQuestions(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role === 'JobSeeker') {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { jobTitle, description } = req.body;

            if (!jobTitle || !description) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `Based on the following job title and description, generate 3 relevant custom questions for job applicants. Return a JSON array of question objects.

            Job Title: ${jobTitle}
            Description: ${description}

            Guidelines:
            - Generate 3 questions that help assess candidate fit and skills
            - Mix different question types: behavioral, technical, and situational
            - Make questions specific to the role and industry
            - Questions should be relevant and professional

            Return a JSON array with this structure:
            [
                {
                    "question": "Question text here",
                    "answerType": "Short Answer",
                    "options": [],
                    "required": true
                },
                {
                    "question": "Question text here",
                    "answerType": "Multiple Choice",
                    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                    "required": false
                },
                {
                    "question": "Question text here",
                    "answerType": "Long Answer",
                    "options": [],
                    "required": true
                }
            ]

            Return only the JSON array, no additional text.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON array from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return res.status(500).json({ error: 'Failed to generate custom questions' });
            }

            const questions = JSON.parse(jsonMatch[0]);
            res.json({ questions });

        } catch (error) {
            console.error('Error generating custom questions:', error);
            res.status(500).json({ error: 'Failed to generate custom questions', details: error.message });
        }
    }
};
  
  
  
