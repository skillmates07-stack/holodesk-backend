const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const corsOptions = require('./config/corsOptions');

const app = express();

// ========================================
// SECURITY MIDDLEWARE
// ========================================

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

app.use(cors(corsOptions));
app.use(mongoSanitize());

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ========================================
// LOGGING MIDDLEWARE
// ========================================

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
// ROOT & INFO ENDPOINTS
// ========================================

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '🚀 HoloDesk API is live!',
    version: '1.0.0',
    docs: 'Visit /api for available endpoints',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'HoloDesk Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected',
    uptime: process.uptime()
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to HoloDesk API',
    version: '1.0.0',
    endpoints: {
      root: { path: '/', method: 'GET', description: 'API welcome message' },
      health: { path: '/health', method: 'GET', description: 'Health check endpoint' },
      auth: {
        base: '/api/auth',
        routes: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          refresh: 'POST /api/auth/refresh',
          me: 'GET /api/auth/me (protected)',
          logout: 'POST /api/auth/logout (protected)',
          updatePassword: 'PUT /api/auth/password (protected)',
          test: 'GET /api/auth/test'
        }
      },
      widgets: {
        base: '/api/widgets',
        routes: {
          get: 'GET /api/widgets/:workspaceId (protected)',
          save: 'POST /api/widgets/:workspaceId (protected)',
          delete: 'DELETE /api/widgets/:workspaceId/:widgetId (protected)'
        }
      }
    },
    documentation: 'https://github.com/skillmates07-stack/holodesk-backend'
  });
});

// ========================================
// API ROUTES
// ========================================

try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes mounted at /api/auth');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
}

try {
  const Widget = require('./models/Widget');
  const widgetRoutes = require('./routes/widgetRoutes');
  app.use('/api/widgets', widgetRoutes);
  console.log('✅ Widget routes mounted at /api/widgets');
} catch (error) {
  console.error('❌ Failed to load widget routes:', error.message);
}

// ========================================
// 404 HANDLER
// ========================================

app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND',
    availableEndpoints: {
      root: '/',
      health: '/health',
      api: '/api',
      auth: '/api/auth/*',
      widgets: '/api/widgets/*'
    },
    hint: 'Visit /api for list of all available endpoints'
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
  console.error('═══════════════════════════════════════════');
  console.error('❌ Global Error Handler Caught:');
  console.error('═══════════════════════════════════════════');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Stack Trace:', err.stack);
  console.error('═══════════════════════════════════════════');

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    code: err.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
      error: err
    })
  });
});

module.exports = app;
