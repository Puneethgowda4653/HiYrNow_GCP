var mongoose = require('mongoose');
var resumeUploadSchema = mongoose.Schema({
    filename: { type: String }, // Define the filename field as a string
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel' },
    content: { type: Buffer } // Add a field for resume content as a buffer
}, { collection: 'ResumeUploads' });

module.exports = resumeUploadSchema;