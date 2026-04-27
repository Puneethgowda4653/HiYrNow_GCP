const mongoose = require('mongoose');
const { Schema } = mongoose;

const referralSchema = new Schema({
  code: { type: String, unique: true, required: true },
  partnerName: { type: String, required: true },
  email: { type: String },
  offerType: { type: String, enum: ['freePlan', 'discount', 'customFeatures'], default: 'freePlan' },
  offerDetails: {
    freePlan: { type: String, default: 'growth' }, // e.g., starter/growth/elite
    durationDays: { type: Number, default: 30 },
    discountPercent: { type: Number, default: 0 },
    customFeatures: { type: Object, default: {} },
  },
  usageCount: { type: Number, default: 0 },
  maxUses: { type: Number, default: 100 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'UserModel' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'Referral' });

module.exports = referralSchema;
