/**
 * Authentication Middleware
 * Checks if user is authenticated via session
 */

/**
 * Middleware to require authentication
 * Attaches user to req.user if authenticated
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId: req.id || req.headers['x-request-id']
      }
    });
  }

  // Attach user to request for convenience
  req.user = req.session.user;
  next();
}

/**
 * Optional authentication middleware
 * Attaches user to req.user if present, but doesn't fail if not
 */
function optionalAuth(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
}

/**
 * Check if user is verified (for OTP verification)
 */
function requireVerified(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId: req.id || req.headers['x-request-id']
      }
    });
  }

  if (!req.session.user.isVerified) {
    return res.status(403).json({
      error: {
        code: 'VERIFICATION_REQUIRED',
        message: 'Email verification required. Please verify your email address.',
        requestId: req.id || req.headers['x-request-id']
      }
    });
  }

  req.user = req.session.user;
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireVerified
};

