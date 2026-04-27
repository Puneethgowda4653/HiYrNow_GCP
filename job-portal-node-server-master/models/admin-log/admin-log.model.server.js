var mongoose = require('mongoose');
var schema = require('./admin-log.schema.server');
var AdminLogModel = mongoose.model('AdminLogModel', schema);

module.exports = {
    createLog,
    findLogs
};

function createLog(entry) {
    return AdminLogModel.create(entry);
}

function findLogs({ limit = 100 } = {}) {
    return AdminLogModel.find().sort({ createdAt: -1 }).limit(limit);
}


