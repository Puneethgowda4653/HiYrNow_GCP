/**
 * Redis Cache Module
 * Centralized caching layer for hot reads and sessions
 * Gracefully degrades to no-ops when Redis is not configured
 */

const { getConfig } = require('../config');
const config = getConfig();

const REDIS_ENABLED = !!(config.redisHost && config.redisHost.trim());

let redis = null;
let redisClient = null;

if (REDIS_ENABLED) {
  console.log(`Redis enabled: connecting to ${config.redisHost}:${config.redisPort}`);

  const IORedis = require('ioredis');
  const { createClient } = require('redis');

  let redisErrorLogged = false;
  const ioRedisOptions = {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('Redis IORedis: max retries reached, giving up.');
        return null;
      }
      return Math.min(times * 1000, 3000);
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
  };

  if (config.redisHost.includes('upstash')) {
    ioRedisOptions.tls = {};
  }

  redis = new IORedis(ioRedisOptions);

  redis.on('connect', () => {
    console.log('Redis cache connected');
    redisErrorLogged = false;
  });

  redis.on('error', (err) => {
    if (!redisErrorLogged) {
      console.error('Redis cache error:', err.message || err);
      redisErrorLogged = true;
    }
  });

  let sessionRedisErrorLogged = false;
  const redisClientOptions = {
    socket: {
      host: config.redisHost,
      port: config.redisPort,
      connectTimeout: 10000,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.warn('Redis session client: max retries reached, giving up.');
          return false;
        }
        return Math.min(retries * 1000, 3000);
      },
    },
    password: config.redisPassword,
  };

  if (config.redisHost.includes('upstash')) {
    redisClientOptions.socket.tls = true;
  }

  redisClient = createClient(redisClientOptions);

  redisClient.on('error', (err) => {
    if (!sessionRedisErrorLogged) {
      console.error('Redis session client error:', err.message || err);
      sessionRedisErrorLogged = true;
    }
  });

  redisClient.on('connect', () => {
    console.log('Redis client for sessions connected');
    sessionRedisErrorLogged = false;
  });

  redisClient.connect().catch((err) => {
    console.warn('Redis session client initial connect failed:', err.message);
  });
} else {
  console.log('Redis NOT configured — using in-memory fallback for sessions/cache');
}

// Default TTL values (in seconds)
const TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 1800,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
};

function cacheKey(prefix, id, suffix = '') {
  return suffix ? `${prefix}:${id}:${suffix}` : `${prefix}:${id}`;
}

async function get(key) {
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    return null;
  }
}

async function set(key, value, ttl = TTL.MEDIUM) {
  if (!redis) return false;
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

async function del(key) {
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    return false;
  }
}

async function delPattern(pattern) {
  if (!redis) return 0;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    return 0;
  }
}

async function wrap(key, fetchFn, ttl = TTL.MEDIUM) {
  let value = await get(key);
  if (value !== null) return value;
  value = await fetchFn();
  if (value !== null && value !== undefined) {
    await set(key, value, ttl);
  }
  return value;
}

async function incr(key, ttl = null) {
  if (!redis) return 0;
  try {
    const value = await redis.incr(key);
    if (ttl && value === 1) await redis.expire(key, ttl);
    return value;
  } catch (error) {
    return 0;
  }
}

async function exists(key) {
  if (!redis) return false;
  try {
    return (await redis.exists(key)) === 1;
  } catch (error) {
    return false;
  }
}

async function expire(key, ttl) {
  if (!redis) return false;
  try {
    await redis.expire(key, ttl);
    return true;
  } catch (error) {
    return false;
  }
}

async function mget(keys) {
  if (!redis) return keys.map(() => null);
  try {
    const values = await redis.mget(...keys);
    return values.map(v => v ? JSON.parse(v) : null);
  } catch (error) {
    return keys.map(() => null);
  }
}

async function mset(keyValuePairs, ttl = TTL.MEDIUM) {
  if (!redis) return false;
  try {
    const pipeline = redis.pipeline();
    for (const [key, value] of Object.entries(keyValuePairs)) {
      pipeline.setex(key, ttl, JSON.stringify(value));
    }
    await pipeline.exec();
    return true;
  } catch (error) {
    return false;
  }
}

async function flushAll() {
  if (!redis) return false;
  try {
    await redis.flushall();
    return true;
  } catch (error) {
    return false;
  }
}

async function getStats() {
  if (!redis) return { connected: false, mode: 'disabled' };
  try {
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');
    return { info, keyspace, connected: redis.status === 'ready' };
  } catch (error) {
    return { connected: false };
  }
}

async function close() {
  if (redis && redis.status !== 'end') {
    await redis.quit().catch(() => {});
  }
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit().catch(() => {});
  }
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
