// job-portal-node-server-master/models/education/education.schema.server.js
var mongoose = require('mongoose');
var educationSchema = mongoose.Schema({
    institute : String,
    location : String,
    degree : String,
    startDate : { month: String, year: String},
    endDate : { month: String, year: String},
    ongoingStatus: String,
    fieldOfStudy: String,
    grade: String,
    url:String,
    description:String,
    user : {type: mongoose.Schema.Types.ObjectId, ref: 'UserModel'}
    
}, {collection: 'Education'});

module.exports = educationSchema;
