var mongoose = require('mongoose');

var commentSchema = new mongoose.Schema({
    text: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel' },
    createdAt: { type: Date, default: Date.now }
});

var assignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    pdfLink: String,
    sentDate: { type: Date, required: true },
    deadline: { type: Date, required: true },
    deadlineDays: { type: Number, required: true },
    status: { type: String, default: 'sent' },
    submissionDate: Date,
    submissionLink: String
});

// New interview details schema
var interviewSchema = new mongoose.Schema({
    startDateTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // in minutes
    meetLink: { type: String, required: true },
    jobTitle: { type: String, required: true },
    applicantName: { type: String, required: true },
    applicantEmail: { type: String, required: true },
    interviewerEmail: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'], default: 'scheduled' },
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    rescheduledFrom: Date // If interview was rescheduled, store original date
});

// Custom question and answer schema
var customQuestionAnswerSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answerType: { 
        type: String, 
        enum: ['Short Answer', 'Paragraph', 'Yes/No', 'Multiple Choice'], 
        required: true 
    },
    required: { type: Boolean, default: false },
    options: [String], // For multiple choice questions
    answer: { type: String, required: true },
    answeredAt: { type: Date, default: Date.now }
});

var jobApplicationSchema = mongoose.Schema({
    dateApplied: { type: Date, default: Date.now },
    status: { type: String, default: 'applied' },
    jobSource: String,
    gitHubJobId: String,
    location: String,
    company: String,
    title: String,
    type: String,
    PVC: Boolean,
    coverLetter: String,
    customQuestions: [customQuestionAnswerSchema], // Store custom questions and answers
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel' },
    jobPosting: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPostingModel' },
    comments: [commentSchema],
    assignment: assignmentSchema,
    interviews: [interviewSchema] // Allow multiple interviews to be stored
}, { collection: 'JobApplication' });

// Add timestamps to automatically track when documents are created and modified
jobApplicationSchema.set('timestamps', true);

// Add indexes for better query performance
jobApplicationSchema.index({ user: 1, dateApplied: -1 });
jobApplicationSchema.index({ jobPosting: 1 });
jobApplicationSchema.index({ status: 1 });
jobApplicationSchema.index({ 'customQuestions.question': 'text' }); // Text search on questions

module.exports = jobApplicationSchema;