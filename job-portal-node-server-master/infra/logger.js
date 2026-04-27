const { randomUUID } = require('crypto');

function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}

function logRequest(req, res, next) {
  const start = Date.now();
  const requestId = req.id;
  console.info({
    level: 'info',
    msg: 'request:start',
    method: req.method,
    path: req.originalUrl,
    requestId,
  });
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    console.info({
      level: 'info',
      msg: 'request:finish',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      requestId,
    });
  });
  next();
}

module.exports = {
  requestIdMiddleware,
  logRequest,
};


