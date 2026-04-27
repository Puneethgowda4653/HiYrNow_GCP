const mongoose = require('mongoose');

const aiAnalysisResultSchema = mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPostingModel', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', required: true },
  analysisData: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) } // 60 days from creation
}, { collection: 'AIAnalysisResult' });

// TTL index for automatic deletion after 60 days
aiAnalysisResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = aiAnalysisResultSchema; 