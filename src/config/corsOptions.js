/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * WHAT THIS FILE DOES:
 * Configures which frontend URLs can make requests to this backend
 * 
 * WHY NEEDED:
 * Browsers block requests between different domains (security feature)
 * CORS tells browser: "These specific frontends are allowed to access this backend"
 * 
 * COMMON CORS ERRORS:
 * ❌ "has been blocked by CORS policy"
 * ❌ "No 'Access-Control-Allow-Origin' header"
 * ✅ Fixed by adding frontend URL to allowedOrigins
 * 
 * LEARNING: CORS = Cross-Origin Resource Sharing
 * Origin = Protocol + Domain + Port
 * Example: https://holodesk-frontend.netlify.app
 */

// ========================================
// ALLOWED ORIGINS (WHITELIST)
// ========================================

/**
 * List of frontend URLs that can access this backend
 * Add any new frontend deployment URLs here
 */
const allowedOrigins = [
  // ===== PRODUCTION =====
  'https://holodesk-frontend.netlify.app',
  
  // ===== NETLIFY PREVIEW URLs =====
  // Netlify creates unique URLs for each deployment
  // Format: https://[random-id]--holodesk-frontend.netlify.app
  'https://68f2515b--.netlify.app',
  'https://68f24c95e5078a0008d2ecff--holodesk-frontend.netlify.app',
  
  // ===== LOCAL DEVELOPMENT =====
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  
  // ===== VERCEL (if you deploy there later) =====
  // 'https://holodesk-frontend.vercel.app',
  
  // ===== CUSTOM DOMAIN (when you add one) =====
  // 'https://holodesk.app',
  // 'https://www.holodesk.app',
];

// ========================================
// CORS OPTIONS CONFIGURATION
// ========================================

/**
 * LEARNING: CORS Configuration Object
 * 
 * origin: Which domains can access
 * credentials: Allow cookies/auth headers
 * methods: Which HTTP methods allowed
 * allowedHeaders: Which headers frontend can send
 * exposedHeaders: Which headers frontend can read
 * maxAge: How long to cache preflight requests
 */
const corsOptions = {
  /**
   * ORIGIN CHECK FUNCTION
   * 
   * WHAT IT DOES:
   * - Checks if incoming request origin is in allowedOrigins
   * - Allows requests with no origin (Postman, mobile apps)
   * - Logs blocked requests for debugging
   * 
   * PARAMETERS:
   * @param {string} origin - The origin making the request
   * @param {function} callback - Callback(error, allowed)
   */
  origin: function (origin, callback) {
    // CASE 1: No origin (Postman, curl, mobile apps)
    // LEARNING: Server-to-server requests don't have origin header
    if (!origin) {
      console.log('✅ CORS: Request with no origin (allowed)');
      return callback(null, true);
    }

    // CASE 2: Origin is in whitelist
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ CORS: Allowed origin: ${origin}`);
      return callback(null, true);
    }

    // CASE 3: Check if origin matches Netlify preview pattern
    // LEARNING: Regex to match any Netlify preview URL
    // Pattern: https://[anything]--holodesk-frontend.netlify.app
    const netlifyPreviewPattern = /^https:\/\/[a-zA-Z0-9-]+--holodesk-frontend\.netlify\.app$/;
    if (netlifyPreviewPattern.test(origin)) {
      console.log(`✅ CORS: Allowed Netlify preview: ${origin}`);
      return callback(null, true);
    }

    // CASE 4: Origin not allowed
    console.log(`❌ CORS: Blocked origin: ${origin}`);
    console.log('💡 To fix: Add this origin to allowedOrigins in corsOptions.js');
    callback(new Error('Not allowed by CORS'));
  },

  /**
   * CREDENTIALS
   * 
   * WHAT IT DOES: Allows cookies and Authorization headers
   * WHY IMPORTANT: JWT tokens sent in Authorization header
   * 
   * true = Frontend can send:
   * - Cookies
   * - Authorization headers
   * - Client certificates
   */
  credentials: true,

  /**
   * ALLOWED HTTP METHODS
   * 
   * WHAT IT DOES: Defines which HTTP methods frontend can use
   * 
   * GET = Read data
   * POST = Create data
   * PUT = Replace data
   * PATCH = Update data
   * DELETE = Remove data
   * OPTIONS = Preflight check (browser does this automatically)
   */
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  /**
   * ALLOWED HEADERS
   * 
   * WHAT IT DOES: Headers that frontend can send in requests
   * 
   * Content-Type = JSON, form data, etc.
   * Authorization = JWT tokens
   * X-Requested-With = AJAX indicator
   * Accept = Response format preference
   * Origin = Request origin (auto-added by browser)
   */
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],

  /**
   * EXPOSED HEADERS
   * 
   * WHAT IT DOES: Headers that frontend JavaScript can read
   * By default, browsers only expose simple headers
   * 
   * WHY NEEDED: If you want frontend to read custom headers
   * Example: Pagination info in headers
   */
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'X-Total-Count',
  ],

  /**
   * MAX AGE
   * 
   * WHAT IT DOES: How long (seconds) browser caches preflight response
   * 
   * LEARNING: Preflight Request
   * Browser sends OPTIONS request first to check if actual request allowed
   * Caching this for 1 hour reduces redundant preflight checks
   * 
   * 3600 seconds = 1 hour
   */
  maxAge: 3600,

  /**
   * OPTIONS SUCCESS STATUS
   * 
   * WHAT IT DOES: Status code for successful OPTIONS requests
   * 
   * 204 = No Content (success, but no body)
   * Some legacy browsers need 200 instead
   */
  optionsSuccessStatus: 204,

  /**
   * PREFLIGHT CONTINUE
   * 
   * WHAT IT DOES: Pass preflight response to next handler
   * false = Respond immediately to OPTIONS
   * true = Continue to next middleware
   */
  preflightContinue: false,
};

// ========================================
// HELPER FUNCTION: ADD NEW ORIGIN
// ========================================

/**
 * LEARNING: How to add new origins dynamically
 * Useful if you want to add origins from environment variables
 * 
 * USAGE:
 * addAllowedOrigin('https://new-frontend.com');
 */
function addAllowedOrigin(origin) {
  if (!allowedOrigins.includes(origin)) {
    allowedOrigins.push(origin);
    console.log(`✅ Added new allowed origin: ${origin}`);
  }
}

/**
 * LEARNING: Add origins from environment variables
 * Useful for different environments (dev, staging, prod)
 */
if (process.env.ADDITIONAL_CORS_ORIGINS) {
  const additionalOrigins = process.env.ADDITIONAL_CORS_ORIGINS.split(',');
  additionalOrigins.forEach(origin => addAllowedOrigin(origin.trim()));
}

// ========================================
// EXPORTS
// ========================================

module.exports = corsOptions;

/**
 * DEBUGGING TIPS:
 * 
 * 1. CORS Error in Browser Console?
 *    - Check browser console for exact blocked origin
 *    - Add that origin to allowedOrigins array
 *    - Restart backend server
 * 
 * 2. Still Not Working?
 *    - Check backend console logs for "❌ CORS: Blocked origin"
 *    - Verify origin spelling (https vs http, trailing slash)
 *    - Make sure CORS middleware is loaded BEFORE routes in app.js
 * 
 * 3. Testing CORS:
 *    - Use curl: curl -H "Origin: https://test.com" -I http://localhost:5000/api
 *    - Check for "Access-Control-Allow-Origin" in response headers
 * 
 * 4. Netlify Preview URLs Keep Changing?
 *    - Use regex pattern to match all preview URLs
 *    - Or set up custom subdomain: preview.holodesk.app
 */
