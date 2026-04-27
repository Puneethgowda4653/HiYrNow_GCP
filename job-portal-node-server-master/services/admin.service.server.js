module.exports = function (app) {
    const session = require('express-session');
    const mongoose = require('mongoose');

    // Models
    const User = require('../models/user/user.model.server');
    const Job = require('../models/job-posting/job-posting.model.server');
    const Plan = require('../models/pricing-plan/plan.model.server');
    const RecruiterDetail = require('../models/recruiter-detail/recruiter-detail.model.server');
    const Referral = require('../models/referral/referral.model.server');
    const AIResult = require('../models/ai-analysis-result.model.server');
    let AdminLog;
    try {
        AdminLog = require('../models/admin-log/admin-log.model.server');
    } catch (e) {
        AdminLog = null;
    }

    // Ensure session (keep consistent with existing services)
    // Note: Don't override session middleware if already set by user.service
    // Session middleware should already be configured in user.service.server.js

    // Helper: ensure admin session from user session if needed
    async function ensureAdminSession(req) {
        // If admin session exists, use it
        if (req.session && req.session['admin']) {
            return true;
        }
        // If user session exists with Admin role, create admin session
        if (req.session && req.session['user'] && req.session['user'].role === 'Admin') {
            const u = req.session['user'];
            const adminRoleMap = {
                'Admin': 'super-admin',
                'ContentAdmin': 'content-admin',
                'FinanceAdmin': 'finance-admin',
                'AIMonitor': 'ai-monitor'
            };
            const mapped = adminRoleMap[u.role] || 'super-admin';
            req.session['admin'] = { _id: u._id, email: u.email, role: mapped, name: u.username };
            return true;
        }
        return false;
    }

    // Role-based middleware
    async function requireAdmin(req, res, next) {
        const hasAdmin = await ensureAdminSession(req);
        if (!hasAdmin) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    }

    function requireRoles(roles) {
        return async function (req, res, next) {
            const hasAdmin = await ensureAdminSession(req);
            if (!hasAdmin) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const role = req.session['admin'].role;
            if (!roles.includes(role)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            next();
        };
    }

    async function logAdmin(req, action, meta) {
        if (!AdminLog) return;
        try {
            await AdminLog.createLog({
                adminId: req.session?.admin?._id || null,
                action,
                meta: meta || {},
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
        } catch (e) {
            // non-blocking
        }
    }

    // Auth
    app.post('/api/admin/login', async (req, res) => {
        try {
            const { email, password } = req.body || {};
            if (!email || !password) return res.status(400).json({ error: 'email and password required' });
            const userModel = require('../models/user/user.model.server');
            const bcrypt = require('bcryptjs');
            const u = await userModel.findUserByCredentials(email);
            if (!u) return res.status(401).json({ error: 'Invalid credentials' });
            const ok = await bcrypt.compare(password, u.password || '');
            if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
            // allowed admin roles
            const adminRoleMap = {
                'Admin': 'super-admin',
                'ContentAdmin': 'content-admin',
                'FinanceAdmin': 'finance-admin',
                'AIMonitor': 'ai-monitor'
            };
            const mapped = adminRoleMap[u.role] || null;
            if (!mapped) return res.status(403).json({ error: 'Not an admin' });
            req.session['admin'] = { _id: u._id, email: u.email, role: mapped, name: u.username };
            await logAdmin(req, 'admin_login');
            return res.json({ status: 'success', role: mapped });
        } catch (e) {
            return res.status(500).json({ error: 'Login failed' });
        }
    });

    app.post('/api/admin/logout', requireAdmin, async (req, res) => {
        await logAdmin(req, 'admin_logout');
        delete req.session['admin'];
        res.json({ status: 'ok' });
    });

    // Check admin session status
    app.get('/api/admin/session', async (req, res) => {
        const hasAdmin = await ensureAdminSession(req);
        if (hasAdmin && req.session['admin']) {
            return res.json({ authenticated: true, admin: req.session['admin'] });
        }
        return res.json({ authenticated: false });
    });

    // Summary
    app.get('/api/admin/summary', requireAdmin, async (req, res) => {
        try {
            const [users, recruiters, seekers, jobs] = await Promise.all([
                require('../models/user/user.model.server').findAllUsers(),
                RecruiterDetail.findAllRecruiter(),
                require('../models/user/user.model.server').findUsersByRole && require('../models/user/user.model.server').findUsersByRole('JobSeeker') || [],
                Job.findAllJobPostings()
            ]);

            const totalUsers = users.length;
            const totalRecruiters = recruiters.length;
            const totalSeekers = Array.isArray(seekers) ? seekers.length : users.filter(u => u.role === 'JobSeeker').length;
            const totalJobs = jobs.length;
            const revenue = 0; // placeholder if no transactions collection
            res.json({ totalUsers, totalRecruiters, totalSeekers, totalJobs, revenue });
        } catch (e) {
            res.status(500).json({ error: 'Failed to load summary' });
        }
    });

    // Users (list + status)
    app.get('/api/admin/users', requireRoles(['super-admin', 'content-admin', 'finance-admin', 'ai-monitor']), async (req, res) => {
        try {
            const { page = 1, pageSize = 20, email, role, status, from, to } = req.query;
            const q = {};
            if (email) q['email'] = new RegExp(email, 'i');
            if (role) q['role'] = role;
            if (status) q['status'] = status;
            if (from || to) q['createdAt'] = {};
            if (from) q['createdAt'].$gte = new Date(from);
            if (to) q['createdAt'].$lte = new Date(to);

            const M = mongoose.model('UserModel');
            const skip = (parseInt(page) - 1) * parseInt(pageSize);
            const [items, total] = await Promise.all([
                M.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(pageSize)),
                M.countDocuments(q)
            ]);
            res.json({ items, total, page: parseInt(page), pageSize: parseInt(pageSize) });
        } catch (e) {
            res.status(500).json({ error: 'Failed to load users' });
        }
    });

    app.patch('/api/admin/users/:id/status', requireRoles(['super-admin']), async (req, res) => {
        try {
            const { status } = req.body || {};
            if (!status) return res.status(400).json({ error: 'status required' });
            const M = mongoose.model('UserModel');
            const updated = await M.findByIdAndUpdate(req.params.id, { status }, { new: true });
            await logAdmin(req, 'user_status_change', { userId: req.params.id, status });
            res.json(updated);
        } catch (e) {
            res.status(500).json({ error: 'Failed to update status' });
        }
    });

    // Jobs
    app.get('/api/admin/jobs', requireRoles(['super-admin', 'content-admin']), async (req, res) => {
        try {
            const { page = 1, pageSize = 20, company, title, status, location } = req.query;
            const q = {};
            if (company) q['company'] = new RegExp(company, 'i');
            if (title) q['title'] = new RegExp(title, 'i');
            if (status) q['status'] = status;
            if (location) q['location'] = new RegExp(location, 'i');

            const M = mongoose.model('JobPostingModel');
            const skip = (parseInt(page) - 1) * parseInt(pageSize);
            const [items, total] = await Promise.all([
                M.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(pageSize)).populate('recruiter'),
                M.countDocuments(q)
            ]);
            res.json({ items, total, page: parseInt(page), pageSize: parseInt(pageSize) });
        } catch (e) {
            res.status(500).json({ error: 'Failed to load jobs' });
        }
    });

    app.patch('/api/admin/jobs/:id/status', requireRoles(['super-admin', 'content-admin']), async (req, res) => {
        try {
            const { status } = req.body || {};
            if (!status) return res.status(400).json({ error: 'status required' });
            const M = mongoose.model('JobPostingModel');
            const updated = await M.findByIdAndUpdate(req.params.id, { status }, { new: true });
            await logAdmin(req, 'job_status_change', { jobId: req.params.id, status });
            res.json(updated);
        } catch (e) {
            res.status(500).json({ error: 'Failed to update job' });
        }
    });

    // Plans
    app.get('/api/admin/plans', requireRoles(['super-admin', 'finance-admin']), async (req, res) => {
        try {
            const plans = await Plan.findAllPlans();
            res.json(plans);
        } catch (e) {
            res.status(500).json({ error: 'Failed to load plans' });
        }
    });

    app.post('/api/admin/plans', requireRoles(['super-admin', 'finance-admin']), async (req, res) => {
        try {
            const created = await Plan.createPlan(req.body || {});
            await logAdmin(req, 'plan_create', { planId: created?._id });
            res.json(created);
        } catch (e) {
            res.status(500).json({ error: 'Failed to create plan' });
        }
    });

    app.put('/api/admin/plans/:id', requireRoles(['super-admin', 'finance-admin']), async (req, res) => {
        try {
            const updated = await Plan.updatePlanById(req.params.id, req.body || {});
            await logAdmin(req, 'plan_update', { planId: req.params.id });
            res.json(updated);
        } catch (e) {
            res.status(500).json({ error: 'Failed to update plan' });
        }
    });

    // Referrals
    app.get('/api/admin/referrals', requireRoles(['super-admin', 'finance-admin']), async (req, res) => {
        try {
            const items = await Referral.findAllReferrals ? Referral.findAllReferrals() : Referral.find();
            res.json(items);
        } catch (e) {
            res.status(500).json({ error: 'Failed to load referrals' });
        }
    });

    // AI & Resume analytics
    app.get('/api/admin/analytics/ai', requireRoles(['super-admin', 'ai-monitor']), async (req, res) => {
        try {
            const totalAIResults = await (AIResult.countDocuments ? AIResult.countDocuments({}) : 0);
            // If ai result schema has fields type: 'resume' | 'jd', compute breakdown
            let resumeParses = 0, jdGenerations = 0;
            try {
                resumeParses = await AIResult.countDocuments({ type: 'resume' });
                jdGenerations = await AIResult.countDocuments({ type: 'jd' });
            } catch (_) {}
            res.json({ totalAIResults, resumeParses, jdGenerations });
        } catch (e) {
            res.status(500).json({ error: 'Failed to load AI analytics' });
        }
    });

    // Admin logs
    app.get('/api/admin/logs', requireRoles(['super-admin']), async (req, res) => {
        if (!AdminLog) return res.json([]);
        try {
            const items = await AdminLog.findLogs({ limit: 200 });
            res.json(items);
        } catch (e) {
            res.status(500).json({ error: 'Failed to load logs' });
        }
    });
};


