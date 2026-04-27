module.exports = function(app) {
    var referralModel = require('../models/referral/referral.model.server');
    var planModel = require('../models/pricing-plan/plan.model.server');
    var recruiterDetailModel = require('../models/recruiter-detail/recruiter-detail.model.server');

    // Create a new referral code (Admin only)
    app.post('/api/referrals/create', async function(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role !== 'Admin') {
                return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
            }

            const { code, partnerName, email, offerType, offerDetails, maxUses } = req.body;
            
            if (!code || !partnerName || !offerType) {
                return res.status(400).json({ error: 'Code, partner name, and offer type are required' });
            }

            // Check if code already exists
            const existingReferral = await referralModel.findReferralByCode(code);
            if (existingReferral) {
                return res.status(400).json({ error: 'Referral code already exists' });
            }

            const referralData = {
                code: code.toUpperCase(),
                partnerName,
                email,
                offerType,
                offerDetails: offerDetails || {},
                maxUses: maxUses || 100,
                createdBy: req.session['user']._id,
                isActive: true
            };

            const referral = await referralModel.createReferral(referralData);
            res.json({ status: 'success', referral });
        } catch (err) {
            console.error('Error creating referral:', err);
            res.status(500).json({ error: 'Failed to create referral', details: err.message });
        }
    });

    // Get all referral codes (Admin view)
    app.get('/api/referrals', async function(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role !== 'Admin') {
                return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
            }

            const referrals = await referralModel.findAllReferrals();
            res.json(referrals);
        } catch (err) {
            console.error('Error fetching referrals:', err);
            res.status(500).json({ error: 'Failed to fetch referrals', details: err.message });
        }
    });

    // Get referral analytics (Admin only) - MUST be before /:code route
    app.get('/api/referrals/analytics', async function(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role !== 'Admin') {
                return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
            }

            const referrals = await referralModel.findAllReferrals();
            const totalActiveReferrals = referrals.filter(r => r.isActive).length;
            const totalRedemptions = referrals.reduce((sum, r) => sum + r.usageCount, 0);
            
            // Top performing partners
            const topPartners = referrals
                .filter(r => r.isActive)
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 10)
                .map(r => ({
                    partnerName: r.partnerName,
                    code: r.code,
                    usageCount: r.usageCount,
                    maxUses: r.maxUses,
                    utilizationRate: ((r.usageCount / r.maxUses) * 100).toFixed(1)
                }));

            res.json({
                totalActiveReferrals,
                totalRedemptions,
                topPartners,
                referrals: referrals.map(r => ({
                    _id: r._id,
                    code: r.code,
                    partnerName: r.partnerName,
                    offerType: r.offerType,
                    usageCount: r.usageCount,
                    maxUses: r.maxUses,
                    isActive: r.isActive,
                    createdAt: r.createdAt
                }))
            });
        } catch (err) {
            console.error('Error fetching referral analytics:', err);
            res.status(500).json({ error: 'Failed to fetch analytics', details: err.message });
        }
    });

    // Get referral details by code
    app.get('/api/referrals/:code', async function(req, res) {
        try {
            const code = req.params.code;
            const referral = await referralModel.findReferralByCode(code);
            
            if (!referral) {
                return res.status(404).json({ error: 'Referral code not found or inactive' });
            }

            // Check if referral has reached max uses
            if (referral.usageCount >= referral.maxUses) {
                return res.status(400).json({ error: 'Referral code has reached maximum usage limit' });
            }

            res.json(referral);
        } catch (err) {
            console.error('Error fetching referral:', err);
            res.status(500).json({ error: 'Failed to fetch referral', details: err.message });
        }
    });

    // Update referral offer or deactivate it
    app.put('/api/referrals/:id', async function(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role !== 'Admin') {
                return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
            }

            const referralId = req.params.id;
            const updateData = req.body;

            // Remove fields that shouldn't be updated directly
            delete updateData._id;
            delete updateData.createdAt;
            delete updateData.createdBy;
            delete updateData.usageCount;

            const referral = await referralModel.updateReferral(referralId, updateData);
            res.json({ status: 'success', referral });
        } catch (err) {
            console.error('Error updating referral:', err);
            res.status(500).json({ error: 'Failed to update referral', details: err.message });
        }
    });

    // Delete referral code
    app.delete('/api/referrals/:id', async function(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role !== 'Admin') {
                return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
            }

            const referralId = req.params.id;
            await referralModel.deleteReferral(referralId);
            res.json({ status: 'success', message: 'Referral deleted successfully' });
        } catch (err) {
            console.error('Error deleting referral:', err);
            res.status(500).json({ error: 'Failed to delete referral', details: err.message });
        }
    });

    // Apply referral code during recruiter signup
    app.post('/api/referrals/apply', async function(req, res) {
        try {
            const { referralCode, userId } = req.body;
            
            if (!referralCode || !userId) {
                return res.status(400).json({ error: 'Referral code and user ID are required' });
            }

            // Find the referral
            const referral = await referralModel.findReferralByCode(referralCode);
            if (!referral) {
                return res.status(404).json({ error: 'Invalid referral code' });
            }

            // Check if referral has reached max uses
            if (referral.usageCount >= referral.maxUses) {
                return res.status(400).json({ error: 'Referral code has reached maximum usage limit' });
            }

            // Find recruiter detail
            const recruiter = await recruiterDetailModel.findRecruiterDetailByUserId(userId);
            if (!recruiter) {
                return res.status(404).json({ error: 'Recruiter profile not found' });
            }

            // Check if recruiter already used a referral
            if (recruiter.referralCodeUsed) {
                return res.status(400).json({ error: 'Recruiter has already used a referral code' });
            }

            let planToAssign = null;
            let planEndDate = null;

            // Apply the referral offer
            if (referral.offerType === 'freePlan') {
                const planCode = referral.offerDetails.freePlan || 'growth';
                planToAssign = await planModel.findPlanByCode(planCode);
                
                if (planToAssign) {
                    const now = new Date();
                    planEndDate = new Date(now);
                    planEndDate.setDate(planEndDate.getDate() + (referral.offerDetails.durationDays || 30));
                }
            }

            if (!planToAssign) {
                return res.status(400).json({ error: 'Invalid plan specified in referral offer' });
            }

            // Update recruiter with referral information and plan
            const updateData = {
                referralCodeUsed: referralCode,
                referredBy: referral._id,
                plan: planToAssign._id,
                planStartDate: new Date(),
                planEndDate: planEndDate,
                billingCycle: 'monthly',
                isCustomPlan: false
            };

            await recruiterDetailModel.updateRecruiterDetail(recruiter._id, updateData);
            
            // Increment referral usage count
            await referralModel.incrementUsageCount(referral._id);

            res.json({ 
                status: 'success', 
                message: `Referral applied successfully! You now have ${planToAssign.name} plan for ${referral.offerDetails.durationDays || 30} days.`,
                plan: planToAssign,
                referral: referral
            });
        } catch (err) {
            console.error('Error applying referral:', err);
            res.status(500).json({ error: 'Failed to apply referral', details: err.message });
        }
    });
};
