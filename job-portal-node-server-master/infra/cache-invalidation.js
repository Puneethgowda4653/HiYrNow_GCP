/**
 * Cache Invalidation Strategies
 * Manages cache invalidation on data writes
 */

const { del, delPattern, cacheKey } = require('./cache');

/**
 * Invalidate user-related caches
 * Called after user profile updates
 */
async function invalidateUser(userId) {
  const patterns = [
    cacheKey('user', userId),
    cacheKey('user', userId, '*'),
    cacheKey('profile', userId, '*'),
  ];

  let count = 0;
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      count += await delPattern(pattern);
    } else {
      await del(pattern);
      count++;
    }
  }

  console.log(`Invalidated ${count} user cache entries for userId=${userId}`);
  return count;
}

/**
 * Invalidate job posting caches
 * Called after job posting creation/update/deletion
 */
async function invalidateJobPosting(jobId) {
  const patterns = [
    cacheKey('job', jobId),
    cacheKey('job', jobId, '*'),
    'jobs:list:*',
    'jobs:search:*',
    'jobs:featured',
    'jobs:recent',
  ];

  let count = 0;
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      count += await delPattern(pattern);
    } else {
      await del(pattern);
      count++;
    }
  }

  console.log(`Invalidated ${count} job cache entries for jobId=${jobId}`);
  return count;
}

/**
 * Invalidate job application caches
 * Called after application creation/update
 */
async function invalidateJobApplication(applicationId, jobId, userId) {
  const patterns = [
    cacheKey('application', applicationId),
    cacheKey('applications', 'user', userId),
    cacheKey('applications', 'job', jobId),
    cacheKey('job', jobId, 'applications'),
    cacheKey('user', userId, 'applications'),
  ];

  let count = 0;
  for (const pattern of patterns) {
    await del(pattern);
    count++;
  }

  console.log(`Invalidated ${count} application cache entries`);
  return count;
}

/**
 * Invalidate recruiter detail caches
 * Called after recruiter profile updates
 */
async function invalidateRecruiter(recruiterId) {
  const patterns = [
    cacheKey('recruiter', recruiterId),
    cacheKey('recruiter', recruiterId, '*'),
    cacheKey('company', recruiterId),
  ];

  let count = 0;
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      count += await delPattern(pattern);
    } else {
      await del(pattern);
      count++;
    }
  }

  console.log(`Invalidated ${count} recruiter cache entries for recruiterId=${recruiterId}`);
  return count;
}

/**
 * Invalidate skill caches for a user
 * Called after skill add/update/delete
 */
async function invalidateSkills(userId) {
  const patterns = [
    cacheKey('skills', 'user', userId),
    cacheKey('user', userId, 'skills'),
  ];

  let count = 0;
  for (const pattern of patterns) {
    await del(pattern);
    count++;
  }

  console.log(`Invalidated ${count} skill cache entries for userId=${userId}`);
  return count;
}

/**
 * Invalidate experience caches for a user
 * Called after experience add/update/delete
 */
async function invalidateExperience(userId) {
  const patterns = [
    cacheKey('experience', 'user', userId),
    cacheKey('user', userId, 'experience'),
  ];

  let count = 0;
  for (const pattern of patterns) {
    await del(pattern);
    count++;
  }

  console.log(`Invalidated ${count} experience cache entries for userId=${userId}`);
  return count;
}

/**
 * Invalidate education caches for a user
 * Called after education add/update/delete
 */
async function invalidateEducation(userId) {
  const patterns = [
    cacheKey('education', 'user', userId),
    cacheKey('user', userId, 'education'),
  ];

  let count = 0;
  for (const pattern of patterns) {
    await del(pattern);
    count++;
  }

  console.log(`Invalidated ${count} education cache entries for userId=${userId}`);
  return count;
}

/**
 * Invalidate filter/search caches
 * Called when new jobs are posted or updated
 */
async function invalidateFilters() {
  const count = await delPattern('filter:*');
  console.log(`Invalidated ${count} filter cache entries`);
  return count;
}

/**
 * Invalidate dashboard caches
 * Called when data affecting dashboards changes
 */
async function invalidateDashboard(userId) {
  const patterns = [
    cacheKey('dashboard', userId),
    cacheKey('dashboard', userId, '*'),
  ];

  let count = 0;
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      count += await delPattern(pattern);
    } else {
      await del(pattern);
      count++;
    }
  }

  console.log(`Invalidated ${count} dashboard cache entries for userId=${userId}`);
  return count;
}

/**
 * Invalidate blog caches
 * Called after blog post creation/update/deletion
 */
async function invalidateBlog(blogId = null) {
  const patterns = blogId 
    ? [cacheKey('blog', blogId), 'blogs:list:*', 'blogs:featured']
    : ['blog:*', 'blogs:*'];

  let count = 0;
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      count += await delPattern(pattern);
    } else {
      await del(pattern);
      count++;
    }
  }

  console.log(`Invalidated ${count} blog cache entries`);
  return count;
}

/**
 * Invalidate AI analysis cache
 * Called when job or user profile changes significantly
 */
async function invalidateAIAnalysis(jobId, userId) {
  const key = cacheKey('ai-analysis', `${jobId}-${userId}`);
  await del(key);
  console.log(`Invalidated AI analysis cache for jobId=${jobId}, userId=${userId}`);
  return 1;
}

/**
 * Invalidate plan usage caches
 * Called when recruiter uses a feature
 */
async function invalidatePlanUsage(recruiterId) {
  const patterns = [
    cacheKey('plan-usage', recruiterId),
    cacheKey('recruiter', recruiterId, 'usage'),
  ];

  let count = 0;
  for (const pattern of patterns) {
    await del(pattern);
    count++;
  }

  console.log(`Invalidated ${count} plan usage cache entries for recruiterId=${recruiterId}`);
  return count;
}

/**
 * Bulk invalidation for user profile completion
 * Invalidates all user-related caches
 */
async function invalidateUserProfile(userId) {
  await Promise.all([
    invalidateUser(userId),
    invalidateSkills(userId),
    invalidateExperience(userId),
    invalidateEducation(userId),
    invalidateDashboard(userId),
  ]);
}

module.exports = {
  invalidateUser,
  invalidateJobPosting,
  invalidateJobApplication,
  invalidateRecruiter,
  invalidateSkills,
  invalidateExperience,
  invalidateEducation,
  invalidateFilters,
  invalidateDashboard,
  invalidateBlog,
  invalidateAIAnalysis,
  invalidatePlanUsage,
  invalidateUserProfile,
};

