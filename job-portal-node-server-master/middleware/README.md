# Authentication & RBAC Middleware

This directory contains reusable authentication and authorization middleware for the job portal backend.

## Authentication Middleware (`auth.js`)

### `requireAuth`
Requires user to be authenticated. Returns 401 if not authenticated.

```javascript
const { requireAuth } = require('./middleware/auth');

app.get('/api/profile', requireAuth, getProfile);
```

### `optionalAuth`
Attaches user to `req.user` if present, but doesn't fail if not authenticated.

```javascript
const { optionalAuth } = require('./middleware/auth');

app.get('/api/public-data', optionalAuth, getPublicData);
```

### `requireVerified`
Requires user to be authenticated AND verified (OTP verification).

```javascript
const { requireVerified } = require('./middleware/auth');

app.post('/api/sensitive-action', requireVerified, performAction);
```

## RBAC Middleware (`rbac.js`)

### `requireAdmin`
Requires Admin role.

```javascript
const { requireAdmin } = require('./middleware/rbac');

app.get('/api/admin/users', requireAdmin, getAllUsers);
```

### `requireRecruiter`
Requires Recruiter role.

```javascript
const { requireRecruiter } = require('./middleware/rbac');

app.post('/api/job-posting', requireRecruiter, createJobPosting);
```

### `requireJobSeeker`
Requires JobSeeker role.

```javascript
const { requireJobSeeker } = require('./middleware/rbac');

app.post('/api/job-application', requireJobSeeker, applyToJob);
```

### `requireRecruiterOrAdmin`
Requires either Recruiter or Admin role.

```javascript
const { requireRecruiterOrAdmin } = require('./middleware/rbac');

app.get('/api/job-postings', requireRecruiterOrAdmin, getJobPostings);
```

### `requireJobSeekerOrAdmin`
Requires either JobSeeker or Admin role.

```javascript
const { requireJobSeekerOrAdmin } = require('./middleware/rbac');

app.get('/api/applications', requireJobSeekerOrAdmin, getApplications);
```

### `requireVerifiedRecruiter`
Requires Recruiter role AND verified status (not pending).

```javascript
const { requireVerifiedRecruiter } = require('./middleware/rbac');

app.post('/api/job-posting', requireVerifiedRecruiter, createJobPosting);
```

### `requireRole(allowedRoles)`
Custom role guard. Accepts single role or array of roles.

```javascript
const { requireRole } = require('./middleware/rbac');

// Single role
app.get('/api/custom', requireRole('Admin'), handler);

// Multiple roles
app.get('/api/custom', requireRole(['Admin', 'Recruiter']), handler);
```

### `requireOwnershipOrAdmin(getUserId)`
Requires user to own the resource OR be Admin.

```javascript
const { requireOwnershipOrAdmin } = require('./middleware/rbac');

// Example: User can only update their own profile, but Admin can update any
app.put('/api/user/:userId', 
  requireOwnershipOrAdmin((req) => req.params.userId), 
  updateUser
);
```

## Usage Examples

### Example 1: Protected Route
```javascript
const { requireAuth } = require('../middleware/auth');

module.exports = function(app) {
  app.get('/api/projects', requireAuth, (req, res) => {
    // req.user is available here
    const userId = req.user._id;
    // ... fetch projects for user
  });
};
```

### Example 2: Admin Only Route
```javascript
const { requireAdmin } = require('../middleware/rbac');

module.exports = function(app) {
  app.delete('/api/user/:userId', requireAdmin, (req, res) => {
    // Only admins can delete users
    const userId = req.params.userId;
    // ... delete user
  });
};
```

### Example 3: Role-Specific Route
```javascript
const { requireRecruiter } = require('../middleware/rbac');

module.exports = function(app) {
  app.post('/api/job-posting', requireRecruiter, (req, res) => {
    // Only recruiters can create job postings
    const recruiterId = req.user._id;
    // ... create job posting
  });
};
```

### Example 4: Ownership Check
```javascript
const { requireOwnershipOrAdmin } = require('../middleware/rbac');

module.exports = function(app) {
  app.put('/api/project/:projectId', 
    requireOwnershipOrAdmin((req) => {
      // First fetch project to get owner
      return Project.findById(req.params.projectId).then(p => p.user);
    }),
    (req, res) => {
      // User owns project OR is admin
      // ... update project
    }
  );
};
```

### Example 5: Combining Middleware
```javascript
const { requireAuth } = require('../middleware/auth');
const { requireVerified } = require('../middleware/auth');
const { requireJobSeeker } = require('../middleware/rbac');

module.exports = function(app) {
  // Chain multiple middleware
  app.post('/api/job-application', 
    requireAuth,
    requireVerified,
    requireJobSeeker,
    (req, res) => {
      // User is authenticated, verified, and is a JobSeeker
      // ... create application
    }
  );
};
```

## Notes

- All middleware automatically attach `req.user` from `req.session.user` for convenience
- Error responses follow the standard error format with `code`, `message`, and `requestId`
- Session is configured centrally in `server.js` - don't set up sessions in individual services
- Middleware should be applied before route handlers in the middleware chain

