const express = require('express');
const multer = require('multer');
const { db } = require('../config/firebase');
const { generateQuestions } = require('../services/questionGenerator');
const { speechToText, analyzeAudioQuality } = require('../services/audioProcessor');
const { analyzeResponse } = require('../services/nlpAnalyzer');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for audio uploads
const audioStorage = multer.memoryStorage();
const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'), false);
    }
  }
});

// Start interview session
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.user;
    
    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData.resumeData) {
      return res.status(400).json({
        success: false,
        message: 'Please upload resume first'
      });
    }

    // Generate questions based on resume
    const questions = await generateQuestions(userData.resumeData);

    // Create interview session
    const interviewId = uuidv4();
    const interviewData = {
      interviewId,
      userId: uid,
      questions,
      startTime: new Date(),
      status: 'active',
      currentQuestionIndex: 0,
      responses: [],
      duration: 30 * 60 * 1000, // 30 minutes in milliseconds
      audioEnabled: true,
      videoEnabled: true
    };

    await db.collection('interviews').doc(interviewId).set(interviewData);

    res.json({
      success: true,
      message: 'Interview session started',
      interview: {
        interviewId,
        questions: questions.map(q => ({ 
          id: q.id, 
          question: q.question, 
          category: q.category,
          expectedKeywords: q.expectedKeywords 
        })),
        duration: 30,
        questionInterval: 60 // 60 seconds per question
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get current question
router.get('/:interviewId/current-question', authenticateToken, async (req, res) => {
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
    const { questions, currentQuestionIndex, startTime } = interview;

    // Check if interview time has exceeded
    const elapsedTime = Date.now() - startTime.toDate().getTime();
    if (elapsedTime > interview.duration) {
      await db.collection('interviews').doc(interviewId).update({
        status: 'completed',
        endTime: new Date()
      });
      
      return res.json({
        success: true,
        message: 'Interview time completed',
        completed: true,
        timeExceeded: true
      });
    }

    if (currentQuestionIndex >= questions.length) {
      return res.json({
        success: true,
        message: 'All questions completed',
        completed: true
      });
    }

    const currentQuestion = questions[currentQuestionIndex];

    res.json({
      success: true,
      question: currentQuestion,
      questionNumber: currentQuestionIndex + 1,
      totalQuestions: questions.length,
      timeRemaining: interview.duration - elapsedTime,
      nextQuestionIn: 60000 // 60 seconds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Submit audio response
router.post('/:interviewId/submit-audio', audioUpload.single('audio'), authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { questionId, responseTime } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }

    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    
    if (!interviewDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    const interview = interviewDoc.data();
    const currentQuestion = interview.questions.find(q => q.id === questionId);
    
    if (!currentQuestion) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID'
      });
    }

    // Process audio to text
    const audioBuffer = req.file.buffer;
    const transcriptionResult = await speechToText(audioBuffer, 'webm');
    
    if (!transcriptionResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process audio: ' + transcriptionResult.error
      });
    }

    const transcription = transcriptionResult.transcription;
    
    // Analyze audio quality
    const audioQuality = analyzeAudioQuality(audioBuffer);
    
    // Analyze response using NLP
    const nlpAnalysis = analyzeResponse(transcription, currentQuestion.expectedKeywords);
    
    // Create response object
    const response = {
      questionId,
      transcription,
      audioQuality,
      nlpAnalysis,
      responseTime: parseInt(responseTime),
      timestamp: new Date(),
      audioSize: audioBuffer.length,
      audioDuration: transcriptionResult.duration
    };

    // Update interview with response
    const updatedResponses = [...interview.responses, response];
    await db.collection('interviews').doc(interviewId).update({
      responses: updatedResponses,
      currentQuestionIndex: interview.currentQuestionIndex + 1,
      lastActivity: new Date()
    });

    res.json({
      success: true,
      message: 'Audio response processed successfully',
      transcription,
      analysis: nlpAnalysis,
      audioQuality,
      nextQuestion: interview.currentQuestionIndex + 1 < interview.questions.length
    });
  } catch (error) {
    console.error('Audio processing error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Skip current question
router.post('/:interviewId/skip-question', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { questionId } = req.body;

    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    const interview = interviewDoc.data();

    // Add skipped response
    const skippedResponse = {
      questionId,
      transcription: '[Question Skipped]',
      skipped: true,
      timestamp: new Date(),
      nlpAnalysis: {
        communicationSkills: { score: 0, feedback: 'Question was skipped' },
        confidence: { score: 0, feedback: 'Question was skipped' },
        grammarFluency: { score: 0, feedback: 'Question was skipped' },
        subjectKnowledge: { score: 0, feedback: 'Question was skipped' },
        workQualities: { score: 0, feedback: 'Question was skipped' }
      }
    };

    await db.collection('interviews').doc(interviewId).update({
      responses: [...interview.responses, skippedResponse],
      currentQuestionIndex: interview.currentQuestionIndex + 1,
      lastActivity: new Date()
    });

    res.json({
      success: true,
      message: 'Question skipped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Auto-advance to next question (called by frontend timer)
router.post('/:interviewId/auto-advance', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { questionId } = req.body;

    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    const interview = interviewDoc.data();

    // Check if there's already a response for this question
    const existingResponse = interview.responses.find(r => r.questionId === questionId);
    
    if (!existingResponse) {
      // Add auto-skipped response
      const autoSkippedResponse = {
        questionId,
        transcription: '[Auto-advanced - No response recorded]',
        autoSkipped: true,
        timestamp: new Date(),
        nlpAnalysis: {
          communicationSkills: { score: 0, feedback: 'No response provided' },
          confidence: { score: 0, feedback: 'No response provided' },
          grammarFluency: { score: 0, feedback: 'No response provided' },
          subjectKnowledge: { score: 0, feedback: 'No response provided' },
          workQualities: { score: 0, feedback: 'No response provided' }
        }
      };

      await db.collection('interviews').doc(interviewId).update({
        responses: [...interview.responses, autoSkippedResponse],
        currentQuestionIndex: interview.currentQuestionIndex + 1,
        lastActivity: new Date()
      });
    } else {
      // Just advance to next question
      await db.collection('interviews').doc(interviewId).update({
        currentQuestionIndex: interview.currentQuestionIndex + 1,
        lastActivity: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Advanced to next question'
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

    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    const interview = interviewDoc.data();

    await db.collection('interviews').doc(interviewId).update({
      status: 'completed',
      endTime: new Date(),
      manualEnd: true
    });

    res.json({
      success: true,
      message: 'Interview ended successfully',
      totalResponses: interview.responses.length,
      totalQuestions: interview.questions.length
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
    const elapsedTime = Date.now() - interview.startTime.toDate().getTime();
    
    res.json({
      success: true,
      status: interview.status,
      currentQuestionIndex: interview.currentQuestionIndex,
      totalQuestions: interview.questions.length,
      totalResponses: interview.responses.length,
      elapsedTime,
      timeRemaining: Math.max(0, interview.duration - elapsedTime)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;