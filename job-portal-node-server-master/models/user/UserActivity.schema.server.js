const mongoose = require('mongoose');

const UserActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  user:{
    type:String,
  },
  activityType: {
    type: String, // e.g., 'login', 'logout', 'job_apply', 'profile_update'
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
  },
  device: {
    type: String, // e.g., 'Desktop', 'Mobile'
  },
});

module.exports = mongoose.model('UserActivity', UserActivitySchema);
