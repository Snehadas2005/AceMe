// interview-backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { adminDB, adminAuth, adminStorage, firebaseUtils, getClientConfig } = require('./config/firebase');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    firebase: 'Connected'
  });
});

// Test Firebase connection
app.get('/api/test-firebase', async (req, res) => {
  try {
    // just attempt to list collections as a "connection test"
    const snapshot = await adminDB.listCollections();
    res.json({
      success: true,
      message: `Firebase connected. Found ${snapshot.length} collections.`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get Firebase client config
app.get('/api/firebase-config', (req, res) => {
  try {
    const config = getClientConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting AceMe Interview Backend...');
    console.log('📡 Initializing Firebase connection...');
    console.log('✅ Firebase connected successfully');

    const server = app.listen(PORT, () => {
      console.log(`🌟 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔥 Firebase test: http://localhost:${PORT}/api/test-firebase`);
    });

    const gracefulShutdown = () => {
      console.log('\n🔄 Shutting down gracefully...');
      server.close(() => {
        console.log('📡 Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (err) {
    console.error('💥 Server startup failed:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
