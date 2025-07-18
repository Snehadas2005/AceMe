const express = require('express');
const multer = require('multer');
const { db } = require('../config/firebase');
const { generateQuestions } = require('../services/questionGenerator');
const { processAudioResponse } = require('../services/audioProcessor');
const { analyzeResponse } = require('../services/nlpAnalyzer');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Configure multer for audio uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Start new interview
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { resumeId } = req.body;

    // Get user's resume
    const resumeDoc = await db.collection('resumes').doc(resumeId).get();
    if (!resumeDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const resume = resumeDoc.data();
    
    // Generate questions based on resume
    const questions = await generateQuestions(resume);
    
    // Create interview session
    const interviewId = `interview_${Date.now()}_${uid}`;
    const interviewData = {
      interviewId,
      userId: uid,
      resumeId,
      questions,
      responses: [],
      currentQuestionIndex: 0,
      status: 'active',
      startTime: new Date(),
      endTime: null,
      analysis: {}
    };

    await db.collection('interviews').doc(interviewId).set(interviewData);

    res.json({
      success: true,
      interviewId,
      firstQuestion: questions[0],
      totalQuestions: questions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get current question
router.get('/:interviewId/question', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    if (!interviewDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    const interview = interviewDoc.data();
    const currentQuestion = interview.questions[interview.currentQuestionIndex];
    
    res.json({
      success: true,
      question: currentQuestion,
      questionNumber: interview.currentQuestionIndex + 1,
      totalQuestions: interview.questions.length,
      timeRemaining: getTimeRemaining(interview.startTime)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Submit audio response
router.post('/:interviewId/response', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    const audioFile = req.file;
    
    if (!audioFile) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required'
      });
    }

    // Process audio to text
    const transcript = await processAudioResponse(audioFile);
    
    // Get current interview state
    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    const interview = interviewDoc.data();
    
    // Analyze the response
    const currentQuestion = interview.questions[interview.currentQuestionIndex];
    const analysis = await analyzeResponse(transcript, currentQuestion, interview.resumeId);
    
    // Save response
    const response = {
      questionIndex: interview.currentQuestionIndex,
      question: currentQuestion.question,
      transcript,
      analysis,
      timestamp: new Date(),
      audioProcessingTime: new Date() - new Date()
    };

    // Update interview with response
    const updatedResponses = [...interview.responses, response];
    const nextQuestionIndex = interview.currentQuestionIndex + 1;
    
    let updateData = {
      responses: updatedResponses,
      currentQuestionIndex: nextQuestionIndex
    };

    // Check if interview is complete
    if (nextQuestionIndex >= interview.questions.length) {
      updateData.status = 'completed';
      updateData.endTime = new Date();
    }

    await db.collection('interviews').doc(interviewId).update(updateData);

    res.json({
      success: true,
      transcript,
      analysis,
      isCompleted: nextQuestionIndex >= interview.questions.length,
      nextQuestion: nextQuestionIndex < interview.questions.length ? 
        interview.questions[nextQuestionIndex] : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// End interview manually
router.post('/:interviewId/end', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    await db.collection('interviews').doc(interviewId).update({
      status: 'completed',
      endTime: new Date()
    });

    res.json({
      success: true,
      message: 'Interview ended successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get interview status
router.get('/:interviewId/status', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    if (!interviewDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    const interview = interviewDoc.data();
    
    res.json({
      success: true,
      status: interview.status,
      currentQuestionIndex: interview.currentQuestionIndex,
      totalQuestions: interview.questions.length,
      responsesCompleted: interview.responses.length,
      timeElapsed: new Date() - interview.startTime.toDate(),
      timeRemaining: getTimeRemaining(interview.startTime)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to calculate remaining time
function getTimeRemaining(startTime) {
  const maxDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
  const elapsed = new Date() - startTime.toDate();
  const remaining = Math.max(0, maxDuration - elapsed);
  return remaining;
}

module.exports = router;