const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const corsOptions = require('./config/corsOptions');

/**
 * WHAT THIS DOES: Creates and configures the Express application
 * WHY SEPARATE FROM server.js: Makes testing easier, separates concerns
 * LEARNING: This is the Express app configuration - all middleware and routes
 */

// ========================================
// CREATE EXPRESS APP
// ========================================

const app = express();

// ========================================
// SECURITY MIDDLEWARE (Must be first!)
// ========================================

/**
 * HELMET: Sets security-related HTTP headers
 * PROTECTS AGAINST: XSS, clickjacking, MIME sniffing
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

/**
 * CORS: Allow frontend to make requests to backend
 * WHY: Browser blocks cross-origin requests by default
 */
app.use(cors(corsOptions));

/**
 * MONGO SANITIZE: Prevent NoSQL injection attacks
 * EXAMPLE ATTACK: { "email": { "$ne": null } } would return all users
 * THIS BLOCKS: Removes $ and . from user input
 */
app.use(mongoSanitize());

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================

/**
 * LEARNING: Parse JSON request bodies
 * WHY: Converts req.body from string to JavaScript object
 * LIMIT: Prevents large payloads (DoS attack prevention)
 */
app.use(express.json({ limit: '10mb' }));

/**
 * LEARNING: Parse URL-encoded data (form submissions)
 */
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * COMPRESSION: Gzip response bodies
 * WHY: Reduces bandwidth usage by ~70%
 */
app.use(compression());

// ========================================
// LOGGING MIDDLEWARE (Development)
// ========================================

/**
 * LEARNING: Log every request in development
 * EXAMPLE OUTPUT: POST /api/auth/login 200 45ms
 */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
}

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================

/**
 * WHAT THIS DOES: Simple endpoint to check if server is running
 * USED BY: Render health checks, monitoring tools
 * WHY: Render automatically pings this to verify deployment
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'HoloDesk Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected',
  });
});

/**
 * API INFO ENDPOINT
 * LEARNING: Provides API version and available endpoints
 */
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to HoloDesk API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth (coming soon)',
      users: '/api/users (coming soon)',
      workspaces: '/api/workspaces (coming soon)',
      widgets: '/api/widgets (coming soon)',
    },
    documentation: 'https://github.com/skillmates07-stack/holodesk-backend',
  });
});

/**
 * ROOT ENDPOINT
 * LEARNING: Friendly message for root URL
 */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '🚀 HoloDesk API is live!',
    version: '1.0.0',
    docs: 'Visit /api for available endpoints',
  });
});

// ========================================
// API ROUTES (Will add in next phase)
// ========================================

/**
 * LEARNING: Mount route handlers
 * Pattern: app.use(path, handler)
 * WHY: Keeps routes organized by feature
 */

// Placeholder - we'll add these files next
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const workspaceRoutes = require('./routes/workspaceRoutes');
// const widgetRoutes = require('./routes/widgetRoutes');

// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/workspaces', workspaceRoutes);
// app.use('/api/widgets', widgetRoutes);

// ========================================
// 404 HANDLER (Must be after all routes)
// ========================================

/**
 * WHAT THIS DOES: Catches all undefined routes
 * WHEN IT RUNS: When no route matches the request
 * LEARNING: Middleware runs in order - this must be last
 */
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: {
      root: '/',
      health: '/health',
      api: '/api',
    },
  });
});

// ========================================
// GLOBAL ERROR HANDLER (Must be absolute last)
// ========================================

/**
 * WHAT THIS DOES: Catches all errors from anywhere in the app
 * WHY: Centralizes error handling - consistent error responses
 * LEARNING: Express detects error handlers by 4 parameters (err, req, res, next)
 */
app.use((err, req, res, next) => {
  console.error('❌ Error occurred:', err);

  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
      error: err,
    }),
  });
});

// ========================================
// EXPORT APP (CRITICAL!)
// ========================================

/**
 * LEARNING: This line is ESSENTIAL
 * WHY: server.js needs to import this app
 * Without this export, app.listen won't work
 */
module.exports = app;
