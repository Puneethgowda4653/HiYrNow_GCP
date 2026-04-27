// job-portal-node-server-master/models/resume-upload/resume-upload.model.server.js
var mongoose = require('mongoose');
var resumeUploadSchema = require('./resume-upload.schema.server');
var resumeUploadModel = mongoose.model('ResumeUploadModel', resumeUploadSchema);

module.exports = {
    findAllResumeUploads: findAllResumeUploads,
    findResumeUploadByUserId: findResumeUploadByUserId,
    createResumeUpload: createResumeUpload,
    deleteResumeUpload: deleteResumeUpload,
    updateResumeUpload: updateResumeUpload
};

function findAllResumeUploads() {
    return resumeUploadModel.find();
}

function findResumeUploadByUserId(userId,filename) {
    return resumeUploadModel.find({ user: userId });
}

function createResumeUpload(resumeUpload) {
    return new resumeUploadModel(resumeUpload).save();
}

function deleteResumeUpload(resumeUploadId) {
    return resumeUploadModel.remove({ _id: resumeUploadId });
}

function updateResumeUpload(resumeUploadId, newResumeUpload) {
    return resumeUploadModel.update({ _id: resumeUploadId }, { $set: newResumeUpload });
}
