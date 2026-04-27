// models/credit-points/credit-points.model.server.js
const mongoose = require('mongoose');

const creditPointsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    points: {
        type: Number,
        default: 0
    },
    transactions: [{
        type: {
            type: String,
            enum: ['CREDIT', 'DEBIT'],
            required: true
        },
        points: {
            type: Number,
            required: true
        },
        description: String,
        amount: Number,
        adminId: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

module.exports = mongoose.model('CreditPoints', creditPointsSchema)