// interview-backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { firebaseConnection } = require('./config/firebase');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Import routes (your existing routes)
// const authRoutes = require('./routes/auth');
// const interviewRoutes = require('./routes/interview');
// Add your existing route imports here

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    firebase: firebaseConnection.isInitialized ? 'Connected' : 'Disconnected'
  });
});

// Test Firebase connection endpoint
app.get('/api/test-firebase', async (req, res) => {
  try {
    await firebaseConnection.testConnection();
    res.json({ 
      success: true, 
      message: 'Firebase connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get Firebase client config for frontend
app.get('/api/firebase-config', (req, res) => {
  try {
    const config = firebaseConnection.getClientConfig();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Use your existing routes
// app.use('/api/auth', authRoutes);
// app.use('/api/interview', interviewRoutes);
// Add your existing routes here

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Initialize Firebase and start server
const startServer = async () => {
  try {
    console.log('🚀 Starting AceMe Interview Backend...');
    
    // Initialize Firebase connection
    console.log('📡 Initializing Firebase connection...');
    await firebaseConnection.initialize();
    console.log('✅ Firebase connected successfully');
    
    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`🌟 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔥 Firebase test: http://localhost:${PORT}/api/test-firebase`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.log(`\n🔄 ${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('📡 HTTP server closed');
        
        try {
          await firebaseConnection.shutdown();
          console.log('🔥 Firebase connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('💥 Server startup failed:', error.message);
    console.error('🔍 Check your environment variables and Firebase configuration');
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
