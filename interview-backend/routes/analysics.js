const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const { catchAsync } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');
const analysisService = require('../services/analysisService');

// Analyze interview response
router.post('/analyze-response', authMiddleware, catchAsync(async (req, res) => {
  const { interviewId, questionId, response, audioUrl } = req.body;
  
  if (!interviewId || !questionId || !response) {
    return res.status(400).json({
      success: false,
      message: 'Interview ID, question ID, and response are required'
    });
  }
  
  // Perform analysis
  const analysis = await analysisService.analyzeResponse(response, audioUrl);
  
  res.json({
    success: true,
    data: analysis,
    message: 'Response analyzed successfully'
  });
}));

// Generate comprehensive interview report
router.post('/generate-report/:interviewId', authMiddleware, catchAsync(async (req, res) => {
  const { interviewId } = req.params;
  
  const interview = await Interview.findById(interviewId);
  
  if (!interview) {
    return res.status(404).json({
      success: false,
      message: 'Interview not found'
    });
  }
  
  if (interview.userId !== req.user.uid) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  // Generate comprehensive report
  const report = await analysisService.generateInterviewReport(interview);
  
  // Update interview with scores and feedback
  await Interview.updateScores(interviewId, report.scores, report.overallScore, report.feedback);
  
  res.json({
    success: true,
    data: report,
    message: 'Interview report generated successfully'
  });
}));

// Get interview analytics
router.get('/interview/:interviewId', authMiddleware, catchAsync(async (req, res) => {
  const { interviewId } = req.params;
  
  const interview = await Interview.findById(interviewId);
  
  if (!interview) {
    return res.status(404).json({
      success: false,
      message: 'Interview not found'
    });
  }
  
  if (interview.userId !== req.user.uid) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  const analytics = await analysisService.getInterviewAnalytics(interview);
  
  res.json({
    success: true,
    data: analytics
  });
}));

// Get user performance trends
router.get('/user-trends/:userId', authMiddleware, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  if (userId !== req.user.uid) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  const interviews = await Interview.findByUserId(userId);
  const trends = await analysisService.calculateUserTrends(interviews);
  
  res.json({
    success: true,
    data: trends
  });
}));

// Real-time response analysis
router.post('/real-time-analysis', authMiddleware, catchAsync(async (req, res) => {
  const { text, audioData } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      message: 'Text is required for analysis'
    });
  }
  
  const analysis = await analysisService.performRealTimeAnalysis(text, audioData);
  
  res.json({
    success: true,
    data: analysis
  });
}));

// Grammar and fluency check
router.post('/grammar-check', authMiddleware, catchAsync(async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      message: 'Text is required for grammar check'
    });
  }
  
  const grammarAnalysis = await analysisService.checkGrammarAndFluency(text);
  
  res.json({
    success: true,
    data: grammarAnalysis
  });
}));

// Sentiment analysis
router.post('/sentiment-analysis', authMiddleware, catchAsync(async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      message: 'Text is required for sentiment analysis'
    });
  }
  
  const sentiment = await analysisService.analyzeSentiment(text);
  
  res.json({
    success: true,
    data: sentiment
  });
}));

// Keyword matching analysis
router.post('/keyword-match', authMiddleware, catchAsync(async (req, res) => {
  const { userResponse, expectedKeywords, resumeData } = req.body;
  
  if (!userResponse || !expectedKeywords) {
    return res.status(400).json({
      success: false,
      message: 'User response and expected keywords are required'
    });
  }
  
  const keywordMatch = await analysisService.analyzeKeywordMatch(
    userResponse,
    expectedKeywords,
    resumeData
  );
  
  res.json({
    success: true,
    data: keywordMatch
  });
}));

// Communication skills analysis
router.post('/communication-analysis', authMiddleware, catchAsync(async (req, res) => {
  const { text, audioUrl } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      message: 'Text is required for communication analysis'
    });
  }
  
  const communicationAnalysis = await analysisService.analyzeCommunicationSkills(text, audioUrl);
  
  res.json({
    success: true,
    data: communicationAnalysis
  });
}));

// Get detailed feedback
router.get('/feedback/:interviewId', authMiddleware, catchAsync(async (req, res) => {
  const { interviewId } = req.params;
  
  const interview = await Interview.findById(interviewId);
  
  if (!interview) {
    return res.status(404).json({
      success: false,
      message: 'Interview not found'
    });
  }
  
  if (interview.userId !== req.user.uid) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  const feedback = await analysisService.generateDetailedFeedback(interview);
  
  res.json({
    success: true,
    data: feedback
  });
}));

module.exports = router;