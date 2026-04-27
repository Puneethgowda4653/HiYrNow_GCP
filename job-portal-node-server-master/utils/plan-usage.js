	function ensureCycle(recruiter) {
	    const now = new Date();
	    if (!recruiter.usageCycleStart) {
	        recruiter.usageCycleStart = now;
	        resetUsage(recruiter);
	        return recruiter;
	    }
	    const start = new Date(recruiter.usageCycleStart);
	    const crossedMonth = start.getFullYear() !== now.getFullYear() || start.getMonth() !== now.getMonth();
	    if (crossedMonth) {
	        recruiter.usageCycleStart = now;
	        resetUsage(recruiter);
	    }
	    return recruiter;
	}

function resetUsage(recruiter) {
    recruiter.usage = recruiter.usage || {};
    recruiter.usage.jobPostsThisCycle = 0;
    recruiter.usage.aiJdThisCycle = 0;
    recruiter.usage.aiProfileAnalysisThisCycle = 0;
    recruiter.usage.jobBoostsThisCycle = 0;
    recruiter.usage.candidateProfileCredits = 0;
}

function parseMonthlyLimit(featureValue) {
    if (!featureValue) return Infinity;
    const v = String(featureValue).toLowerCase();
    if (v.includes('unlimited')) return Infinity;
    const match = v.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}

module.exports = {
    ensureCycle,
    resetUsage,
    parseMonthlyLimit
};


