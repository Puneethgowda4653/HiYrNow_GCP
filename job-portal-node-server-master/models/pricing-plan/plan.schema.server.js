var mongoose = require('mongoose');

var pricingPlanSchema = mongoose.Schema({
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    monthlyPrice: { type: Number, default: 0 },
    yearlyPrice: { type: Number, default: 0 },
    features: {
        type: Object,
        required: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'PricingPlan' });

pricingPlanSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = pricingPlanSchema;


