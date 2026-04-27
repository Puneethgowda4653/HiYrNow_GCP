// models/filter.model.server.js filter.schema.server.js
const mongoose = require('mongoose');
var filterSchema = mongoose.Schema
({
  userId: {type: mongoose.Schema.Types.ObjectId, ref: 'UserModel'},
  keyword: { type: String },
  location: { type: String },
  jobType: { type: String },
}, { timestamps: true });

module.exports = filterSchema;


