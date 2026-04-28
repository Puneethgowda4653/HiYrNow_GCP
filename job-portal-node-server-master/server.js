require('./infra/polyfills');
require('dotenv').config();

// Initialize OpenTelemetry FIRST (before any other imports)
const { initializeTelemetry, shutdownTelemetry } = require('./infra/telemetry');
if (process.env.TELEMETRY_ENABLED !== 'false') {
  initializeTelemetry();
}

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const { getConfig } = require('./config/index');
const { requestIdMiddleware, logRequest } = require('./infra/logger');
const { errorHandler } = require('./middleware/error-handler');
const { redisClient } = require('./infra/cache');
const { metricsMiddleware, tracingMiddleware } = require('./middleware/metrics');
const path = require('path');

// Import RedisStore from connect-redis v9 (CJS named export)
const { RedisStore } = require('connect-redis');

const config = getConfig();
const app = express();

// --- MongoDB Connection Priority ---
const mongoUri = config.mongodbUri || process.env.MONGODB_URI;
console.log('--- DEBUG STARTUP ---');
console.log('MONGODB_URI exists:', !!mongoUri);
console.log('Connecting to MongoDB...');

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ Connected to MongoDB successfully'))
.catch(err => {
  console.error('❌ Error connecting to MongoDB:', err.message);
});
// ------------------------------------

// Behind nginx/any reverse proxy, trust the first proxy hop so secure cookies work
app.set('trust proxy', 1);

const PORT = config.port || process.env.PORT || 3000;

// Common middlewares that do not depend on session
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(requestIdMiddleware);
app.use(logRequest);

// Add metrics and tracing middleware
if (process.env.TELEMETRY_ENABLED !== 'false') {
  app.use(tracingMiddleware());
  app.use(metricsMiddleware());
}

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = config.allowedOrigins && config.allowedOrigins.length > 0
    ? config.allowedOrigins
    : ['http://localhost:4200', 'http://localhost:3000', 'https://hiyrnow.in', 'https://hiyrnow-d5f7b.web.app', 'https://hiyrnow-d5f7b.firebaseapp.com'];

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (origin && origin.includes('localhost')) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "false");
  } else {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");

  if (origin) {
    res.header("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic root route
app.get('/', (req, res) => {
  res.send('Hello, this is your server!');
});

// Health checks (outside init so they always respond)
app.get('/healthz', (req, res) => res.status(200).send('OK'));
app.get('/readyz', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not_ready', dbState: mongoose.connection.readyState });
  }
});

// Sitemap generator (restored from original)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const JobPostingModel = require('./models/job-posting.model.server');
    const UserModel = require('./models/user.model.server');
    const BlogModel = require('./models/blog.model.server');

    const staticLinks = [
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/login', changefreq: 'monthly', priority: 0.5 },
      { url: '/register-seeker', changefreq: 'monthly', priority: 0.5 },
      { url: '/register-recruiter', changefreq: 'monthly', priority: 0.5 },
      { url: '/jobs', changefreq: 'daily', priority: 0.9 },
      { url: '/about', changefreq: 'monthly', priority: 0.3 },
      { url: '/contact', changefreq: 'monthly', priority: 0.3 },
    ];

    const jobs = await JobPostingModel.findAllJobPostings();
    const jobLinks = (jobs || []).map(job => ({
      url: `/job-detail/${job._id}`,
      changefreq: 'weekly',
      priority: 0.7
    }));

    const users = await UserModel.findAllUsers();
    const userLinks = (users || []).map(user => ({
      url: `/profile-seeker/${user._id}`,
      changefreq: 'weekly',
      priority: 0.8
    }));

    const blogs = await BlogModel.findAllBlogs();
    const blogLinks = (blogs || []).map(blog => ({
      url: `/blog/${blog._id}`,
      changefreq: 'daily',
      priority: 0.9
    }));

    const allLinks = [...staticLinks, ...jobLinks, ...userLinks, ...blogLinks];
    const stream = new SitemapStream({ hostname: config.hostname });
    const xml = await streamToPromise(Readable.from(allLinks).pipe(stream)).then(data => data.toString());

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Error generating sitemap:', err);
    res.status(500).send('Error generating sitemap');
  }
});

let gfs;
mongoose.connection.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'profile-pictures'
  });
});

