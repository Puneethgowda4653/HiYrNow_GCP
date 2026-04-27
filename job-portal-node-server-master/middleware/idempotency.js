/**
 * Idempotency Middleware
 * 
 * Ensures that duplicate requests (same idempotency key) return the same response
 * without re-executing the operation. Critical for payment and webhook endpoints.
 * 
 * Usage:
 *   app.post('/api/payment', idempotency({ ttl: 86400 }), handler);
 */

const { redis } = require('../infra/cache');
const logger = require('../infra/logger').logger;
const crypto = require('crypto');

/**
 * Idempotency middleware factory
 * @param {Object} options - Configuration options
 * @param {number} options.ttl - Time to live in seconds (default: 24 hours)
 * @param {string} options.headerName - Header name for idempotency key (default: 'Idempotency-Key')
 * @param {boolean} options.required - Whether idempotency key is required (default: false)
 * @param {Function} options.generateKey - Custom key generator function
 * @returns {Function} Express middleware
 */
function idempotency(options = {}) {
  const {
    ttl = 86400, // 24 hours
    headerName = 'Idempotency-Key',
    required = false,
    generateKey = null,
  } = options;

  return async (req, res, next) => {
    try {
      // Get idempotency key from header or generate one
      let idempotencyKey = req.headers[headerName.toLowerCase()];
      
      if (!idempotencyKey && generateKey) {
        idempotencyKey = generateKey(req);
      }
      
      if (!idempotencyKey) {
        if (required) {
          return res.status(400).json({
            error: 'Missing idempotency key',
            message: `${headerName} header is required for this endpoint`,
          });
        }
        // If not required, skip idempotency check
        return next();
      }
      
      // Validate idempotency key format (UUID or alphanumeric)
      const isValidKey = /^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey);
      if (!isValidKey) {
        return res.status(400).json({
          error: 'Invalid idempotency key',
          message: 'Idempotency key must be 8-128 alphanumeric characters, hyphens, or underscores',
        });
      }
      
      // Create Redis key
      const redisKey = `idempotency:${req.method}:${req.path}:${idempotencyKey}`;
      
      // Check if request is already being processed
      const lockKey = `${redisKey}:lock`;
      const isLocked = await redis.set(lockKey, '1', 'EX', 10, 'NX'); // 10 second lock
      
      if (!isLocked) {
        // Request is currently being processed
        return res.status(409).json({
          error: 'Concurrent request',
          message: 'A request with this idempotency key is currently being processed',
        });
      }
      
      // Check if response already exists
      const cachedResponse = await redis.get(redisKey);
      
      if (cachedResponse) {
        // Return cached response
        const response = JSON.parse(cachedResponse);
        logger.info('Idempotent request - returning cached response', {
          idempotencyKey,
          path: req.path,
          method: req.method,
        });
        
        // Release lock
        await redis.del(lockKey);
        
        // Set headers to indicate cached response
        res.setHeader('X-Idempotency-Cached', 'true');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        
        return res.status(response.statusCode).json(response.body);
      }
      
      // Store idempotency key for handler to use
      req.idempotencyKey = idempotencyKey;
      req.idempotencyRedisKey = redisKey;
      
      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(body) {
        // Cache successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responseToCache = {
            statusCode: res.statusCode,
            body,
          };
          
          // Store in Redis with TTL
          redis.setex(redisKey, ttl, JSON.stringify(responseToCache))
            .then(() => {
              logger.info('Cached idempotent response', {
                idempotencyKey,
                path: req.path,
                statusCode: res.statusCode,
                ttl,
              });
            })
            .catch(err => {
              logger.error('Failed to cache idempotent response', {
                idempotencyKey,
                error: err.message,
              });
            });
        }
        
        // Release lock
        redis.del(lockKey).catch(err => {
          logger.error('Failed to release idempotency lock', {
            idempotencyKey,
            error: err.message,
          });
        });
        
        // Set header to indicate original response
        res.setHeader('X-Idempotency-Cached', 'false');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        
        return originalJson(body);
      };
      
      // Also intercept res.send for non-JSON responses
      const originalSend = res.send.bind(res);
      res.send = function(body) {
        // Release lock if not already released
        redis.del(lockKey).catch(err => {
          logger.error('Failed to release idempotency lock on send', {
            idempotencyKey,
            error: err.message,
          });
        });
        
        return originalSend(body);
      };
      
      next();
    } catch (error) {
      logger.error('Idempotency middleware error', {
        error: error.message,
        path: req.path,
        method: req.method,
      });
      next(error);
    }
  };
}

/**
 * Generate idempotency key from request body (for backward compatibility)
 * Useful when client doesn't send Idempotency-Key header
 * @param {Object} req - Express request object
 * @param {Array<string>} fields - Fields to include in hash
 * @returns {string} Generated idempotency key
 */
function generateIdempotencyKey(req, fields = []) {
  const data = fields.length > 0
    ? fields.map(f => req.body[f]).join('|')
    : JSON.stringify(req.body);
  
  return crypto
    .createHash('sha256')
    .update(`${req.session?.user?._id || 'anonymous'}|${data}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Payment-specific idempotency middleware
 * Generates key from user + amount + plan if not provided
 */
function paymentIdempotency(options = {}) {
  return idempotency({
    ...options,
    ttl: 86400 * 7, // 7 days for payments
    generateKey: (req) => {
      const { planId, amount, paymentMethod } = req.body;
      const userId = req.session?.user?._id || 'anonymous';
      return generateIdempotencyKey(req, [userId, planId, amount, paymentMethod]);
    },
  });
}

/**
 * Webhook-specific idempotency middleware
 * Uses webhook event ID as idempotency key
 */
function webhookIdempotency(options = {}) {
  return idempotency({
    ...options,
    headerName: 'X-Webhook-Id', // Common webhook header
    required: true, // Webhooks should always have an ID
    ttl: 86400 * 30, // 30 days for webhooks
    generateKey: (req) => {
      // Fallback to body.id if header not present
      return req.body?.id || req.body?.event_id || null;
    },
  });
}

/**
 * Clear idempotency cache for a specific key
 * Useful for manual invalidation or testing
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {string} idempotencyKey - The idempotency key
 */
async function clearIdempotencyCache(method, path, idempotencyKey) {
  const redisKey = `idempotency:${method}:${path}:${idempotencyKey}`;
  await redis.del(redisKey);
  logger.info('Cleared idempotency cache', { method, path, idempotencyKey });
}

/**
 * Get cached response for idempotency key (for debugging)
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {string} idempotencyKey - The idempotency key
 * @returns {Promise<Object|null>}
 */
async function getIdempotencyCache(method, path, idempotencyKey) {
  const redisKey = `idempotency:${method}:${path}:${idempotencyKey}`;
  const cached = await redis.get(redisKey);
  return cached ? JSON.parse(cached) : null;
}

module.exports = {
  idempotency,
  paymentIdempotency,
  webhookIdempotency,
  generateIdempotencyKey,
  clearIdempotencyCache,
  getIdempotencyCache,
};

