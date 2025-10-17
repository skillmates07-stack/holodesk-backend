require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/database');

/**
 * WHAT THIS DOES: Starts the Express server and connects to MongoDB
 * WHEN IT RUNS: When Render executes "npm start"
 * LEARNING: This is the entry point - everything begins here
 */

// Get port from environment or default to 5000
const PORT = process.env.PORT || 5000;

/**
 * LEARNING: Async function to handle database connection before starting server
 * WHY: We want to ensure database is connected before accepting requests
 */
const startServer = async () => {
  try {
    // Step 1: Connect to MongoDB Atlas
    console.log('🔌 Connecting to MongoDB...');
    await connectDatabase();
    
    // Step 2: Start Express server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('🚀 HoloDesk Backend Server Started!');
      console.log('═══════════════════════════════════════════');
      console.log(`📡 Server running on port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log('═══════════════════════════════════════════');
      console.log('');
    });

    // LEARNING: Graceful shutdown - properly close connections on exit
    process.on('SIGTERM', () => {
      console.log('⚠️  SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('⚠️  SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('🔍 Error details:', error);
    process.exit(1);
  }
};

// LEARNING: Catch unhandled promise rejections globally
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// LEARNING: Catch uncaught exceptions globally
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();
