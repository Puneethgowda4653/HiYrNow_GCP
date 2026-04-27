// Minimal configuration loader and validator
const requiredVars = ['MONGODB_URI'];

function parseAllowedOrigins(envValue) {
  if (!envValue) return [];
  return envValue.split(',').map(s => s.trim()).filter(Boolean);
}

function getConfig() {
  const {
    PORT,
    MONGODB_URI,
    ALLOWED_ORIGINS,
    HOSTNAME,
    SESSION_SECRET,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
  } = process.env;

  const missing = requiredVars.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    // Do not throw to avoid breaking local dev; log a clear message instead
    // You can enforce by throwing if desired.
    console.warn(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    port: Number(PORT) || 5500,
    mongodbUri: MONGODB_URI || '',
    allowedOrigins: parseAllowedOrigins(ALLOWED_ORIGINS) || [],
    hostname: HOSTNAME || 'https://hiyrnow.in',
    sessionSecret: SESSION_SECRET || 'change-this-secret-in-production',
    redisHost: REDIS_HOST || 'localhost',
    redisPort: Number(REDIS_PORT) || 6379,
    redisUsername: process.env.REDIS_USERNAME || 'default',
    redisPassword: REDIS_PASSWORD || undefined,
  };
}

module.exports = {
  getConfig,
};


