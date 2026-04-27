var mongoose = require('mongoose');

var adminLogSchema = mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel' },
    action: { type: String, required: true },
    meta: { type: Object, default: {} },
    ipAddress: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now }
}, { collection: 'AdminLog' });

module.exports = adminLogSchema;


