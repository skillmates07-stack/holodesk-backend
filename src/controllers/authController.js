const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../services/tokenService');

/**
 * WHAT THIS FILE DOES: Handles all authentication operations
 * WHY CONTROLLERS: Separates business logic from routes (MVC pattern)
 * 
 * LEARNING: Controller = function that handles a specific request
 * - Receives req (request data)
 * - Performs business logic (database operations, validation)
 * - Sends res (response) back to client
 */

// ========================================
// REGISTER NEW USER
// ========================================

/**
 * @route   POST /api/auth/register
 * @desc    Create new user account
 * @access  Public
 * 
 * WHAT THIS DOES:
 * 1. Receives email, password, name from request
 * 2. Checks if email already exists
 * 3. Creates new user in database (password auto-hashed by User model)
 * 4. Generates JWT tokens
 * 5. Returns tokens + user data
 * 
 * REQUEST BODY:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123",
 *   "name": "John Doe"
 * }
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "message": "User registered successfully",
 *   "data": {
 *     "user": { ... },
 *     "tokens": { accessToken, refreshToken, expiresIn }
 *   }
 * }
 */
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // STEP 1: Check if user already exists
    // LEARNING: We check email because it's unique
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already registered',
        code: 'EMAIL_EXISTS',
        hint: 'Try logging in or use a different email'
      });
    }

    // STEP 2: Create new user
    // LEARNING: Password is automatically hashed by User model pre-save hook
    const user = await User.create({
      email,
      password,
      name,
      role: 'user', // Default role
      isEmailVerified: false // Require email verification
    });

    // STEP 3: Generate JWT tokens
    const tokens = generateTokenPair(user._id);

    // STEP 4: Get safe user object (without password)
    const safeUser = user.toSafeObject();

    // STEP 5: Log registration event
    console.log(`✅ New user registered: ${email} (ID: ${user._id})`);

    // STEP 6: Send success response
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: safeUser,
        tokens
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);

    // LEARNING: Different error types need different responses
    if (error.code === 11000) {
      // Duplicate key error (MongoDB)
      return res.status(409).json({
        status: 'error',
        message: 'Email already registered',
        code: 'DUPLICATE_EMAIL'
      });
    }

    if (error.name === 'ValidationError') {
      // Mongoose validation error
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Registration failed due to server error',
      code: 'REGISTRATION_ERROR'
    });
  }
};

// ========================================
// LOGIN USER
// ========================================

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return tokens
 * @access  Public
 * 
 * WHAT THIS DOES:
 * 1. Receives email and password
 * 2. Finds user by email
 * 3. Compares password with hashed password
 * 4. Generates JWT tokens
 * 5. Updates last login timestamp
 * 6. Returns tokens + user data
 * 
 * REQUEST BODY:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123"
 * }
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "message": "Login successful",
 *   "data": {
 *     "user": { ... },
 *     "tokens": { accessToken, refreshToken, expiresIn }
 *   }
 * }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // STEP 1: Find user by email
    // LEARNING: .select('+password') includes password field (normally excluded)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // SECURITY: Don't reveal if email exists or not
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // STEP 2: Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // STEP 3: Compare password with hashed password
    // LEARNING: comparePassword is a custom method in User model
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // SECURITY: Same error message as user not found
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // STEP 4: Generate JWT tokens
    const tokens = generateTokenPair(user._id);

    // STEP 5: Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // STEP 6: Get safe user object (without password)
    const safeUser = user.toSafeObject();

    // STEP 7: Log login event
    console.log(`✅ User logged in: ${email} (ID: ${user._id})`);

    // STEP 8: Send success response
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: safeUser,
        tokens
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Login failed due to server error',
      code: 'LOGIN_ERROR'
    });
  }
};

// ========================================
// REFRESH ACCESS TOKEN
// ========================================