// Wrap remaining setup in an init async function to ensure redis is ready before session mount
async function init() {
  try {
    if (redisClient) {
      if (typeof redisClient.connect === 'function') {
        if (!redisClient.isOpen && !redisClient.connected) {
          await redisClient.connect().catch(err => {
            console.error('Initial Redis connection failed (will retry or fallback):', err.message);
          });
        }
      }
    }
  } catch (err) {
    console.error('Error in redis initialization:', err);
  }

  // Now mount session middleware
  try {
    let sessionStore;
    
    // Improved readiness check: Only use Redis if it is open AND authenticated (no error)
    // We'll give it a moment to connect if it hasn't yet, but fallback quickly.
    const checkRedisReadiness = async () => {
      if (!redisClient) return false;
      if (redisClient.isOpen || redisClient.connected) {
        // Try a simple PING to see if it's actually authenticated
        try {
          // Some clients use .ping(), some need .sendCommand(['PING'])
          const pingResult = await Promise.race([
            redisClient.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);
          return pingResult === 'PONG';
        } catch (e) {
          console.warn('Redis PING failed, likely auth error:', e.message);
          return false;
        }
      }
      return false;
    };

    // Default to MemoryStore (resilient fallback)
    sessionStore = new session.MemoryStore();
    console.log('ℹ️ Initialized MemoryStore (default fallback).');

    const isRedisActuallyReady = await checkRedisReadiness();

    if (isRedisActuallyReady) {
      try {
        sessionStore = new RedisStore({
          client: redisClient,
          prefix: 'sess:',
        });
        console.log('✅ Switched to RedisStore for sessions.');
      } catch (redisErr) {
        console.warn('⚠️ Failed to initialize RedisStore, staying with MemoryStore:', redisErr.message);
      }
    } else {
      console.warn('⚠️ Redis not available; staying with MemoryStore for sessions.');
    }

    const isProdEnv = process.env.NODE_ENV === 'production';
    const cookieSecureOverride = process.env.SESSION_COOKIE_SECURE;
    const cookieSameSiteOverride = process.env.SESSION_COOKIE_SAMESITE;

    const cookieSecure = typeof cookieSecureOverride === 'string'
      ? cookieSecureOverride === 'true'
      : isProdEnv;

    const cookieSameSite = cookieSameSiteOverride
      ? cookieSameSiteOverride
      : (isProdEnv ? 'none' : 'lax');

    app.use(session({
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      secret: config.sessionSecret || process.env.SESSION_SECRET || 'change-this-secret',
      name: 'sessionId',
      cookie: {
        maxAge: 30 * 60 * 1000,
        httpOnly: true,
        secure: true, // Always true on Cloud Run
        sameSite: 'none', // Required for cross-domain (Firebase -> Cloud Run)
        partitioned: true, // Required for modern browser third-party cookie restrictions
      },
    }));
    console.log('Session middleware mounted.');
  } catch (err) {
    console.error('Failed to mount session middleware:', err);
  }

  // Register services (Corrected Paths)
  require('./services/user.service.server')(app);
  require('./services/skill.service.server')(app);
  require('./services/award.service.server')(app);
  require('./services/certificate.service.server')(app);
  require('./services/education.service.server')(app);
  require('./services/extra-curricular.service.server')(app);
  require('./services/experience.service.server')(app);
  require('./services/job-application.service.server')(app);
  require('./services/job-posting.service.server')(app);
  require('./services/project.service.server')(app);
  require('./services/recruiter-detail.service.server')(app);
  require('./services/resume.service.server')(app);
  require('./services/profilePicture.service.server')(app);
  require('./services/filter.service.server')(app);
  require('./services/dashboard.service.enhanced')(app);
  require('./services/blog.service.server')(app);
  require('./services/request.service.server')(app);
  require('./services/pvc.service.server')(app);
  require('./services/plan.service.server')(app);
  require('./services/referral.service.server')(app);
  require('./services/admin.service.server')(app);
  require('./services/payment.service.server')(app);
  require('./services/queue.service.server')(app);

  app.options('*', (req, res) => res.sendStatus(200));

  // Health checks are registered above (before init) so they always respond

  // Global Error Handler
  app.use(errorHandler);

  // Start Server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`${signal} received. Starting graceful shutdown...`);
    if (server) {
      server.close(async () => {
        console.log('HTTP server closed');
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed');
          if (redisClient && (redisClient.isOpen || redisClient.connected)) {
            await redisClient.quit();
            console.log('Redis client closed');
          }
          if (process.env.TELEMETRY_ENABLED !== 'false') {
            await shutdownTelemetry();
          }
          process.exit(0);
        } catch (err) {
          console.error('Error during shutdown:', err);
          process.exit(1);
        }
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

init().catch(err => {
  console.error('Fatal error during init:', err);
  process.exit(1);
});
