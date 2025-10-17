const mongoose = require('mongoose');

/**
 * WHAT THIS DOES: Connects to MongoDB Atlas database
 * WHEN IT RUNS: Once when server starts
 * WHY IMPORTANT: Without this, you can't save/retrieve any data
 */

const connectDatabase = async () => {
  try {
    // LEARNING: mongoose.connect() opens connection to MongoDB
    // process.env.MONGODB_URI comes from Render environment variables
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options optimize performance and reliability
      maxPoolSize: 10,        // WHY: Reuses up to 10 connections (faster)
      serverSelectionTimeoutMS: 5000,  // WHY: Fails fast if DB is down
      socketTimeoutMS: 45000,  // WHY: Prevents hanging connections
    });

    // SUCCESS! Log the connection
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    
    // LEARNING: Monitor connection events for debugging
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

  } catch (error) {
    // LEARNING: If connection fails, log error and exit
    // WHY: No point running server if database is unreachable
    console.error('❌ MongoDB Connection Failed:', error.message);
    console.error('🔍 Check your MONGODB_URI in Render environment variables');
    process.exit(1);  // Exit with failure code
  }
};

module.exports = connectDatabase;
