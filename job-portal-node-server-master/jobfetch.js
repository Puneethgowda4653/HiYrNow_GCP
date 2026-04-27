const axios = require('axios');
const mongoose = require('mongoose');

// Your schema
const jobPostingSchema = mongoose.Schema({
    title: String,
    datePosted: Date,
    status: String,
    location: String,
    position: String,
    type: String,
    startDate: Date,
    endDate: Date,
    minExp: Number,
    maxExp: Number,
    minWorkExperience: Number,
    maxWorkExperience: Number,
    minSalary: Number,
    maxSalary: Number,
    minAnnualSalary: Number,
    maxAnnualSalary: Number,
    skillsRequired: [String],
    responsibilities: String,
    minQualification: String,
    jobSource: String,
    company: String,
    description: String,
    coreSkills: [],
    company_logo: String,
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'UserModel'},
    customQuestions: [
        {
            question: String,
            answerType: String,
            options: [String],
            required: Boolean
        }
    ]
}, {collection: 'JobPosting'});

const JobPosting = mongoose.model('JobPosting', jobPostingSchema);

// Function to extract skills from job description
function extractSkills(description, title) {
    const commonSkills = [
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'MongoDB', 
        'SQL', 'AWS', 'Docker', 'Kubernetes', 'Git', 'REST API',
        'TypeScript', 'Angular', 'Vue.js', 'Express', 'Django', 'Flask',
        'PostgreSQL', 'MySQL', 'Redis', 'Jenkins', 'CI/CD', 'Agile',
        'HTML', 'CSS', 'GraphQL', 'Microservices', 'Linux', 'Azure',
        'Machine Learning', 'AI', 'TensorFlow', 'PyTorch', 'C++', 'C#',
        '.NET', 'Spring Boot', 'Hibernate', 'JUnit', 'Selenium'
    ];
    
    const text = `${description} ${title}`.toLowerCase();
    return commonSkills.filter(skill => 
        text.includes(skill.toLowerCase())
    );
}


// Function to extract experience from description
function extractExperience(description) {
    const expMatch = description.match(/(\d+)[\s-]+(\d+)?\s*(?:years?|yrs?)/i);
    if (expMatch) {
        return {
            min: parseInt(expMatch[1]),
            max: expMatch[2] ? parseInt(expMatch[2]) : parseInt(expMatch[1]) + 2
        };
    }
    return { min: 0, max: 3 };
}

// Function to extract salary from description
function extractSalary(description) {
    const salaryMatch = description.match(/\$?(\d+)k?\s*-\s*\$?(\d+)k/i);
    if (salaryMatch) {
        return {
            min: parseInt(salaryMatch[1]) * 1000,
            max: parseInt(salaryMatch[2]) * 1000
        };
    }
    return { min: 50000, max: 100000 };
}

// Fetch jobs from Remotive API (free, no API key required)
async function fetchRemotiveJobs() {
    try {
        const response = await axios.get('https://remotive.com/api/remote-jobs?limit=50');
        return response.data.jobs;
    } catch (error) {
        console.error('Error fetching Remotive jobs:', error.message);
        return [];
    }
}

// Fetch jobs from GitHub Jobs alternative - Arbeitnow
async function fetchArbeitnowJobs() {
    try {
        const response = await axios.get('https://www.arbeitnow.com/api/job-board-api');
        return response.data.data;
    } catch (error) {
        console.error('Error fetching Arbeitnow jobs:', error.message);
        return [];
    }
}

// Format job data to match your schema
function formatJobData(job, source) {
    const description = job.description || job.job_description || '';
    const title = job.title || job.job_title || '';
    const skills = extractSkills(description, title);
    const experience = extractExperience(description);
    const salary = extractSalary(description);
    
    return {
        title: title,
        datePosted: new Date(job.publication_date || job.created_at || Date.now()),
        status: 'active',
        location: job.candidate_required_location || job.location || 'Remote',
        position: title,
        type: job.job_type || 'Full-time',
        startDate: new Date(),
        endDate: null,
        minExp: experience.min,
        maxExp: experience.max,
        minWorkExperience: experience.min,
        maxWorkExperience: experience.max,
        minSalary: salary.min,
        maxSalary: salary.max,
        minAnnualSalary: salary.min,
        maxAnnualSalary: salary.max,
        skillsRequired: skills,
        responsibilities: description.substring(0, 500),
        minQualification: "Bachelor's Degree",
        jobSource: source,
        company: job.company_name || job.company || 'Unknown',
        description: description,
        coreSkills: skills.slice(0, 5),
        company_logo: job.company_logo || job.company_logo_url || '',
        customQuestions: [
            {
                question: "Why are you interested in this position?",
                answerType: "text",
                options: [],
                required: true
            },
            {
                question: "Are you available to start immediately?",
                answerType: "boolean",
                options: ["Yes", "No"],
                required: true
            }
        ]
    };
}

// Main function to fetch and insert jobs
async function fetchAndInsertJobs() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb+srv://aditya:k353OKjCl6XfGw13@cluster0.cvuu6yu.mongodb.net/?retryWrites=true&w=majority', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Fetch from multiple sources
        console.log('Fetching jobs from Remotive...');
        const remotiveJobs = await fetchRemotiveJobs();
        
        console.log('Fetching jobs from Arbeitnow...');
        const arbeitnowJobs = await fetchArbeitnowJobs();

        // Format and insert jobs
        const allJobs = [
            ...remotiveJobs.map(job => formatJobData(job, 'remotive')),
            ...arbeitnowJobs.map(job => formatJobData(job, 'arbeitnow'))
        ];

        console.log(`Found ${allJobs.length} jobs to insert`);

        // Insert jobs in batches
        if (allJobs.length > 0) {
            const result = await JobPosting.insertMany(allJobs);
            console.log(`Successfully inserted ${result.length} job postings`);
        } else {
            console.log('No jobs found to insert');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

// Run the script
fetchAndInsertJobs();