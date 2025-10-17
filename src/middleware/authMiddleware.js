const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');

/**
 * WHAT THIS DOES: Middleware that protects routes requiring authentication
 * HOW IT WORKS: Checks for JWT token in request header, verifies it, attaches user to request
 * 
 * USAGE EXAMPLE:
 * router.get('/profile', authMiddleware, (req, res) => {
 *   res.json({ user: req.user }); // req.user is available here!
 * });
 * 
 * LEARNING: Middleware = function that runs BEFORE your route handler
 * It can:
 * 1. Block the request (send error response)
 * 2. Modify the request (add req.user)
 * 3. Pass control to next middleware (call next())
 */

// ========================================
// MAIN AUTH MIDDLEWARE
// ========================================

const authMiddleware = async (req, res, next) => {
  try {
    // STEP 1: Extract token from Authorization header
    // LEARNING: Authorization header format: "Bearer eyJhbGciOiJIUzI1NiIs..."
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'No authorization token provided',
        code: 'NO_TOKEN'
      });
    }

    // STEP 2: Extract token (remove "Bearer " prefix)
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authorization format. Use: Bearer <token>',
        code: 'INVALID_FORMAT'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " (7 characters)

    if (!token || token.trim() === '') {
      return res.status(401).json({
        status: 'error',
        message: 'Token is empty',
        code: 'EMPTY_TOKEN'
      });
    }

    // STEP 3: Verify token using tokenService
    const verification = verifyAccessToken(token);

    if (!verification.valid) {
      // LEARNING: Different error responses for different scenarios
      if (verification.expired) {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        status: 'error',
        message: verification.error || 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // STEP 4: Extract user ID from decoded token
    const { userId } = verification.decoded;

    // STEP 5: Fetch user from database
    // LEARNING: We verify user still exists and is active
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found. Account may have been deleted.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // STEP 6: Attach user to request object
    // LEARNING: Now all route handlers can access req.user
    req.user = user;
    req.userId = userId;
    req.token = token;

    // STEP 7: Update last login timestamp (optional)
    user.lastLogin = new Date();
    await user.save();

    // STEP 8: Pass control to next middleware/route handler
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed due to server error',
      code: 'AUTH_ERROR'
    });
  }
};

// ========================================
// OPTIONAL AUTH MIDDLEWARE (Route works with or without auth)
// ========================================

/**
 * WHAT THIS DOES: Adds user to request if token exists, but doesn't block if missing
 * WHY USEFUL: Public routes that show different content for logged-in users
 * 
 * EXAMPLE: Homepage that shows "Login" for guests, "Dashboard" for users
 * 
 * USAGE:
 * router.get('/public', optionalAuthMiddleware, (req, res) => {
 *   if (req.user) {
 *     res.json({ message: `Welcome back ${req.user.name}` });
 *   } else {
 *     res.json({ message: 'Welcome guest' });
 *   }
 * });
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // If no token, just continue without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    if (!token || token.trim() === '') {
      return next();
    }

    // Try to verify token
    const verification = verifyAccessToken(token);

    if (verification.valid) {
      const { userId } = verification.decoded;
      const user = await User.findById(userId).select('-password');

      if (user && user.isActive) {
        req.user = user;
        req.userId = userId;
      }
    }

    // Continue regardless of token validity
    next();

  } catch (error) {
    console.error('⚠️ Optional auth error:', error);
    // Don't block request, just continue without user
    next();
  }
};

// ========================================
// ROLE-BASED AUTH MIDDLEWARE
// ========================================

/**
 * WHAT THIS DOES: Restricts routes to specific user roles
 * WHY IMPORTANT: Admin-only routes, Pro user features
 * 
 * LEARNING: Higher-order function - returns a middleware function
 * 
 * USAGE EXAMPLE:
 * router.delete('/users/:id', authMiddleware, requireRole(['admin']), deleteUser);
 * router.get('/pro-features', authMiddleware, requireRole(['pro', 'admin']), getProFeatures);
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // LEARNING: This assumes authMiddleware has already run
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    // User has required role, continue
    next();
  };
};

// ========================================
// EMAIL VERIFICATION MIDDLEWARE
// ========================================

/**
 * WHAT THIS DOES: Ensures user has verified their email
 * WHY IMPORTANT: Some features require verified email
 * 
 * USAGE:
 * router.post('/workspaces', authMiddleware, requireEmailVerification, createWorkspace);
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      status: 'error',
      message: 'Email verification required. Please check your inbox.',
      code: 'EMAIL_NOT_VERIFIED',
      hint: 'Request a new verification email from /api/auth/resend-verification'
    });
  }

  next();
};

// ========================================
// RATE LIMIT CHECK MIDDLEWARE
// ========================================

/**
 * WHAT THIS DOES: Adds user info to rate limiter for better tracking
 * WHY USEFUL: Authenticated users get higher rate limits
 * 
 * LEARNING: Works with express-rate-limit library
 */
const attachUserToRateLimit = (req, res, next) => {
  if (req.user) {
    // Use user ID as rate limit key instead of IP
    req.rateLimitKey = `user:${req.userId}`;
  }
  next();
};

// ========================================
// EXPORTS
// ========================================

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireEmailVerification,
  attachUserToRateLimit
};
