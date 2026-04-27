module.exports = function(app) {
    var planModel = require('../models/pricing-plan/plan.model.server');
    var recruiterDetailModel = require('../models/recruiter-detail/recruiter-detail.model.server');
    var usage = require('../utils/plan-usage');
    var seedPlans = require('../utils/seed-plans.json');

    async function ensureSeeded() {
        try {
            const plans = await planModel.findAllPlans();
            const existingCodes = new Set((plans || []).map(p => p.code));
            for (const p of seedPlans) {
                if (!existingCodes.has(p.code)) {
                    await planModel.createPlan(p);
                }
            }
        } catch (e) {
            // swallow seeding errors to avoid blocking
        }
    }

    app.get('/api/plans', async function(req, res) {
        try {
            await ensureSeeded();
            const plans = await planModel.findAllPlans();
            res.json(plans);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch plans', details: err.message });
        }
    });

    app.get('/api/plans/:code', async function(req, res) {
        try {
            await ensureSeeded();
            const code = req.params['code'];
            const plan = await planModel.findPlanByCode(code);
            if (!plan) return res.status(404).json({ error: 'Plan not found' });
            res.json(plan);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch plan', details: err.message });
        }
    });

    app.post('/api/plans/select', async function(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role === 'JobSeeker') {
                return res.status(401).send({ status: 'session expired' });
            }

            const { code, billingCycle } = req.body; // billingCycle: 'monthly' | 'yearly'
            if (!code || !billingCycle) return res.status(400).json({ error: 'code and billingCycle are required' });

            const plan = await planModel.findPlanByCode(code);
            if (!plan) return res.status(404).json({ error: 'Plan not found' });

            const userId = req.session['user']._id;
            const recruiter = await recruiterDetailModel.findRecruiterDetailByUserId(userId);
            if (!recruiter) return res.status(404).json({ error: 'Recruiter profile not found' });

            const now = new Date();
            const end = new Date(now);
            if (plan.code === 'earlybird') {
                // Early Bird promotional plan: fixed 6-month validity
                end.setMonth(end.getMonth() + 6);
            } else if (billingCycle === 'monthly') {
                end.setMonth(end.getMonth() + 1);
            } else if (billingCycle === 'yearly') {
                end.setFullYear(end.getFullYear() + 1);
            } else {
                return res.status(400).json({ error: 'Invalid billingCycle' });
            }

            const update = {
                plan: plan._id,
                planStartDate: now,
                planEndDate: end,
                billingCycle: billingCycle,
                isCustomPlan: code === 'enterprise'
            };

            // Reset usage when plan changes
            usage.resetUsage(recruiter);
            update.usage = recruiter.usage;
            update.usageCycleStart = now;

            const status = await recruiterDetailModel.updateRecruiterDetail(recruiter._id, update);
            res.json({ status: 'success', plan: plan, recruiter: { _id: recruiter._id, ...update } });
        } catch (err) {
            res.status(500).json({ error: 'Failed to select plan', details: err.message });
        }
    });

    app.put('/api/plans/update/:id', async function(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role !== 'Admin') {
                return res.status(401).send({ status: 'Unauthorized' });
            }
            const id = req.params['id'];
            const updated = await planModel.updatePlanById(id, req.body || {});
            res.json(updated);
        } catch (err) {
            res.status(500).json({ error: 'Failed to update plan', details: err.message });
        }
    });

    // Admin: backfill Starter plan to recruiters without any plan
    app.post('/api/plans/backfill-starter', async function(req, res) {
        try {
            if (!req.session || !req.session['user'] || req.session['user'].role !== 'Admin') {
                return res.status(401).send({ status: 'Unauthorized' });
            }
            await ensureSeeded();
            const starter = await planModel.findPlanByCode('starter');
            if (!starter) return res.status(400).json({ error: 'Starter plan missing' });
            const recruiters = await recruiterDetailModel.findAllRecruiter();
            const now = new Date();
            let updated = 0;
            for (const r of recruiters) {
                if (!r.plan) {
                    const update = {
                        plan: starter._id,
                        planStartDate: now,
                        planEndDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
                        billingCycle: 'monthly',
                        isCustomPlan: false,
                        usageCycleStart: now,
                        usage: { jobPostsThisCycle: 0, aiJdThisCycle: 0, aiProfileAnalysisThisCycle: 0, jobBoostsThisCycle: 0 }
                    };
                    await recruiterDetailModel.updateRecruiterDetail(r._id, update);
                    updated++;
                }
            }
            res.json({ status: 'success', updated });
        } catch (err) {
            res.status(500).json({ error: 'Failed backfill', details: err.message });
        }
    });
};


