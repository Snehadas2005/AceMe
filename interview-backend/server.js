require('dotenv').config(); // Move this to the very top

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

    const collections = await adminDB.listCollections();
    console.log(`✅ Firebase connected successfully. Found ${collections.length} collections.`);

    const server = app.listen(PORT, () => {
      console.log(`🌟 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔥 Firebase test: http://localhost:${PORT}/api/test-firebase`);
    });

    // Handle port already in use error
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use`);
        console.log('💡 Trying to find an available port...');
        
        // Try ports from 5001 to 5010
        for (let port = 5001; port <= 5010; port++) {
          try {
            const newServer = app.listen(port, () => {
              console.log(`🌟 Server running on port ${port}`);
              console.log(`📍 Health check: http://localhost:${port}/api/health`);
              console.log(`🔥 Firebase test: http://localhost:${port}/api/test-firebase`);
            });
            
            newServer.on('error', (portErr) => {
              if (portErr.code === 'EADDRINUSE' && port < 5010) {
                // Continue to next port
                return;
              } else if (portErr.code === 'EADDRINUSE') {
                console.error('❌ No available ports found. Please free up a port or specify a different one.');
                process.exit(1);
              }
            });
            
            // If we get here, the server started successfully
            setupGracefulShutdown(newServer);
            break;
            
          } catch (portError) {
            if (port === 5010) {
              console.error('❌ No available ports found. Please free up a port or specify a different one.');
              process.exit(1);
            }
          }
        }
      } else {
        console.error('💥 Server startup failed:', err.message);
        process.exit(1);
      }
    });

    setupGracefulShutdown(server);

  } catch (err) {
    console.error('💥 Server startup failed:', err.message);
    process.exit(1);
  }
};

const setupGracefulShutdown = (server) => {
  const gracefulShutdown = () => {
    console.log('\n🔄 Shutting down gracefully...');
    server.close(() => {
      console.log('📡 Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();

module.exports = app;