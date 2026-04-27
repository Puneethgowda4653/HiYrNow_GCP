var mongoose = require('mongoose');
var jobApplicationSchema = require('./job-application.schema.server');
var jobApplicationModel = mongoose.model('JobApplicationModel', jobApplicationSchema);
const jobPostingModel = require('./../job-posting/job-posting.model.server');





module.exports = {
    findJobApplicationByJobId: findJobApplicationByJobId,
    findJobApplicationByAllJobId:findJobApplicationByAllJobId,
    findAllJobApplicationByUserId: findAllJobApplicationByUserId,
    createJobApplication: createJobApplication,
    deleteJobApplication: deleteJobApplication,
    deleteJobApplicationForUser: deleteJobApplicationForUser,
    deleteJobApplicationForJobPosting: deleteJobApplicationForJobPosting,
    updateJobApplication: updateJobApplication,
    findAppliedUsersForJob: findAppliedUsersForJob,
    moveToPVC: moveToPVC,
    findAllPVCListUsers: findAllPVCListUsers,
    findAllJobsAppliedByUser: findAllJobsAppliedByUser,
    findJobPostingById: findJobPostingById,
    findJobApplicationByJobIdAndUserId: findJobApplicationByJobIdAndUserId,
    countDocuments: countDocuments,
    findJobApplicationInterviewByJobId:findJobApplicationInterviewByJobId,
    findJobApplicationById: findJobApplicationById,
    countApplicationsPerJob:countApplicationsPerJob
};



async function countApplicationsPerJob(jobIds) {
    try {
        return await jobApplicationModel.aggregate([
            { $match: { jobPosting: { $in: jobIds } } }, // Filter by job postings
            { $group: { _id: "$jobPosting", applicationCount: { $sum: 1 } } } // Count applications per job
        ]);
    } catch (error) {
        console.error("Error in countApplicationsPerJob:", error);
        throw error;
    }
}


function findJobApplicationByJobIdAndUserId(jobId, userId) {
    return jobApplicationModel.findOne({ jobPosting: jobId, user: userId });
}
async function countDocuments(userId) {
    try {
        // Ensure userId is valid
        if (!userId) {
            throw new Error("Invalid userId");
        }

        // Find documents and count them
        const total = await jobApplicationSchema.find({ user: userId });
        return total.length;
    } catch (error) {
        console.error("Error counting documents:", error.message);
        return 0; // Return 0 or handle the error appropriately
    }
}



function findAllJobsAppliedByUser(userId) {
    return jobApplicationModel.find({ user: userId });
}

function findJobPostingById(jobId) {
    return jobPostingModel.findById(jobId);
}

function findAppliedUsersForJob(jobId, jobSource) {
    return jobApplicationModel.find({ jobPosting: jobId })
        .populate('user') // Adjust the field based on your user schema
        .exec()
        .then(function (applications) {
            return applications.map(function (application) {
                return { application }; // Adjust the field based on your user schema
            });
        });
}

function moveToPVC(jobApplicationId, userId) {
    return jobApplicationModel.findByIdAndUpdate(
        jobApplicationId,
        { PVC: true, user: userId },
        { new: true }
    ).exec();
}

function findAllPVCListUsers(jobId) {
    return jobApplicationModel.find({ PVC: true, jobPosting: jobId }).populate('user').exec()
        .then(function (applications) {
            return applications.map(function (application) {
                return { applicationId: application._id, userName: application.user }; // Adjust the field based on your user schema
            });
        });
}

function findJobApplicationByJobId(jobId) {
    console.log("$$$$",jobId)
    return jobApplicationModel.findById(jobId).exec();
}

function findJobApplicationByAllJobId (jobIds) {
    console.log("Finding applications for job IDs:", jobIds);
    
    // If single job ID is passed as string, convert to array
    const jobIdArray = Array.isArray(jobIds) ? jobIds : [jobIds];
    
    // Find all job applications where jobPosting field matches any of the job IDs
    return jobApplicationModel.find({ 
        jobPosting: { $in: jobIdArray } 
    }).exec();
}
async function findJobApplicationInterviewByJobId(jobId) {
    try {
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            throw new Error('Invalid MongoDB ObjectId format');
        }

        const application = await jobApplicationModel
        .find({ jobPosting: jobId })
            .select('interviews')
            .lean()
            .exec();
        return application;
    } catch (error) {
        console.error('Error in findJobApplicationByJobId:', error);
        throw error;
    }
}

function findAllJobApplicationByUserId(userId) {
    return jobApplicationModel.find({ user: userId }).exec();
}

function createJobApplication(jobApplication) {
    return jobApplicationModel.create(jobApplication);
}

function deleteJobApplication(jobApplicationId) {
    return jobApplicationModel.deleteOne({ _id: jobApplicationId }).exec();
}

function deleteJobApplicationForUser(userId) {
    return jobApplicationModel.deleteMany({ user: userId }).exec();
}

function deleteJobApplicationForJobPosting(jobPostingId, jobSource) {
    const query = jobSource === 'github' ? { gitHubJobId: jobPostingId } : { jobPosting: jobPostingId };
    return jobApplicationModel.deleteMany(query).exec();
}

function updateJobApplication(jobApplicationId, newJobApplication) {
    return jobApplicationModel.updateOne({ _id: jobApplicationId }, { $set: newJobApplication }).exec();
}

function findJobApplicationById(applicationId) {
    return jobApplicationModel.findById(applicationId).exec();
}

