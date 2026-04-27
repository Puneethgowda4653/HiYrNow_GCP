// services/credit-points.service.js
const creditPointsSchema = require('../models/credit-points/credit-points.model.server');

const POINTS_CONVERSION = {
    '25000': 50,  // 1.5 lakhs = 7,50,000 points
    '47000': 100,   // 55,000 = 2,50,000 points
    '90000': 200
};

const FEATURE_COSTS = {
    'jobPosting': 1000,           // Cost to post a new job made free
    'featuredJob': 5000,       // Cost to make a job featured
    'bulkEmail': 3000,         // Cost to send bulk emails
    'viewprofile': 0.0625,      // Cost to access a candidate's resume
    'pvc1':6,
    'pvc2':10,
    'pvc3':20
};

async function purchasePoints(userId, amount) {
    try {
        const points = POINTS_CONVERSION[amount.toString()];
        if (!points) {
            throw new Error('Invalid purchase amount');
        }

        const creditPoints = await creditPointsSchema.findOne({ user: userId });
        if (!creditPoints) {
            // Create new credit points record
            return await creditPointsSchema.create({
                user: userId,
                points: points,
                transactions: [{
                    type: 'CREDIT',
                    points: points,
                    amount: amount,
                    description: `Purchased ${points} points`
                }]
            });
        }

        // Update existing credit points
        creditPoints.points += points;
        creditPoints.transactions.push({
            type: 'CREDIT',
            points: points,
            amount: amount,
            description: `Purchased ${points} points`
        });

        return await creditPoints.save();
    } catch (error) {
        throw new Error('Error processing points purchase: ' + error.message);
    }
}

async function deductPoints(userId, feature) {
    try {
        const pointsCost = FEATURE_COSTS[feature];
        if (!pointsCost) {
            throw new Error('Invalid feature');
        }

        const creditPoints = await creditPointsSchema.findOne({ user: userId });
      
        if (!creditPoints || creditPoints.points < pointsCost) {
            throw new Error('Insufficient points');
        }

        // Deduct points
        creditPoints.points -= pointsCost;
        creditPoints.transactions.push({
            type: 'DEBIT',
            points: pointsCost,
            description: `Used ${pointsCost} points for ${feature}`
        });

        return await creditPoints.save();
    } catch (error) {
        throw new Error('Error deducting points: ' + error.message);
    }
}

module.exports = {
    purchasePoints,
    deductPoints,
    FEATURE_COSTS
};

