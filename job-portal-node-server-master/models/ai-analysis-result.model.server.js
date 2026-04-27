const mongoose = require('mongoose');
const aiAnalysisResultSchema = require('./ai-analysis-result.schema.server');
const aiAnalysisResultModel = mongoose.model('AIAnalysisResultModel', aiAnalysisResultSchema);

module.exports = {
  findByJobAndUser: (jobId, userId) => aiAnalysisResultModel.findOne({ jobId, userId }),
  createOrUpdate: (jobId, userId, analysisData) => aiAnalysisResultModel.findOneAndUpdate(
    { jobId, userId },
    { analysisData, createdAt: new Date(), expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
    { upsert: true, new: true }
  ),
}; 