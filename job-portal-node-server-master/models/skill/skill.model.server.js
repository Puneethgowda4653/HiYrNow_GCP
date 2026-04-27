var mongoose = require('mongoose');
var skillSchema = require('./skill.schema.server');
var skillModel = mongoose.model('SkillModel', skillSchema);

module.exports = {
    model: skillModel,  // Export the model itself
    findAllSkills: findAllSkill,
    findSkillByUserId: findSkillByUserId,
    createSkill: createSkill,
    deleteSkill: deleteSkill,
    updateSkill: updateSkill,
    findOneAndUpdate: findOneAndUpdate
};

function findSkillByUserId(userId) {
    return skillModel.find({user: userId});
}

function findAllSkill() {
    return skillModel.find();
}

function createSkill(skill) {
    return skillModel.create(skill);
}

function deleteSkill(skillId) {
    return skillModel.remove({_id: skillId});
}

function updateSkill(skillId, newSkill) {
    return skillModel.update(
        {_id: skillId},
        {$set: newSkill}
    );
}

function findOneAndUpdate(query, update, options) {
    return skillModel.findOneAndUpdate(query, update, options);
}