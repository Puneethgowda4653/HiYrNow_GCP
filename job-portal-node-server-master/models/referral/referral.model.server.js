var mongoose = require('mongoose');
var referralSchema = require('./referral.schema.server');

var referralModel = mongoose.model('ReferralModel', referralSchema);

function createReferral(referral) {
  return referralModel.create(referral);
}

function findAllReferrals() {
  return referralModel.find().populate('createdBy', 'username email').sort({ createdAt: -1 });
}

function findReferralById(referralId) {
  return referralModel.findById(referralId);
}

function findReferralByCode(code) {
  return referralModel.findOne({ code: code, isActive: true });
}

function updateReferral(referralId, referral) {
  return referralModel.updateOne({ _id: referralId }, { $set: referral });
}

function deleteReferral(referralId) {
  return referralModel.deleteOne({ _id: referralId });
}

function incrementUsageCount(referralId) {
  return referralModel.updateOne({ _id: referralId }, { $inc: { usageCount: 1 } });
}

function findActiveReferrals() {
  return referralModel.find({ isActive: true }).sort({ createdAt: -1 });
}

module.exports = {
  createReferral,
  findAllReferrals,
  findReferralById,
  findReferralByCode,
  updateReferral,
  deleteReferral,
  incrementUsageCount,
  findActiveReferrals
};
