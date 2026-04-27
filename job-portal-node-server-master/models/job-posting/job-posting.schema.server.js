var mongoose = require('mongoose');
var jobPostingSchema = mongoose.Schema({
    title: String,
    datePosted : Date,
    status : String,
    location: String,
    position: String,
    type: String,
    startDate: Date,
    endDate: Date,
    minExp:Number,
    maxExp:Number,
    minWorkExperience: Number,  // Added this
    maxWorkExperience: Number,  // Added this
    minSalary:Number,
    maxSalary:Number,
    minAnnualSalary: Number,  // Added this
    maxAnnualSalary: Number,  // Added this
    skillsRequired: [String],
    responsibilities: String,
    minQualification: String,
    jobSource: String,  // check to differentiate between git hub and job-portal job postings
    company : String,
    description:String,
    coreSkills:[],
    company_logo:String,
    user : {type: mongoose.Schema.Types.ObjectId, ref: 'UserModel'}, // recruiter who posted it
    // Add custom questions for applicants
    customQuestions: [
        {
            question: String,
            answerType: String,
            options: [String], // Only for Multiple Choice
            required: Boolean
        }
    ]
}, {collection: 'JobPosting'});

module.exports = jobPostingSchema;
