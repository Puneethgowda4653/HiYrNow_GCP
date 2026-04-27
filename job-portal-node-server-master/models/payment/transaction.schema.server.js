var mongoose = require('mongoose');

var transactionSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'PricingPlanModel', required: true },
    paymentMethod: { type: String, enum: ['upi', 'dummy'], required: true },
    upiId: { type: String },
    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
    txnId: { type: String, unique: true },
    amount: { type: Number },
    referralCodeUsed: { type: String, default: null },
    metadata: { type: Object },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'PaymentTransaction' });

transactionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = transactionSchema;

