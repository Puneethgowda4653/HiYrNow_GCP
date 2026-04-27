/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides guards for different user roles
 */

const { requireAuth } = require('./auth');

/**
 * Create a role guard that checks if user has one of the allowed roles
 * @param {string|string[]} allowedRoles - Single role or array of roles
 * @returns {Function} Express middleware
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    // First check authentication
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: req.id || req.headers['x-request-id']
        }
      });
    }

    const userRole = req.session.user.role;
    req.user = req.session.user;

    // Check if user role is in allowed roles
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${roles.join(' or ')}`,
          requestId: req.id || req.headers['x-request-id']
        }
      });
    }

    next();
  };
}

/**
 * Require Admin role
 */
const requireAdmin = requireRole('Admin');

/**
 * Require Recruiter role
 */
const requireRecruiter = requireRole('Recruiter');

/**
 * Require JobSeeker role
 */
const requireJobSeeker = requireRole('JobSeeker');

/**
 * Require either Recruiter or Admin
 */
const requireRecruiterOrAdmin = requireRole(['Recruiter', 'Admin']);

/**
 * Require either JobSeeker or Admin
 */
const requireJobSeekerOrAdmin = requireRole(['JobSeeker', 'Admin']);

/**
 * Require verified Recruiter (not pending)
 */
function requireVerifiedRecruiter(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId: req.id || req.headers['x-request-id']
      }
    });
  }

  const user = req.session.user;
  req.user = user;

  if (user.role !== 'Recruiter' && user.role !== 'Admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Recruiter or Admin role required',
        requestId: req.id || req.headers['x-request-id']
      }
    });
  }

  // Check if recruiter is verified (not pending)
  if (user.role === 'Recruiter' && user.requestStatus === 'Pending') {
    return res.status(403).json({
      error: {
        code: 'RECRUITER_PENDING',
        message: 'Recruiter verification pending. Please wait for admin approval.',
        requestId: req.id || req.headers['x-request-id']
      }
    });
  }

  next();
}

/**
 * Check if user owns the resource or is admin
 * @param {Function} getUserId - Function to extract userId from request (req) => userId
 */
function requireOwnershipOrAdmin(getUserId) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: req.id || req.headers['x-request-id']
        }
      });
    }

    const user = req.session.user;
    req.user = user;

    // Admin can access anything
    if (user.role === 'Admin') {
      return next();
    }

    // Check ownership
    const resourceUserId = getUserId(req);
    if (!resourceUserId) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Unable to determine resource owner',
          requestId: req.id || req.headers['x-request-id']
        }
      });
    }

    // Convert to string for comparison (handles ObjectId)
    const userId = String(user._id);
    const resourceId = String(resourceUserId);

    if (userId !== resourceId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. You can only access your own resources.',
          requestId: req.id || req.headers['x-request-id']
        }
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requireAdmin,
  requireRecruiter,
  requireJobSeeker,
  requireRecruiterOrAdmin,
  requireJobSeekerOrAdmin,
  requireVerifiedRecruiter,
  requireOwnershipOrAdmin
};

