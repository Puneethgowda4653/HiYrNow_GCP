function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'internal_error';
  const message = status >= 500 ? 'Internal Server Error' : err.message || 'Request Error';
  const requestId = req.id || null;

  // Basic structured log
  // Avoid logging full error stack for 4xx unless useful
  const logPayload = {
    level: status >= 500 ? 'error' : 'warn',
    code,
    status,
    requestId,
    path: req.originalUrl,
    method: req.method,
  };
  const details = err.details || err.issues;
  if (status >= 500) {
    console.error({ ...logPayload, err: err.stack || String(err) });
  } else {
    console.warn({ ...logPayload, msg: message, details });
  }

  res.status(status).json({
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {}),
    }
  });
}

module.exports = { errorHandler };


