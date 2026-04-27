var mongoose = require('mongoose');
var transactionSchema = require('./transaction.schema.server');

var PaymentTransactionModel = mongoose.model('PaymentTransactionModel', transactionSchema);

module.exports = {
    create: create,
    updateStatusByTxnId: updateStatusByTxnId,
    findByTxnId: findByTxnId
};

function create(txn) {
    return PaymentTransactionModel.create(txn);
}

function updateStatusByTxnId(txnId, status, metadata) {
    return PaymentTransactionModel.findOneAndUpdate(
        { txnId: txnId },
        { status: status, metadata: metadata, updatedAt: new Date() },
        { new: true }
    );
}

function findByTxnId(txnId) {
    return PaymentTransactionModel.findOne({ txnId: txnId });
}

