const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  updatePassword
} = require('../controllers/authController');

// Import middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate, sanitizeInput } = require('../middleware/validationMiddleware');

// Import validation schemas
const {
  registerSchema,
  loginSchema
} = require('../utils/validators');

/**
 * WHAT THIS FILE DOES: Defines authentication API routes
 * 
 * LEARNING: Express Router
 * - router.post() = Handle POST requests
 * - router.get() = Handle GET requests
 * - router.put() = Handle PUT/PATCH requests
 * 
 * ROUTE STRUCTURE:
 * router.METHOD(path, [middleware1, middleware2, ...], controller)
 * 
 * EXAMPLE:
 * POST /api/auth/register
 *   ↓
 * 1. sanitizeInput (clean data)
 * 2. validate(registerSchema) (check format)
 * 3. register (create user)
 */

// ========================================
// PUBLIC ROUTES (No authentication required)
// ========================================

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 * @body    { email, password, name }
 * 
 * FLOW:
 * 1. sanitizeInput - Remove dangerous characters
 * 2. validate(registerSchema) - Check email/password format
 * 3. register - Create user in database
 */
router.post(
  '/register',
  sanitizeInput,
  validate(registerSchema),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get tokens
 * @access  Public
 * @body    { email, password }
 * 
 * FLOW:
 * 1. sanitizeInput - Remove dangerous characters
 * 2. validate(loginSchema) - Check email/password provided
 * 3. login - Verify credentials and return tokens
 */
router.post(
  '/login',
  sanitizeInput,
  validate(loginSchema),
  login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (but requires valid refresh token)
 * @body    { refreshToken }
 * 
 * LEARNING: This is "public" because it doesn't use authMiddleware
 * But it still requires a valid refresh token to work
 */
router.post(
  '/refresh',
  refreshToken
);

// ========================================
// PROTECTED ROUTES (Authentication required)
// ========================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 * @headers Authorization: Bearer <access_token>
 * 
 * FLOW:
 * 1. authMiddleware - Verify token, attach req.user
 * 2. getCurrentUser - Return user data
 * 
 * LEARNING: authMiddleware must run BEFORE controller
 */
router.get(
  '/me',
  authMiddleware,
  getCurrentUser
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 * @headers Authorization: Bearer <access_token>
 * 
 * FLOW:
 * 1. authMiddleware - Verify user is logged in
 * 2. logout - Log event, return success
 * 
 * LEARNING: Frontend should delete tokens after this
 */
router.post(
  '/logout',
  authMiddleware,
  logout
);

/**
 * @route   PUT /api/auth/password
 * @desc    Update user password
 * @access  Private
 * @headers Authorization: Bearer <access_token>
 * @body    { currentPassword, newPassword }
 * 
 * FLOW:
 * 1. authMiddleware - Verify user is logged in
 * 2. sanitizeInput - Clean input data
 * 3. updatePassword - Verify old password, update to new
 */
router.put(
  '/password',
  authMiddleware,
  sanitizeInput,
  updatePassword
);

// ========================================
// TEST/DEBUG ROUTES (Optional - Remove in production)
// ========================================

/**
 * @route   GET /api/auth/test
 * @desc    Test if auth routes are working
 * @access  Public
 * 
 * LEARNING: Use this to verify routes are connected
 * Remove this in production for security
 */
router.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    availableRoutes: {
      public: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/refresh'
      ],
      protected: [
        'GET /api/auth/me',
        'POST /api/auth/logout',
        'PUT /api/auth/password'
      ]
    }
  });
});

// ========================================
// EXPORTS
// ========================================

/**
 * LEARNING: Export the router so app.js can use it
 * app.js will mount this at /api/auth
 * So POST /register becomes POST /api/auth/register
 */
module.exports = router;
