const mongoose = require('mongoose');

const dashboardSchema = mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'UserModel',
        required: true 
    },
    analyticsData: {
        applicationStats: {
            total: { type: Number, default: 0 },
            successful: { type: Number, default: 0 },
            rejected: { type: Number, default: 0 },
            pending: { type: Number, default: 0 },
            successRate: { type: Number, default: 0 }
        },
        interviewMetrics: {
            total: { type: Number, default: 0 },
            completed: { type: Number, default: 0 },
            upcoming: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 }
        },
        jobCategories: {
            frontend: { type: Number, default: 0 },
            backend: { type: Number, default: 0 },
            fullstack: { type: Number, default: 0 },
            devops: { type: Number, default: 0 },
            other: { type: Number, default: 0 }
        },
        monthlyApplications: {
            labels: [String],
            data: [Number]
        }
    },
    integrations: {
        linkedin: { type: Boolean, default: false },
        calendar: { type: Boolean, default: false },
        videoConference: { type: Boolean, default: false },
        documents: { type: Boolean, default: false }
    },
    lastUpdated: { 
        type: Date, 
        default: Date.now 
    }
}, { collection: 'Dashboard' });

module.exports = dashboardSchema;