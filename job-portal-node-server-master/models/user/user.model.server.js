// job-portal-node-server-master/models/user/user.model.server.js
var mongoose =
    require('mongoose');
var userSchema =
    require('./user.schema.server');
var userModel = mongoose
    .model('UserModel', userSchema);
module.exports = {
    findUserById: findUserById,
    findRecruiterbyId: findRecruiterbyId,
    findAllUsers:findAllUsers,
    findUserByUsername: findUserByUsername,
    findUserByCredentials: findUserByCredentials,
    createUser: createUser,
    deleteUser: deleteUser,
    updateUser: updateUser,
    findPendingRecruiters: findPendingRecruiters,
    approveRecruiter: approveRecruiter,
    revokePremiumAccess:revokePremiumAccess,
    grantPremiumAccess:grantPremiumAccess,
    imageUrlUpload   : imageUrlUpload,
    find:find,
    findUsername:findUsername,
    findUserByEmail:findUserByEmail
};
function findUserByEmail(email) {
    return userModel.findOne({ email: email }).exec();
  }
function find(query) {
    return userModel.find(query);
}
function findAllUsers() {
    return userModel.find();
}
function findUsername(username) {
    return userModel.find({ username: username });
}


function findPendingRecruiters() {
    return userModel.find({requestStatus:'Pending'},{password:0});
}
function findUserById(userId) {
    return userModel.findById(userId,{password:0});
}
function findRecruiterbyId(userId) {
    return userModel.find({user: userId})
        .populate('recruiter')
        .exec();
}
function findUserByUsername(username, email) {
    return userModel.findOne({
        $or: [
            { username: username },
            { email: email }
        ]
    }, { password: 0 });
}
function findUserByCredentials(identifier) {
    return userModel.findOne({
        $or: [{ username: identifier }, { email: identifier }]
    }).exec();
}

function createUser(user) {
    if (user.role === 'Recruiter') {
        user['requestStatus']='Pending'
    }
    return userModel.create(user);
}
function deleteUser(userId) {
    return userModel.remove({_id: userId});
}
function updateUser(userId, newUser) {
    return userModel.updateOne({_id: userId},
        {$set: newUser})
}
function approveRecruiter(userId) {
    return userModel.update({_id: userId},
        {$set: {requestStatus: 'Verified'}})
}
function revokePremiumAccess(userId) {
    return userModel.update({_id: userId},
        {$unset:{premiumRequestStatus:1}})
}
function grantPremiumAccess(userId) {
    return userModel.update({_id: userId},
        {$set:{premiumRequestStatus:'Verified'}})
}
function imageUrlUpload(userId, imageUrl) {
    return userModel.update({_id: userId},
        {$set: {imageUrl: imageUrl}})
}