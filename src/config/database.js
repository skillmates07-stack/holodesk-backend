const mongoose = require('mongoose');

/**
 * WHAT THIS DOES: Connects to MongoDB Atlas database with debug logging
 * WHEN IT RUNS: Once when server starts
 * WHY IMPORTANT: Without this, you can't save/retrieve any data
 * 
 * DEBUG MODE: Shows connection details to help troubleshoot authentication
 */

const connectDatabase = async () => {
  try {
    // ========================================
    // DEBUG LOGGING (helps troubleshoot connection issues)
    // ========================================
    
    console.log('═══════════════════════════════════════════');
    console.log('🔍 DEBUG: MongoDB Connection Attempt');
    console.log('═══════════════════════════════════════════');
    
    // Check if MONGODB_URI environment variable exists
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is MISSING!');
      console.error('🔧 Fix: Add MONGODB_URI in Render Environment settings');
      process.exit(1);
    }
    
    console.log('✅ MONGODB_URI environment variable: EXISTS');
    
    // Extract and display connection details (password hidden for security)
    const uriParts = process.env.MONGODB_URI.split('://');
    if (uriParts.length > 1) {
      const afterProtocol = uriParts[1];
      const username = afterProtocol.split(':')[0];
      const clusterInfo = afterProtocol.split('@')[1];
      const clusterAddress = clusterInfo ? clusterInfo.split('/')[0] : 'unknown';
      const databaseName = clusterInfo ? clusterInfo.split('/')[1]?.split('?')[0] : 'unknown';
      
      console.log('🔍 Protocol: mongodb+srv://');
      console.log('🔍 Username from URI:', username || 'NOT FOUND');
      console.log('🔍 Cluster Address:', clusterAddress || 'NOT FOUND');
      console.log('🔍 Database Name:', databaseName || 'NOT SPECIFIED');
      console.log('🔍 Password: ******** (hidden for security)');
    }
    
    console.log('═══════════════════════════════════════════');
    console.log('🔌 Attempting connection to MongoDB...');
    console.log('═══════════════════════════════════════════');
    
    // ========================================
    // ACTUAL CONNECTION
    // ========================================
    
    /**
     * LEARNING: mongoose.connect() opens connection to MongoDB
     * Options explained:
     * - maxPoolSize: Reuses up to 10 connections (improves performance)
     * - serverSelectionTimeoutMS: Fails after 5 seconds if DB unreachable
     * - socketTimeoutMS: Closes hanging connections after 45 seconds
     */
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // ========================================
    // SUCCESS LOGGING
    // ========================================
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('✅ MongoDB Connection Successful!');
    console.log('═══════════════════════════════════════════');
    console.log('📡 Connected to Host:', conn.connection.host);
    console.log('📊 Database Name:', conn.connection.name);
    console.log('🔢 Connection State:', conn.connection.readyState === 1 ? 'Connected' : 'Unknown');
    console.log('═══════════════════════════════════════════');
    console.log('');
    
    // ========================================
    // CONNECTION EVENT LISTENERS (for monitoring)
    // ========================================
    
    /**
     * LEARNING: These listeners help monitor connection health
     * Useful for debugging and production monitoring
     */
    
    // On error during connection
    mongoose.connection.on('error', (err) => {
      console.error('═══════════════════════════════════════════');
      console.error('❌ MongoDB connection error occurred:');
      console.error('═══════════════════════════════════════════');
      console.error('Error:', err.message);
      console.error('Error Code:', err.code);
      console.error('═══════════════════════════════════════════');
    });

    // On disconnection
    mongoose.connection.on('disconnected', () => {
      console.warn('═══════════════════════════════════════════');
      console.warn('⚠️  MongoDB disconnected!');
      console.warn('📡 Mongoose will attempt to reconnect...');
      console.warn('═══════════════════════════════════════════');
    });

    // On successful reconnection
    mongoose.connection.on('reconnected', () => {
      console.log('═══════════════════════════════════════════');
      console.log('✅ MongoDB reconnected successfully');
      console.log('═══════════════════════════════════════════');
    });

  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // ========================================
    
    console.error('');
    console.error('═══════════════════════════════════════════');
    console.error('❌ MongoDB Connection Failed!');
    console.error('═══════════════════════════════════════════');
    console.error('Error Message:', error.message);
    console.error('Error Name:', error.name);
    
    // Provide specific troubleshooting based on error type
    if (error.message.includes('bad auth')) {
      console.error('');
      console.error('🔧 ISSUE: Authentication Failed');
      console.error('📋 Possible causes:');
      console.error('   1. Username in MONGODB_URI doesn\'t match MongoDB Atlas user');
      console.error('   2. Password in MONGODB_URI is incorrect');
      console.error('   3. Password has special characters that aren\'t URL-encoded');
      console.error('   4. Database user doesn\'t have proper permissions');
      console.error('');
      console.error('✅ Solutions:');
      console.error('   1. Go to MongoDB Atlas → Database Access');
      console.error('   2. Verify username matches exactly (case-sensitive)');
      console.error('   3. Reset password to simple one (letters/numbers only)');
      console.error('   4. Ensure user has "Read and write to any database" permission');
      console.error('   5. Update MONGODB_URI in Render with new credentials');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('querySrv')) {
      console.error('');
      console.error('🔧 ISSUE: Cannot Find MongoDB Cluster');
      console.error('📋 Possible causes:');
      console.error('   1. Cluster address in MONGODB_URI is incorrect');
      console.error('   2. DNS resolution failed');
      console.error('   3. Connection string format is wrong');
      console.error('');
      console.error('✅ Solutions:');
      console.error('   1. Go to MongoDB Atlas → Database → Connect');
      console.error('   2. Copy fresh connection string');
      console.error('   3. Verify cluster address format: cluster0.xxxxx.mongodb.net');
      console.error('   4. Update MONGODB_URI in Render');
    } else if (error.message.includes('timeout')) {
      console.error('');
      console.error('🔧 ISSUE: Connection Timeout');
      console.error('📋 Possible causes:');
      console.error('   1. Network Access not configured in MongoDB Atlas');
      console.error('   2. Firewall blocking connection');
      console.error('');
      console.error('✅ Solutions:');
      console.error('   1. Go to MongoDB Atlas → Network Access');
      console.error('   2. Add IP: 0.0.0.0/0 (Allow access from anywhere)');
      console.error('   3. Wait 2-3 minutes for changes to apply');
    }
    
    console.error('');
    console.error('🔍 Full error details:');
    console.error(error);
    console.error('═══════════════════════════════════════════');
    console.error('');
    
    // Exit process with failure code (Render will retry)
    process.exit(1);
  }
};

module.exports = connectDatabase;
