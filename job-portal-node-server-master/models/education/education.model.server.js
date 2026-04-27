// education.model.server.js
var mongoose = require('mongoose');
var educationSchema = require('./education.schema.server');
var educationModel = mongoose.model('EducationModel', educationSchema);

// Export both the model and the specific functions
module.exports = {
    model: educationModel,  // Export the model itself
    findAllEducation: findAllEducation,
    findEducationByUserId: findEducationByUserId,
    createEducation: createEducation,
    deleteEducation: deleteEducation,
    updateEducation: updateEducation,
    // Add the new function needed for resume parsing
    findOneAndUpdate: findOneAndUpdate
};

function findAllEducation() {
    return educationModel.find();
}

function findEducationByUserId(userId) {
    return educationModel.find({user: userId});
}

function createEducation(education) {
    return educationModel.create(education);
}

function deleteEducation(educationId) {
    return educationModel.remove({_id: educationId});
}

function updateEducation(educationId, newEducation) {
    return educationModel.update(
        {_id: educationId},
        {$set: newEducation}
    );
}

function findOneAndUpdate(query, update, options) {
    return educationModel.findOneAndUpdate(query, update, options);
}