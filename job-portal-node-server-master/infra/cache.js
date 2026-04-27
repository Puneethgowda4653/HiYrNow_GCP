/**
 * Redis Cache Module
 * Centralized caching layer for hot reads and sessions
 */

const IORedis = require('ioredis');
const { createClient } = require('redis');
const { getConfig } = require('../config');

const config = getConfig();

// Create IORedis client for BullMQ and general caching
const ioRedisOptions = {
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

if (config.redisHost && config.redisHost.includes('upstash')) {
  ioRedisOptions.tls = {};
}

const redis = new IORedis(ioRedisOptions);

redis.on('connect', () => {
  console.log('Redis cache connected');
});

redis.on('error', (err) => {
  console.error('Redis cache error:', err);
});

// Create redis client for connect-redis (v9 requires redis package client)
const redisClientOptions = {
  socket: {
    host: config.redisHost,
    port: config.redisPort,
  },
  password: config.redisPassword,
};

if (config.redisHost && config.redisHost.includes('upstash')) {
  redisClientOptions.socket.tls = true;
}

const redisClient = createClient(redisClientOptions);

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis client for sessions connected');
});

// Connect the redis client
redisClient.connect().catch(console.error);

// Default TTL values (in seconds)
const TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 1800,          // 30 minutes
  HOUR: 3600,          // 1 hour
  DAY: 86400,          // 24 hours
  WEEK: 604800,        // 7 days
};

/**
 * Generate cache key
 * @param {string} prefix - Key prefix (e.g., 'user', 'job', 'filter')
 * @param {string|number} id - Entity ID
 * @param {string} suffix - Optional suffix
 * @returns {string}
 */
function cacheKey(prefix, id, suffix = '') {
  return suffix ? `${prefix}:${id}:${suffix}` : `${prefix}:${id}`;
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>}
 */
async function get(key) {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - TTL in seconds (default: MEDIUM)
 * @returns {Promise<boolean>}
 */
async function set(key, value, ttl = TTL.MEDIUM) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function del(key) {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., 'user:123:*')
 * @returns {Promise<number>} Number of keys deleted
 */
async function delPattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    console.error(`Cache delete pattern error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Cache wrapper for data fetching
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not in cache
 * @param {number} ttl - TTL in seconds
 * @returns {Promise<any>}
 */
async function wrap(key, fetchFn, ttl = TTL.MEDIUM) {
  // Try to get from cache
  let value = await get(key);
  
  if (value !== null) {
    return value;
  }

  // Fetch from source
  value = await fetchFn();
  
  if (value !== null && value !== undefined) {
    await set(key, value, ttl);
  }
  
  return value;
}

/**
 * Increment counter
 * @param {string} key - Cache key
 * @param {number} ttl - TTL for the key (only applies on first set)
 * @returns {Promise<number>} New value
 */
async function incr(key, ttl = null) {
  try {
    const value = await redis.incr(key);
    if (ttl && value === 1) {
      await redis.expire(key, ttl);
    }
    return value;
  } catch (error) {
    console.error(`Cache incr error for key ${key}:`, error);
    return 0;
  }
}

/**
 * Check if key exists
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function exists(key) {
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`Cache exists error for key ${key}:`, error);
    return false;
  }
}

/**
 * Set expiration on existing key
 * @param {string} key - Cache key
 * @param {number} ttl - TTL in seconds
 * @returns {Promise<boolean>}
 */
async function expire(key, ttl) {
  try {
    await redis.expire(key, ttl);
    return true;
  } catch (error) {
    console.error(`Cache expire error for key ${key}:`, error);
    return false;
  }
}

/**
 * Get multiple keys at once
 * @param {string[]} keys - Array of cache keys
 * @returns {Promise<any[]>}
 */
async function mget(keys) {
  try {
    const values = await redis.mget(...keys);
    return values.map(v => v ? JSON.parse(v) : null);
  } catch (error) {
    console.error('Cache mget error:', error);
    return keys.map(() => null);
  }
}

/**
 * Set multiple keys at once
 * @param {Object} keyValuePairs - Object with key-value pairs
 * @param {number} ttl - TTL in seconds
 * @returns {Promise<boolean>}
 */
async function mset(keyValuePairs, ttl = TTL.MEDIUM) {
  try {
    const pipeline = redis.pipeline();
    
    for (const [key, value] of Object.entries(keyValuePairs)) {
      pipeline.setex(key, ttl, JSON.stringify(value));
    }
    
    await pipeline.exec();
    return true;
  } catch (error) {
    console.error('Cache mset error:', error);
    return false;
  }
}

/**
 * Flush all cache (use with caution!)
 * @returns {Promise<boolean>}
 */
async function flushAll() {
  try {
    await redis.flushall();
    return true;
  } catch (error) {
    console.error('Cache flush error:', error);
    return false;
  }
}

/**
 * Get cache stats
 * @returns {Promise<Object>}
 */
async function getStats() {
  try {
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');
    
    return {
      info,
      keyspace,
      connected: redis.status === 'ready',
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return { connected: false };
  }
}

// Graceful shutdown
async function close() {
  await redis.quit();
  await redisClient.quit();
}

process.on('SIGTERM', close);
process.on('SIGINT', close);

module.exports = {
  redis,
  redisClient,
  TTL,
  cacheKey,
  get,
  set,
  del,
  delPattern,
  wrap,
  incr,
  exists,
  expire,
  mget,
  mset,
  flushAll,
  getStats,
  close,
};

