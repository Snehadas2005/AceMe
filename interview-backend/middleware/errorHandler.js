const logger = require('../utils/logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle Firebase Auth errors
const handleFirebaseAuthError = (error) => {
  let message = 'Authentication failed';
  
  switch (error.code) {
    case 'auth/user-not-found':
      message = 'User not found';
      break;
    case 'auth/wrong-password':
      message = 'Invalid password';
      break;
    case 'auth/email-already-in-use':
      message = 'Email already in use';
      break;
    case 'auth/weak-password':
      message = 'Password is too weak';
      break;
    case 'auth/invalid-email':
      message = 'Invalid email address';
      break;
    case 'auth/id-token-expired':
      message = 'Token expired';
      break;
    case 'auth/id-token-revoked':
      message = 'Token revoked';
      break;
    case 'auth/invalid-id-token':
      message = 'Invalid token';
      break;
    default:
      message = error.message || 'Authentication error';
  }

  return new AppError(message, 401);
};

// Handle Firestore errors
const handleFirestoreError = (error) => {
  let message = 'Database operation failed';
  let statusCode = 500;

  switch (error.code) {
    case 'not-found':
      message = 'Resource not found';
      statusCode = 404;
      break;
    case 'permission-denied':
      message = 'Access denied';
      statusCode = 403;
      break;
    case 'already-exists':
      message = 'Resource already exists';
      statusCode = 409;
      break;
    case 'invalid-argument':
      message = 'Invalid data provided';
      statusCode = 400;
      break;
    case 'resource-exhausted':
      message = 'Service temporarily unavailable';
      statusCode = 503;
      break;
    default:
      message = error.message || 'Database error';
  }

  return new AppError(message, statusCode);
};

// Handle file upload errors
const handleFileUploadError = (error) => {
  let message = 'File upload failed';
  let statusCode = 500;

  if (error.code === 'LIMIT_FILE_SIZE') {
    message = 'File size too large';
    statusCode = 413;
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    message = 'Unexpected file field';
    statusCode = 400;
  }

  return new AppError(message, statusCode);
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.code && err.code.startsWith('auth/')) {
      error = handleFirebaseAuthError(error);
    } else if (err.code && (err.code === 'not-found' || err.code === 'permission-denied')) {
      error = handleFirestoreError(error);
    } else if (err.code && err.code.startsWith('LIMIT_')) {
      error = handleFileUploadError(error);
    }

    sendErrorProd(error, res);
  }
};

// Async error catcher
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync
};