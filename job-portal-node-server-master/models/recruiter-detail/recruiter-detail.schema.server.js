var mongoose = require('mongoose');
var recruiterDetailSchema = mongoose.Schema({
    title: String,
    firstName: String, // Recruiter's first name
    lastName: String, // Recruiter's last name
    company: String,
    companyWebsite: String,
    industry: String,
    location: String,
    aboutCompany: String,
    companyMission: String,
    coreValues: String,
    employeeBenefits: String,
    numberOfEmployees: String,
    yearEstablished: String,
    companyType: String,
    address: String,
    productsServices: [String],
    socialMedia: [{ icon: String, url: String }],
    teamMembers: [String],

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel' },
    // Plan management fields
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'PricingPlanModel' },
    planStartDate: { type: Date },
    planEndDate: { type: Date },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    isCustomPlan: { type: Boolean, default: false },
    // Referral system fields
    referralCodeUsed: { type: String, default: null },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralModel' }
}, { collection: 'RecruiterDetail' });

// Usage counters and monthly cycle reset fields
recruiterDetailSchema.add({
    usageCycleStart: { type: Date },
    usage: {
        jobPostsThisCycle: { type: Number, default: 0 },
        aiJdThisCycle: { type: Number, default: 0 },
        aiProfileAnalysisThisCycle: { type: Number, default: 0 },
        jobBoostsThisCycle: { type: Number, default: 0 },
        candidateProfileCredits : {type: Number,default:0}
    }
});


module.exports = recruiterDetailSchema;
