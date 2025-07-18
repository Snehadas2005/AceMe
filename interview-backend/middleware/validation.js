const { body, param, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .notEmpty()
    .trim()
    .withMessage('Name is required'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Interview creation validation
const validateInterviewCreation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  handleValidationErrors
];

// Question creation validation
const validateQuestionCreation = [
  body('text')
    .notEmpty()
    .trim()
    .withMessage('Question text is required'),
  body('category')
    .isIn(['technical', 'behavioral', 'general'])
    .withMessage('Category must be technical, behavioral, or general'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('domain')
    .notEmpty()
    .trim()
    .withMessage('Domain is required'),
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('timeLimit')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Time limit must be between 30 and 300 seconds'),
  handleValidationErrors
];

// Response submission validation
const validateResponseSubmission = [
  body('interviewId')
    .notEmpty()
    .withMessage('Interview ID is required'),
  body('questionId')
    .notEmpty()
    .withMessage('Question ID is required'),
  body('response')
    .notEmpty()
    .trim()
    .withMessage('Response is required'),
  handleValidationErrors
];

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const allowedMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only PDF and Word documents are allowed'
    });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum size is 5MB'
    });
  }

  next();
};

// Audio file validation
const validateAudioUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file uploaded'
    });
  }

  const allowedMimeTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm'];
  
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid audio file type'
    });
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'Audio file size too large. Maximum size is 10MB'
    });
  }

  next();
};

// Parameter validation
const validateInterviewId = [
  param('id')
    .notEmpty()
    .withMessage('Interview ID is required'),
  handleValidationErrors
];

const validateUserId = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateInterviewCreation,
  validateQuestionCreation,
  validateResponseSubmission,
  validateFileUpload,
  validateAudioUpload,
  validateInterviewId,
  validateUserId,
  handleValidationErrors
};