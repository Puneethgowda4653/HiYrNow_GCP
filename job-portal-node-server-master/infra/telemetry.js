/**
 * OpenTelemetry Setup for Metrics and Tracing
 * 
 * Provides:
 * - Distributed tracing (trace requests across services)
 * - Custom metrics (counters, histograms, gauges)
 * - Automatic instrumentation for HTTP, MongoDB, Redis
 * - Prometheus metrics export
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { trace, metrics } = require('@opentelemetry/api');
const { MeterProvider } = require('@opentelemetry/sdk-metrics');

const config = require('../config').getConfig();

// Service name and version
const serviceName = process.env.OTEL_SERVICE_NAME || 'job-portal-api';
const serviceVersion = process.env.npm_package_version || '1.0.0';

// Create resource (service identification)
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Configure Prometheus exporter
const prometheusExporter = new PrometheusExporter(
  {
    port: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
    endpoint: '/metrics',
  },
  () => {
    console.log(`Prometheus metrics available at http://localhost:${process.env.PROMETHEUS_PORT || 9464}/metrics`);
  }
);

// Configure Jaeger exporter (optional, for distributed tracing visualization)
let traceExporter = null;
if (process.env.JAEGER_ENABLED === 'true') {
  traceExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });
}

// Initialize OpenTelemetry SDK
let sdk;

function initializeTelemetry() {
  const instrumentations = [
    getNodeAutoInstrumentations({
      // Auto-instrument common libraries
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingPaths: ['/healthz', '/livez', '/readyz', '/metrics'], // Don't trace health checks
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-mongodb': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-redis': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-ioredis': {
        enabled: true,
      },
    }),
  ];

  const sdkConfig = {
    resource,
    instrumentations,
    metricReader: prometheusExporter,
  };

  // Add trace exporter if Jaeger is enabled
  if (traceExporter) {
    sdkConfig.spanProcessor = new BatchSpanProcessor(traceExporter);
  }

  sdk = new NodeSDK(sdkConfig);

  // Start the SDK
  sdk.start();

  console.log('✓ OpenTelemetry initialized');
  console.log(`  Service: ${serviceName}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  if (traceExporter) {
    console.log(`  Jaeger tracing: enabled`);
  }
}

// Graceful shutdown
function shutdownTelemetry() {
  return sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry shut down successfully'))
    .catch((error) => console.error('Error shutting down OpenTelemetry', error));
}

// Get tracer instance
function getTracer(name = serviceName) {
  return trace.getTracer(name, serviceVersion);
}

// Get meter instance
function getMeter(name = serviceName) {
  return metrics.getMeter(name, serviceVersion);
}

// Custom metrics
class CustomMetrics {
  constructor() {
    this.meter = getMeter();

    // HTTP metrics
    this.httpRequestCounter = this.meter.createCounter('http_requests_total', {
      description: 'Total number of HTTP requests',
      unit: '1',
    });

    this.httpRequestDuration = this.meter.createHistogram('http_request_duration_seconds', {
      description: 'HTTP request duration in seconds',
      unit: 's',
    });

    this.httpRequestSize = this.meter.createHistogram('http_request_size_bytes', {
      description: 'HTTP request size in bytes',
      unit: 'By',
    });

    this.httpResponseSize = this.meter.createHistogram('http_response_size_bytes', {
      description: 'HTTP response size in bytes',
      unit: 'By',
    });

    // Business metrics
    this.jobApplicationsCounter = this.meter.createCounter('job_applications_total', {
      description: 'Total number of job applications',
      unit: '1',
    });

    this.userRegistrationsCounter = this.meter.createCounter('user_registrations_total', {
      description: 'Total number of user registrations',
      unit: '1',
    });

    this.paymentCounter = this.meter.createCounter('payments_total', {
      description: 'Total number of payments',
      unit: '1',
    });

    this.paymentAmount = this.meter.createHistogram('payment_amount', {
      description: 'Payment amounts',
      unit: 'currency',
    });

    // Cache metrics
    this.cacheHitCounter = this.meter.createCounter('cache_hits_total', {
      description: 'Total number of cache hits',
      unit: '1',
    });

    this.cacheMissCounter = this.meter.createCounter('cache_misses_total', {
      description: 'Total number of cache misses',
      unit: '1',
    });

    // Database metrics
    this.dbQueryDuration = this.meter.createHistogram('db_query_duration_seconds', {
      description: 'Database query duration in seconds',
      unit: 's',
    });

    this.dbQueryCounter = this.meter.createCounter('db_queries_total', {
      description: 'Total number of database queries',
      unit: '1',
    });

    // Queue metrics
    this.queueJobEnqueued = this.meter.createCounter('queue_jobs_enqueued_total', {
      description: 'Total number of jobs enqueued',
      unit: '1',
    });

    this.queueJobCompleted = this.meter.createCounter('queue_jobs_completed_total', {
      description: 'Total number of jobs completed',
      unit: '1',
    });

    this.queueJobFailed = this.meter.createCounter('queue_jobs_failed_total', {
      description: 'Total number of jobs failed',
      unit: '1',
    });

    this.queueJobDuration = this.meter.createHistogram('queue_job_duration_seconds', {
      description: 'Queue job processing duration in seconds',
      unit: 's',
    });

    // File upload metrics
    this.fileUploadCounter = this.meter.createCounter('file_uploads_total', {
      description: 'Total number of file uploads',
      unit: '1',
    });

    this.fileUploadSize = this.meter.createHistogram('file_upload_size_bytes', {
      description: 'File upload size in bytes',
      unit: 'By',
    });

    // Authentication metrics
    this.loginAttempts = this.meter.createCounter('login_attempts_total', {
      description: 'Total number of login attempts',
      unit: '1',
    });

    this.loginSuccess = this.meter.createCounter('login_success_total', {
      description: 'Total number of successful logins',
      unit: '1',
    });

    this.loginFailure = this.meter.createCounter('login_failure_total', {
      description: 'Total number of failed logins',
      unit: '1',
    });

    // System metrics (observables)
    this.meter.createObservableGauge('nodejs_memory_heap_used_bytes', {
      description: 'Process heap memory used',
      unit: 'By',
      callback: (observableResult) => {
        const used = process.memoryUsage().heapUsed;
        observableResult.observe(used);
      },
    });

    this.meter.createObservableGauge('nodejs_memory_heap_total_bytes', {
      description: 'Process heap memory total',
      unit: 'By',
      callback: (observableResult) => {
        const total = process.memoryUsage().heapTotal;
        observableResult.observe(total);
      },
    });

    this.meter.createObservableGauge('nodejs_memory_rss_bytes', {
      description: 'Process resident set size',
      unit: 'By',
      callback: (observableResult) => {
        const rss = process.memoryUsage().rss;
        observableResult.observe(rss);
      },
    });

    this.meter.createObservableGauge('nodejs_eventloop_lag_seconds', {
      description: 'Event loop lag in seconds',
      unit: 's',
      callback: (observableResult) => {
        const start = Date.now();
        setImmediate(() => {
          const lag = (Date.now() - start) / 1000;
          observableResult.observe(lag);
        });
      },
    });
  }

  // Helper methods
  recordHttpRequest(method, path, statusCode, duration, requestSize, responseSize) {
    const attributes = {
      method,
      path,
      status_code: statusCode.toString(),
    };

    this.httpRequestCounter.add(1, attributes);
    this.httpRequestDuration.record(duration, attributes);
    
    if (requestSize) {
      this.httpRequestSize.record(requestSize, attributes);
    }
    
    if (responseSize) {
      this.httpResponseSize.record(responseSize, attributes);
    }
  }

  recordJobApplication(userId, jobId, status) {
    this.jobApplicationsCounter.add(1, {
      status,
    });
  }

  recordUserRegistration(role) {
    this.userRegistrationsCounter.add(1, {
      role,
    });
  }

  recordPayment(status, amount) {
    this.paymentCounter.add(1, {
      status,
    });
    
    if (amount) {
      this.paymentAmount.record(amount, {
        status,
      });
    }
  }

  recordCacheHit(key) {
    this.cacheHitCounter.add(1, {
      key: key.split(':')[0], // Use prefix only for grouping
    });
  }

  recordCacheMiss(key) {
    this.cacheMissCounter.add(1, {
      key: key.split(':')[0],
    });
  }

  recordDbQuery(collection, operation, duration) {
    this.dbQueryCounter.add(1, {
      collection,
      operation,
    });
    
    this.dbQueryDuration.record(duration, {
      collection,
      operation,
    });
  }

  recordQueueJob(queueName, event, duration = null) {
    const attributes = { queue: queueName };

    switch (event) {
      case 'enqueued':
        this.queueJobEnqueued.add(1, attributes);
        break;
      case 'completed':
        this.queueJobCompleted.add(1, attributes);
        if (duration) {
          this.queueJobDuration.record(duration, attributes);
        }
        break;
      case 'failed':
        this.queueJobFailed.add(1, attributes);
        break;
    }
  }

  recordFileUpload(fileType, size, success) {
    this.fileUploadCounter.add(1, {
      file_type: fileType,
      success: success.toString(),
    });
    
    if (size) {
      this.fileUploadSize.record(size, {
        file_type: fileType,
      });
    }
  }

  recordLoginAttempt(success, role = null) {
    const attributes = role ? { role } : {};
    
    this.loginAttempts.add(1, attributes);
    
    if (success) {
      this.loginSuccess.add(1, attributes);
    } else {
      this.loginFailure.add(1, attributes);
    }
  }
}

// Singleton instance
let customMetrics = null;

function getMetrics() {
  if (!customMetrics) {
    customMetrics = new CustomMetrics();
  }
  return customMetrics;
}

module.exports = {
  initializeTelemetry,
  shutdownTelemetry,
  getTracer,
  getMeter,
  getMetrics,
};

