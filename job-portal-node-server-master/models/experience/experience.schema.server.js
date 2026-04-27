var mongoose = require('mongoose');
var experienceSchema = mongoose.Schema({
    title : String,
    company : String,
    location : String,
    startDate : { month: String, year: String},
    endDate : { month: String, year: String},
    ongoingStatus: String,
  description: [{ type: [String], default: [] }],
    project: String,
    stacks: [String],
    user : {type: mongoose.Schema.Types.ObjectId, ref: 'UserModel'},
    responsibilities: { type: [String], default: [] },
}, {collection: 'Experience'});

module.exports = experienceSchema;
