/**
 * Metrics Middleware
 * 
 * Automatically tracks HTTP request metrics:
 * - Request count
 * - Request duration
 * - Request/response sizes
 * - Status codes
 */

const { getMetrics, getTracer } = require('../infra/telemetry');
const { trace, context } = require('@opentelemetry/api');

/**
 * Middleware to track HTTP metrics
 */
function metricsMiddleware() {
  const metrics = getMetrics();
  const tracer = getTracer();

  return (req, res, next) => {
    const startTime = Date.now();
    const startHrTime = process.hrtime();

    // Get request size
    const requestSize = parseInt(req.headers['content-length'] || '0', 10);

    // Store original res.json and res.send
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Track response
    const recordMetrics = () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      
      // Get response size
      const responseSize = parseInt(res.get('Content-Length') || '0', 10);

      // Normalize path (remove IDs for better grouping)
      const normalizedPath = normalizePath(req.path);

      // Record metrics
      metrics.recordHttpRequest(
        req.method,
        normalizedPath,
        res.statusCode,
        duration,
        requestSize,
        responseSize
      );

      // Log slow requests
      if (duration > 1) {
        console.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          duration: `${duration.toFixed(3)}s`,
          statusCode: res.statusCode,
        });
      }
    };

    // Override res.json
    res.json = function(body) {
      recordMetrics();
      return originalJson(body);
    };

    // Override res.send
    res.send = function(body) {
      recordMetrics();
      return originalSend(body);
    };

    // Handle cases where neither json nor send is called
    res.on('finish', () => {
      // Only record if not already recorded
      if (!res.headersSent || res.statusCode === 304) {
        recordMetrics();
      }
    });

    next();
  };
}

/**
 * Normalize path for better metric grouping
 * Replaces IDs and other dynamic segments with placeholders
 */
function normalizePath(path) {
  return path
    // Replace MongoDB ObjectIds (24 hex chars)
    .replace(/\/[0-9a-f]{24}\b/gi, '/:id')
    // Replace UUIDs
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '/:id')
    // Replace numeric IDs
    .replace(/\/\d+\b/g, '/:id')
    // Replace transaction IDs
    .replace(/\/TXN\d+\b/g, '/:txnId')
    // Keep named parameters
    .replace(/\/:([a-zA-Z]+)/g, '/:$1');
}

/**
 * Create a span for tracing
 * Use this to manually instrument code sections
 */
function createSpan(name, fn, attributes = {}) {
  const tracer = getTracer();
  
  return tracer.startActiveSpan(name, async (span) => {
    try {
      // Add custom attributes
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });

      const result = await fn(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ 
        code: 2, // ERROR
        message: error.message 
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Middleware to add trace context to requests
 */
function tracingMiddleware() {
  return (req, res, next) => {
    const tracer = getTracer();
    
    tracer.startActiveSpan(`${req.method} ${req.path}`, (span) => {
      // Add request attributes
      span.setAttribute('http.method', req.method);
      span.setAttribute('http.url', req.url);
      span.setAttribute('http.target', req.path);
      span.setAttribute('http.host', req.hostname);
      span.setAttribute('http.user_agent', req.get('user-agent') || '');
      
      if (req.session?.user?._id) {
        span.setAttribute('user.id', req.session.user._id.toString());
        span.setAttribute('user.role', req.session.user.role || 'unknown');
      }

      // Store span in request for nested spans
      req.span = span;

      // End span when response finishes
      res.on('finish', () => {
        span.setAttribute('http.status_code', res.statusCode);
        
        if (res.statusCode >= 400) {
          span.setStatus({
            code: 2, // ERROR
            message: `HTTP ${res.statusCode}`,
          });
        } else {
          span.setStatus({ code: 1 }); // OK
        }
        
        span.end();
      });

      next();
    });
  };
}

module.exports = {
  metricsMiddleware,
  tracingMiddleware,
  createSpan,
  normalizePath,
};

