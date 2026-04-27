const mongoose = require('mongoose');

const pvcRequestSchema = mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', required: true },
    pvcCount: { type: Number, required: true },
    pointsDeducted: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected', 'Fulfilled'], 
        default: 'Pending' 
    },
    requestDate: { type: Date, default: Date.now },
    fulfillmentDate: Date,
    notes: String
}, { timestamps: true });

module.exports = mongoose.model('PVCRequest', pvcRequestSchema);