const mongoose = require('mongoose');
const dashboardSchema = require('./dashboard.schema.server');
const dashboardModel = mongoose.model('DashboardModel', dashboardSchema);

module.exports = {
    findDashboardByUserId,
    createDashboard,
    updateDashboard,
    updateIntegrationStatus,
    calculateAndUpdateMetrics,
    updateLinkedInProfile,
    storeVideoConferenceTokens,
    storeVerifiedDocuments
};
// In dashboard.model.server.js
async function updateLinkedInProfile(userId, linkedInData) {
    // Implementation
    console.log("updateLinkedInProfile", userId, linkedInData);
        }

async function storeVideoConferenceTokens(userId, platform, tokens) {
    // Implementation
    console.log("storeVideoConferenceTokens", userId, platform, tokens);
}

async function storeVerifiedDocuments(userId, documents) {
    // Implementation
    console.log("storeVerifiedDocuments", userId, documents);
}

async function findDashboardByUserId(userId) {
    return await dashboardModel.findOne({ user: userId });
}

async function createDashboard(userId) {
    const defaultDashboard = {
        user: userId,
        analyticsData: {
            monthlyApplications: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                data: [0, 0, 0, 0, 0, 0]
            }
        }
    };
    return await dashboardModel.create(defaultDashboard);
}

async function updateDashboard(userId, dashboardData) {
    return await dashboardModel.findOneAndUpdate(
        { user: userId },
        { 
            $set: {
                analyticsData: dashboardData,
                lastUpdated: Date.now()
            }
        },
        { new: true, upsert: true }
    );
}

async function updateIntegrationStatus(userId, integrationType, status) {
    const update = {};
    update[`integrations.${integrationType}`] = status;

    return await dashboardModel.findOneAndUpdate(
        { user: userId },
        { 
            $set: update,
            lastUpdated: Date.now()
        },
        { new: true, useFindAndModify: false, upsert: true }
    );
}


async function calculateAndUpdateMetrics(userId, jobApplications, interviews) {
    // Calculate application stats
    const applicationStats = {
        total: jobApplications.length,
        successful: jobApplications.filter(app => app.status === 'accepted').length,
        rejected: jobApplications.filter(app => app.status === 'rejected').length,
        pending: jobApplications.filter(app => app.status === 'pending').length,
    };
    applicationStats.successRate = applicationStats.total > 0 
        ? (applicationStats.successful / applicationStats.total) * 100 
        : 0;

    // Calculate interview metrics
    const interviewMetrics = {
        total: interviews.length,
        completed: interviews.filter(int => int.status === 'completed').length,
        upcoming: interviews.filter(int => int.status === 'scheduled').length,
        averageScore: calculateAverageInterviewScore(interviews)
    };

    // Calculate monthly applications
    const monthlyApplications = calculateMonthlyApplications(jobApplications);

    // Calculate job categories distribution
    const jobCategories = calculateJobCategories(jobApplications);

    return await updateDashboard(userId, {
        applicationStats,
        interviewMetrics,
        jobCategories,
        monthlyApplications
    });
}

function calculateAverageInterviewScore(interviews) {
    const completedInterviews = interviews.filter(int => int.status === 'completed' && int.score);
    if (completedInterviews.length === 0) return 0;
    
    const totalScore = completedInterviews.reduce((sum, int) => sum + int.score, 0);
    return totalScore / completedInterviews.length;
}

function calculateMonthlyApplications(applications) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = new Array(12).fill(0);

    applications.forEach(app => {
        const month = new Date(app.dateApplied).getMonth();
        monthlyData[month]++;
    });

    return {
        labels: months,
        data: monthlyData
    };
}

function calculateJobCategories(applications) {
    const categories = {
        frontend: 0,
        backend: 0,
        fullstack: 0,
        devops: 0,
        other: 0
    };

    applications.forEach(app => {
        const title = (app.title || '').toLowerCase();
        if (title.includes('frontend') || title.includes('front-end')) {
            categories.frontend++;
        } else if (title.includes('backend') || title.includes('back-end')) {
            categories.backend++;
        } else if (title.includes('fullstack') || title.includes('full-stack')) {
            categories.fullstack++;
        } else if (title.includes('devops')) {
            categories.devops++;
        } else {
            categories.other++;
        }
    });

    return categories;
} 