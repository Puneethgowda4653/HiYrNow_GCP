var mongoose =
    require('mongoose');
var jobPostingSchema =
    require('./job-posting.schema.server');
var jobPostingModel = mongoose
    .model('JobPostingModel', jobPostingSchema);


module.exports = {
    findJobPostingById: findJobPostingById,
    findAllJobPostings:findAllJobPostings,
    findJobPostingByLocation: findJobPostingByLocation,
    findJobPostingByType: findJobPostingByType,
    createJobPosting: createJobPosting,
    deleteJobPosting: deleteJobPosting,
    updateJobPosting: updateJobPosting,
    findJobPostingByUserId:findJobPostingByUserId,
    findJobPostingsWithFilter: findJobPostingsWithFilter,
    countJobPostingsWithFilter: countJobPostingsWithFilter
};

function findAllJobPostings(filter) {
    return jobPostingModel.find(filter || {}).sort({ datePosted: -1 });
}


function findJobPostingById(jobPostingId) {
    return jobPostingModel.findById(jobPostingId);
}
function findJobPostingByUserId(userId) {
    return jobPostingModel.find({user:userId}).sort({ datePosted: -1 });;
}

function findJobPostingByLocation(location) {
    return jobPostingModel.findOne({location: location}).sort({ datePosted: -1 });;
}

function findJobPostingByType(type) {
    return jobPostingModel.findOne({type: type}).sort({ datePosted: -1 });;
}

function createJobPosting(jobPosting) {
    return jobPostingModel.create(jobPosting);
}

function deleteJobPosting(jobPostingId) {
    return jobPostingModel.remove({_id: jobPostingId});
}

function updateJobPosting(jobPostingId, newJobPosting) {
    return jobPostingModel.update({_id: jobPostingId},
        {$set: newJobPosting})

}

function findJobPostingsWithFilter(filter, sort, skip, limit) {
    return jobPostingModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'username firstName lastName profilePicture')
        .lean();
}

function countJobPostingsWithFilter(filter) {
    return jobPostingModel.countDocuments(filter);
}