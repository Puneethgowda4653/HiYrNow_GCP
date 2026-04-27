var mongoose = require('mongoose');
var projectSchema = mongoose.Schema({
    projectName : String,
    projectStartDate : { month: String, year: String},
    projectendDate : { month: String, year: String},
    ongoingStatus: String,
    collaborators: [String],
    url: String,
    associatedWith: String,
    skillsUsed: [String],
    description: String,
    user : {type: mongoose.Schema.Types.ObjectId, ref: 'UserModel'}

}, {collection: 'Project'});

module.exports = projectSchema;
