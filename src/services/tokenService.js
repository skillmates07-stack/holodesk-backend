const jwt = require('jsonwebtoken');

/**
 * WHAT THIS DOES: Handles all JWT token operations
 * WHY IMPORTANT: Tokens authenticate users without passwords on every request
 * LEARNING: JWT = JSON Web Token, a secure way to transmit user identity
 * 
 * HOW IT WORKS:
 * 1. User logs in with email/password
 * 2. Server verifies credentials
 * 3. Server creates JWT token containing user ID
 * 4. Client stores token (usually in localStorage)
 * 5. Client sends token with every API request
 * 6. Server verifies token to identify user
 */

// ========================================
// GENERATE ACCESS TOKEN (Short-lived)
// ========================================

/**
 * WHAT THIS DOES: Creates a short-lived token for API requests
 * EXPIRY: 15 minutes (from environment variable)
 * WHY SHORT: If stolen, attacker only has 15 minutes to use it
 * 
 * USAGE EXAMPLE:
 * const token = generateAccessToken(user._id);
 * res.json({ token });
 */
const generateAccessToken = (userId) => {
  try {
    // LEARNING: jwt.sign() creates a token
    // Payload: Data stored in token (user ID)
    // Secret: Encryption key (must be secret!)
    // Options: Expiry time
    const token = jwt.sign(
      { 
        userId,                        // WHY: Identifies the user
        type: 'access',                // WHY: Distinguishes from refresh token
        iat: Math.floor(Date.now() / 1000)  // WHY: Issued at timestamp
      },
      process.env.JWT_SECRET,          // WHY: Secret key encrypts the token
      { 
        expiresIn: process.env.JWT_EXPIRE || '15m',  // WHY: Auto-expires for security
        issuer: 'holodesk-api',        // WHY: Identifies token origin
        audience: 'holodesk-client'    // WHY: Identifies intended recipient
      }
    );

    return token;
  } catch (error) {
    console.error('❌ Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
};

// ========================================
// GENERATE REFRESH TOKEN (Long-lived)
// ========================================

/**
 * WHAT THIS DOES: Creates a long-lived token to get new access tokens
 * EXPIRY: 30 days (from environment variable)
 * WHY LONG: User doesn't need to login again for 30 days
 * 
 * HOW IT WORKS:
 * 1. Access token expires after 15 minutes
 * 2. Client uses refresh token to get new access token
 * 3. No need to enter password again
 * 
 * SECURITY: Refresh token should be stored in httpOnly cookie
 */
const generateRefreshToken = (userId) => {
  try {
    const token = jwt.sign(
      { 
        userId,
        type: 'refresh',               // WHY: Distinguishes from access token
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_REFRESH_SECRET,  // WHY: Different secret from access token
      { 
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
        issuer: 'holodesk-api',
        audience: 'holodesk-client'
      }
    );

    return token;
  } catch (error) {
    console.error('❌ Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

// ========================================
// VERIFY ACCESS TOKEN
// ========================================

/**
 * WHAT THIS DOES: Checks if access token is valid
 * RETURNS: { valid: true, decoded: {userId, ...} } or { valid: false, error: '...' }
 * 
 * USAGE EXAMPLE:
 * const result = verifyAccessToken(token);
 * if (result.valid) {
 *   const userId = result.decoded.userId;
 * }
 */
const verifyAccessToken = (token) => {
  try {
    // LEARNING: jwt.verify() checks:
    // 1. Token hasn't been tampered with
    // 2. Token hasn't expired
    // 3. Token was signed with correct secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'holodesk-api',
      audience: 'holodesk-client'
    });

    // Check token type
    if (decoded.type !== 'access') {
      return {
        valid: false,
        error: 'Invalid token type'
      };
    }

    return {
      valid: true,
      decoded
    };
  } catch (error) {
    // LEARNING: Different error types help with debugging
    if (error.name === 'TokenExpiredError') {
      return {
        valid: false,
        error: 'Token expired',
        expired: true
      };
    } else if (error.name === 'JsonWebTokenError') {
      return {
        valid: false,
        error: 'Invalid token'
      };
    } else {
      return {
        valid: false,
        error: 'Token verification failed'
      };
    }
  }
};

// ========================================
// VERIFY REFRESH TOKEN
// ========================================

/**
 * WHAT THIS DOES: Checks if refresh token is valid
 * WHY SEPARATE: Uses different secret than access token
 * SECURITY: Refresh tokens are more sensitive
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'holodesk-api',
      audience: 'holodesk-client'
    });

    // Check token type
    if (decoded.type !== 'refresh') {
      return {
        valid: false,
        error: 'Invalid token type'
      };
    }

    return {
      valid: true,
      decoded
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return {
        valid: false,
        error: 'Refresh token expired',
        expired: true
      };
    } else if (error.name === 'JsonWebTokenError') {
      return {
        valid: false,
        error: 'Invalid refresh token'
      };
    } else {
      return {
        valid: false,
        error: 'Refresh token verification failed'
      };
    }
  }
};

// ========================================
// DECODE TOKEN (Without Verification)
// ========================================

/**
 * WHAT THIS DOES: Reads token data WITHOUT checking if valid
 * WHY USEFUL: To display user info before verifying
 * WARNING: Never trust this data for security - always verify!
 */
const decodeToken = (token) => {
  try {
    // LEARNING: jwt.decode() just reads the token, doesn't verify
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    console.error('❌ Error decoding token:', error);
    return null;
  }
};

// ========================================
// GENERATE TOKEN PAIR (Both tokens at once)
// ========================================

/**
 * WHAT THIS DOES: Creates both access and refresh tokens together
 * WHY CONVENIENT: Login and token refresh need both
 * 
 * RETURNS:
 * {
 *   accessToken: 'eyJhbGc...',
 *   refreshToken: 'eyJhbGc...',
 *   expiresIn: 900 (seconds)
 * }
 */
const generateTokenPair = (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  // Calculate expiry in seconds
  const expiresIn = 15 * 60; // 15 minutes in seconds

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer'
  };
};

// ========================================
// EXPORTS
// ========================================

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  generateTokenPair
};
