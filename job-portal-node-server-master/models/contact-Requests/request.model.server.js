// models/request.model.server.js

const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  points: Number,
  industry: String,
  position: String,
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  requirements: String,
  tierSelected: Boolean,
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Request || mongoose.model('Request', requestSchema);