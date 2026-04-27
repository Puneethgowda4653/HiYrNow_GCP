const { paymentIdempotency, webhookIdempotency } = require('../middleware/idempotency');
const logger = require('../infra/logger').logger;

module.exports = function(app) {
    const planModel = require('../models/pricing-plan/plan.model.server');
    const recruiterDetailModel = require('../models/recruiter-detail/recruiter-detail.model.server');
    const txnModel = require('../models/payment/transaction.model.server');

    function requireSession(req, res) {
        if (!req.session || !req.session['user']) {
            res.status(401).json({ error: 'Unauthorized' });
            return false;
        }
        return true;
    }

    // Payment initiation with idempotency
    app.post('/api/payments/initiate', paymentIdempotency(), async function(req, res) {
        try {
            if (!requireSession(req, res)) return;
            const sessionUserId = req.session['user']._id;
            const { planId, paymentMethod, upiId, referralCode } = req.body;
            if (!planId || !paymentMethod) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const plan = await planModel.findPlanById(planId);
            if (!plan) return res.status(404).json({ error: 'Plan not found' });

            const amount = plan.yearlyPrice && plan.yearlyPrice > 0 ? plan.yearlyPrice : plan.monthlyPrice || 0;

            const txnId = 'TXN' + Date.now();
            await txnModel.create({
                user: sessionUserId,
                plan: planId,
                paymentMethod: paymentMethod,
                upiId: upiId,
                status: 'pending',
                txnId: txnId,
                amount: amount,
                referralCodeUsed: referralCode || null
            });

            logger.info('Payment initiated', {
                userId: sessionUserId,
                txnId,
                planId,
                amount,
                idempotencyKey: req.idempotencyKey,
            });

            // Simulate payment gateway response
            setTimeout(() => {
                const success = Math.random() > 0.1;
                if (success) {
                    return res.json({ 
                        status: 'success', 
                        txnId: txnId, 
                        planId: planId,
                        amount,
                    });
                } else {
                    return res.json({ 
                        status: 'failed', 
                        message: 'Payment failed', 
                        txnId: txnId, 
                        planId: planId 
                    });
                }
            }, 2000);
        } catch (err) {
            logger.error('Payment initiation failed', {
                error: err.message,
                userId: req.session['user']?._id,
            });
            res.status(500).json({ error: 'Failed to initiate payment', details: err.message });
        }
    });

    // Payment verification with idempotency (prevent double-processing)
    app.post('/api/payments/verify', paymentIdempotency(), async function(req, res) {
        try {
            if (!requireSession(req, res)) return;
            const { txnId, status } = req.body;
            if (!txnId || !status) return res.status(400).json({ error: 'Missing txnId or status' });

            const txn = await txnModel.findByTxnId(txnId);
            if (!txn) return res.status(404).json({ error: 'Transaction not found' });

            await txnModel.updateStatusByTxnId(txnId, status, {});

            if (status !== 'success') {
                return res.json({ status: 'failed' });
            }

            const plan = await planModel.findPlanById(txn.plan);
            if (!plan) return res.status(404).json({ error: 'Plan not found' });

            const now = new Date();
            const end = new Date(now);
            if (plan.code === 'earlybird') {
                // Early Bird promotional plan: fixed 6-month validity
                end.setMonth(end.getMonth() + 6);
            } else {
                end.setFullYear(end.getFullYear() + 1);
            }

            // Update recruiter detail with plan activation
            const rec = await recruiterDetailModel.findRecruiterDetailByUserId(txn.user);
            if (!rec) {
                logger.error('Recruiter profile not found for payment verification', {
                    userId: txn.user,
                    txnId,
                });
                return res.status(404).json({ error: 'Recruiter profile not found' });
            }
            
            await recruiterDetailModel.updateRecruiterDetail(rec._id, {
                plan: txn.plan,
                planStartDate: now,
                planEndDate: end,
                billingCycle: 'yearly',
                isCustomPlan: false
            });

            logger.info('Payment verified and plan activated', {
                userId: txn.user,
                txnId,
                planId: txn.plan,
                idempotencyKey: req.idempotencyKey,
            });

            return res.json({ 
                status: 'success', 
                planId: txn.plan, 
                startDate: now, 
                endDate: end 
            });
        } catch (err) {
            logger.error('Payment verification failed', {
                error: err.message,
                txnId: req.body.txnId,
            });
            res.status(500).json({ error: 'Verification failed', details: err.message });
        }
    });

    // Custom plan contact submission
    app.post('/api/plans/custom', async function(req, res) {
        try {
            const { companyName, email, phone, message } = req.body;
            if (!companyName || !email || !phone) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            // Store in existing contact requests for simplicity
            const Request = require('../models/contact-Requests/request.model.server');
            const doc = await Request.create({
                firstName: companyName,
                email: email,
                phone: phone,
                requirements: message,
                tierSelected: false,
                points: 0
            });
            return res.json({ success: true, id: doc._id });
        } catch (err) {
            res.status(500).json({ error: 'Failed to submit custom plan', details: err.message });
        }
    });
};

