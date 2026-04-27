var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    username: String,
    password: String,
    firstName: String,
    lastName: String,
    email: String,
    googleId: { type: String, unique: true, sparse: true },
    phone: String,
    tagline: String,
    totalExp: String,
    imageUrl: String,
    role: String, // role : Admin, JobSeeker, Recruiter
    requestStatus: String, // status types: 'Pending' && 'Verified'
    premiumRequestStatus: String, // status types: 'Pending' && 'Verified'
    socialContact: [{ socialtype: String, url: String }],
    // recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruiterDetailModel' },
    // experience: { type: mongoose.Schema.Types.ObjectId, ref: 'ExperienceModel' },
    // education: { type: mongoose.Schema.Types.ObjectId, ref: 'EducationModel' },
    // skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SkillModel' }],
    // projects: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    // extraCurricular: { type: mongoose.Schema.Types.ObjectId, ref: 'ExtraCurricularModel' },
    // awards: { type: mongoose.Schema.Types.ObjectId, ref: 'AwardModel' },
    // certificates: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateModel' },
    gstNumber: String,
    profilePicture: String,
    dateOfBirth: Date, // Added date of birth
    gender: String, // Added gender
    maritalStatus: String, // Added marital status
    languagesKnown: [String], // Added languages known
    currentLocation: String, // Added current location
    currentCountry: String, // Added current country
    currentState: String, // Added current state
    currentCity: String, // Added current city
    preferredLocation: String, // Added preferred location
    preferredCountry: String, // Added current country
    currentCTC: Number, // Added current CTC
    preferredCTC: Number, // Added preferred CTC
    minSalary: Number, // Added minimum salary
    maxSalary: Number, // Added maximum salary
    preferredJobType: String, // Added preferred job type
    preferredJobTypes: [String], // Added preferred job types array
    preferredJobs: [String], // Added preferred jobs
    noticePeriod: String, // Added notice period
    PVC: Boolean,
    openToJobs: Boolean,
    coverPhotoUrl: { type: String, default: '' },
coverPhotoKey: { type: String, default: '' },
    // AI and notification preferences
    aiMatchingIntensity: { type: String, enum: ['low', 'balanced', 'high'], default: 'balanced' },
    allowAIRecommendations: { type: Boolean, default: true },
    allowEmailNotifications: { type: Boolean, default: true },
    // Job preference flags
    preferFullTime: { type: Boolean, default: true },
    preferPartTime: { type: Boolean, default: false },
    preferRemote: { type: Boolean, default: false },
    preferHybrid: { type: Boolean, default: false },
    preferOnSite: { type: Boolean, default: false },
    preferContract: { type: Boolean, default: false },
    // Professional information
    professionalSummary: String,
    profileVisible: { type: Boolean, default: true },
    // Social media links
    linkedin: String,
    github: String,
    twitter: String,
    portfolio: String,
    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // Recruiter specific fields
    companyType: String,
    industry: String,
    website: String,
    accountCreatedAt: { 
        type: Date, 
        default: Date.now 
    },
    otp: {
        type: String,
        required: false
    },
    otpExpiry: {
        type: Date,
        required: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting' }]
}, { collection: 'User' });

module.exports = userSchema;
