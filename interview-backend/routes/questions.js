const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { catchAsync } = require('../middleware/errorHandler');
const { validateQuestionCreation } = require('../middleware/validation');
const authMiddleware = require('../middleware/auth');

// Get all questions
router.get('/', catchAsync(async (req, res) => {
  const { domain, category, difficulty, limit = 10 } = req.query;
  
  let questions;
  
  if (domain) {
    questions = await Question.findByDomain(domain, parseInt(limit));
  } else {
    questions = await Question.getRandomQuestions(parseInt(limit));
  }
  
  res.json({
    success: true,
    data: questions,
    count: questions.length
  });
}));

// Get question by ID
router.get('/:id', catchAsync(async (req, res) => {
  const question = await Question.findById(req.params.id);
  
  if (!question) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  res.json({
    success: true,
    data: question
  });
}));

// Generate questions based on resume
router.post('/generate', authMiddleware, catchAsync(async (req, res) => {
  const { resumeData, count = 5 } = req.body;
  
  if (!resumeData) {
    return res.status(400).json({
      success: false,
      message: 'Resume data is required'
    });
  }
  
  const questions = await Question.generateQuestionsForResume(resumeData, count);
  
  res.json({
    success: true,
    data: questions,
    count: questions.length
  });
}));

// Create new question (admin only)
router.post('/', authMiddleware, validateQuestionCreation, catchAsync(async (req, res) => {
  const questionData = req.body;
  const question = await Question.create(questionData);
  
  res.status(201).json({
    success: true,
    data: question,
    message: 'Question created successfully'
  });
}));

// Update question (admin only)
router.put('/:id', authMiddleware, validateQuestionCreation, catchAsync(async (req, res) => {
  const question = await Question.findById(req.params.id);
  
  if (!question) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  // Update question logic here
  await Question.collection().doc(req.params.id).update(req.body);
  
  const updatedQuestion = await Question.findById(req.params.id);
  
  res.json({
    success: true,
    data: updatedQuestion,
    message: 'Question updated successfully'
  });
}));

// Delete question (admin only)
router.delete('/:id', authMiddleware, catchAsync(async (req, res) => {
  const question = await Question.findById(req.params.id);
  
  if (!question) {
    return res.status(404).json({
      success: false,
      message: 'Question not found'
    });
  }
  
  await Question.collection().doc(req.params.id).delete();
  
  res.json({
    success: true,
    message: 'Question deleted successfully'
  });
}));

// Get questions by keywords
router.post('/search', catchAsync(async (req, res) => {
  const { keywords, limit = 10 } = req.body;
  
  if (!keywords || !Array.isArray(keywords)) {
    return res.status(400).json({
      success: false,
      message: 'Keywords array is required'
    });
  }
  
  const questions = await Question.findByKeywords(keywords, limit);
  
  res.json({
    success: true,
    data: questions,
    count: questions.length
  });
}));

// Bulk create questions (admin only)
router.post('/bulk', authMiddleware, catchAsync(async (req, res) => {
  const { questions } = req.body;
  
  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({
      success: false,
      message: 'Questions array is required'
    });
  }
  
  const createdQuestions = [];
  
  for (const questionData of questions) {
    try {
      const question = await Question.create(questionData);
      createdQuestions.push(question);
    } catch (error) {
      console.error('Error creating question:', error);
    }
  }
  
  res.status(201).json({
    success: true,
    data: createdQuestions,
    count: createdQuestions.length,
    message: `${createdQuestions.length} questions created successfully`
  });
}));

module.exports = router;