var mongoose = require('mongoose');
var pricingPlanSchema = require('./plan.schema.server');

var PricingPlanModel = mongoose.model('PricingPlanModel', pricingPlanSchema);

module.exports = {
    createPlan: createPlan,
    findAllPlans: findAllPlans,
    findPlanByCode: findPlanByCode,
    updatePlanById: updatePlanById,
    findPlanById: findPlanById
};

function createPlan(plan) {
    return PricingPlanModel.create(plan);
}

function findAllPlans() {
    return PricingPlanModel.find().sort({ monthlyPrice: 1 });
}

function findPlanByCode(code) {
    return PricingPlanModel.findOne({ code: code });
}

function findPlanById(id) {
    return PricingPlanModel.findById(id);
}

function updatePlanById(id, update) {
    update.updatedAt = new Date();
    return PricingPlanModel.findByIdAndUpdate(id, { $set: update }, { new: true });
}