/**
 * @route   POST /api/auth/refresh
 * @desc    Get new access token using refresh token
 * @access  Public (but requires valid refresh token)
 * 
 * WHAT THIS DOES:
 * 1. Receives refresh token
 * 2. Verifies refresh token
 * 3. Generates new access token
 * 4. Returns new token
 * 
 * WHY NEEDED: Access tokens expire after 15 minutes
 * Instead of logging in again, use refresh token to get new access token
 * 
 * REQUEST BODY:
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "data": {
 *     "accessToken": "...",
 *     "expiresIn": 900
 *   }
 * }
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // STEP 1: Verify refresh token
    const verification = verifyRefreshToken(refreshToken);

    if (!verification.valid) {
      if (verification.expired) {
        return res.status(401).json({
          status: 'error',
          message: 'Refresh token expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        status: 'error',
        message: verification.error || 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // STEP 2: Extract user ID from token
    const { userId } = verification.decoded;

    // STEP 3: Verify user still exists and is active
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // STEP 4: Generate new token pair
    // LEARNING: We generate both tokens to extend session
    const tokens = generateTokenPair(user._id);

    // STEP 5: Log token refresh
    console.log(`🔄 Token refreshed for user: ${user.email}`);

    // STEP 6: Send new tokens
    return res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        tokens
      }
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
};

// ========================================
// LOGOUT USER
// ========================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate tokens)
 * @access  Private (requires authentication)
 * 
 * WHAT THIS DOES:
 * 1. Logs logout event
 * 2. Returns success message
 * 
 * LEARNING: JWT tokens can't be "deleted" from server
 * They expire automatically after their expiry time
 * Frontend should delete tokens from storage
 * 
 * For better security, we could implement:
 * - Token blacklist in Redis
 * - Store active tokens in database
 * - Use shorter expiry times
 * 
 * REQUEST: No body needed (uses token from Authorization header)
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "message": "Logged out successfully"
 * }
 */
const logout = async (req, res) => {
  try {
    // LEARNING: req.user is available because authMiddleware ran first
    const userId = req.userId;
    const user = req.user;

    // Log logout event
    console.log(`👋 User logged out: ${user.email} (ID: ${userId})`);

    // TODO (Future Enhancement): Add token to blacklist in Redis
    // await redisClient.set(`blacklist:${req.token}`, 'true', 'EX', 900);

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
      hint: 'Please delete tokens from client storage'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

// ========================================
// GET CURRENT USER
// ========================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user's profile
 * @access  Private (requires authentication)
 * 
 * WHAT THIS DOES:
 * 1. Returns current user data from req.user
 * 
 * WHY USEFUL: Frontend can verify token is still valid
 * and get updated user data
 * 
 * REQUEST: No body needed (uses token from Authorization header)
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "data": {
 *     "user": {
 *       "_id": "...",
 *       "email": "...",
 *       "name": "...",
 *       "role": "user",
 *       ...
 *     }
 *   }
 * }
 */
const getCurrentUser = async (req, res) => {
  try {
    // LEARNING: req.user is populated by authMiddleware
    const user = req.user;

    return res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('❌ Get current user error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user data',
      code: 'FETCH_USER_ERROR'
    });
  }
};

// ========================================
// UPDATE PASSWORD
// ========================================

/**
 * @route   PUT /api/auth/password
 * @desc    Change user password
 * @access  Private (requires authentication)
 * 
 * WHAT THIS DOES:
 * 1. Receives current password and new password
 * 2. Verifies current password
 * 3. Updates to new password
 * 4. Generates new tokens (invalidates old sessions)
 * 
 * REQUEST BODY:
 * {
 *   "currentPassword": "OldPass123",
 *   "newPassword": "NewSecurePass456"
 * }
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "message": "Password updated successfully",
 *   "data": {
 *     "tokens": { ... }
 *   }
 * }
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    // STEP 1: Get user with password field
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // STEP 2: Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // STEP 3: Update password
    // LEARNING: Password will be auto-hashed by User model pre-save hook
    user.password = newPassword;
    await user.save();

    // STEP 4: Generate new tokens
    // WHY: Force user to login again on all devices (security)
    const tokens = generateTokenPair(user._id);

    // STEP 5: Log password change
    console.log(`🔒 Password updated for user: ${user.email}`);

    return res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
      data: {
        tokens
      }
    });

  } catch (error) {
    console.error('❌ Update password error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Password update failed',
      code: 'PASSWORD_UPDATE_ERROR'
    });
  }
};

// ========================================
// EXPORTS
// ========================================

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  updatePassword
};
