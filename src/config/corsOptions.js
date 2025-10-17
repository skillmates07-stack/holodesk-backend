/**
 * WHAT THIS DOES: Configures CORS (Cross-Origin Resource Sharing)
 * WHY IMPORTANT: Browsers block frontend from calling backend on different domains
 * LEARNING: This whitelist tells browser "these domains are allowed"
 */

const corsOptions = {
  // LEARNING: origin - which websites can call your API
  origin: function (origin, callback) {
    // Whitelist of allowed domains
    const allowedOrigins = [
      process.env.FRONTEND_URL,           // Production: https://holodesk.netlify.app
      'http://localhost:3000',            // Local development
      'http://localhost:3001',            // Backup local port
    ];

    // LEARNING: !origin allows Postman, Thunder Client (for testing)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);  // Allow the request
    } else {
      callback(new Error('❌ CORS policy: Origin not allowed'));
    }
  },

  // LEARNING: credentials - allow cookies/auth headers
  credentials: true,
  
  // LEARNING: optionsSuccessStatus - for legacy browsers
  optionsSuccessStatus: 200,
  
  // LEARNING: methods - which HTTP methods are allowed
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  // LEARNING: allowedHeaders - which headers frontend can send
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
  ],
  
  // LEARNING: maxAge - browser caches preflight response for 1 hour
  maxAge: 3600,
};

module.exports = corsOptions;
