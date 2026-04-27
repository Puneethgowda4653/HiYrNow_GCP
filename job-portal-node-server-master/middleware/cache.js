/**
 * Cache Middleware
 * HTTP response caching middleware
 */

const { get, set, cacheKey, TTL } = require('../infra/cache');

/**
 * Cache middleware factory
 * @param {Object} options - Caching options
 * @param {Function} options.keyGenerator - Function to generate cache key from req
 * @param {number} options.ttl - TTL in seconds (default: MEDIUM)
 * @param {Function} options.condition - Conditional caching (return false to skip cache)
 * @returns {Function} Express middleware
 */
function cacheMiddleware(options = {}) {
  const {
    keyGenerator = (req) => `route:${req.path}`,
    ttl = TTL.MEDIUM,
    condition = () => true,
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition
    if (!condition(req)) {
      return next();
    }

    try {
      const key = keyGenerator(req);
      
      // Try to get from cache
      const cachedData = await get(key);
      
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Cache miss - intercept res.json to cache the response
      res.setHeader('X-Cache', 'MISS');
      
      const originalJson = res.json.bind(res);
      res.json = function(data) {
        // Cache the response
        set(key, data, ttl).catch(err => {
          console.error('Cache set error:', err);
        });
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Cache user profile responses
 */
function cacheUserProfile(ttl = TTL.MEDIUM) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      const userId = req.params.userId || req.user?._id;
      return cacheKey('user', userId);
    },
    ttl,
  });
}

/**
 * Cache job posting responses
 */
function cacheJobPosting(ttl = TTL.LONG) {
  return cacheMiddleware({
    keyGenerator: (req) => cacheKey('job', req.params.jobId),
    ttl,
  });
}

/**
 * Cache job list responses
 */
function cacheJobList(ttl = TTL.MEDIUM) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      const { location, keyword, page = 1 } = req.query;
      return `jobs:list:${location || 'all'}:${keyword || 'all'}:${page}`;
    },
    ttl,
  });
}

/**
 * Cache filter results
 */
function cacheFilters(ttl = TTL.LONG) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      const queryString = JSON.stringify(req.query);
      return `filter:${Buffer.from(queryString).toString('base64')}`;
    },
    ttl,
  });
}

/**
 * Cache dashboard data
 */
function cacheDashboard(ttl = TTL.SHORT) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      const userId = req.params.userId || req.user?._id;
      return cacheKey('dashboard', userId);
    },
    ttl,
  });
}

/**
 * Cache blog posts
 */
function cacheBlog(ttl = TTL.HOUR) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      if (req.params.blogId) {
        return cacheKey('blog', req.params.blogId);
      }
      const page = req.query.page || 1;
      return `blogs:list:${page}`;
    },
    ttl,
  });
}

/**
 * Cache skills for user
 */
function cacheSkills(ttl = TTL.MEDIUM) {
  return cacheMiddleware({
    keyGenerator: (req) => {
      const userId = req.params.userId || req.user?._id;
      return cacheKey('skills', 'user', userId);
    },
    ttl,
  });
}

/**
 * Cache authenticated user only
 */
function cacheAuthenticatedOnly(ttl = TTL.MEDIUM) {
  return cacheMiddleware({
    keyGenerator: (req) => `user:${req.user._id}:${req.path}`,
    ttl,
    condition: (req) => !!req.user,
  });
}

module.exports = {
  cacheMiddleware,
  cacheUserProfile,
  cacheJobPosting,
  cacheJobList,
  cacheFilters,
  cacheDashboard,
  cacheBlog,
  cacheSkills,
  cacheAuthenticatedOnly,
};

