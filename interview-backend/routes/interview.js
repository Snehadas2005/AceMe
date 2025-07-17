const express = require('express');
const { db } = require('../config/firebase');
const { generateQuestions } = require('../services/questionGenerator');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.user;
    
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData.resumeData) {
      return res.status(400).json({
        success: false,
        message: 'Please upload resume first'
      });
    }

    const questions = await generateQuestions(userData.resumeData);

    const interviewId = uuidv4();
    const interviewData = {
      interviewId,
      userId: uid,
      questions,
      startTime: new Date(),
      status: 'active',
      currentQuestionIndex: 0,
      responses: [],
      duration: 30 * 60 * 1000 
    };

    await db.collection('interviews').doc(interviewId).set(interviewData);

    res.json({
      success: true,
      message: 'Interview session started',
      interview: {
        interviewId,
        questions: questions.map(q => ({ id: q.id, question: q.question, category: q.category })),
        duration: 30
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/:interviewId/next-question', authenticateToken, async (req, res) => {
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
    const { questions, currentQuestionIndex } = interview;

    if (currentQuestionIndex >= questions.length) {
      return res.json({
        success: true,
        message: 'Interview completed',
        completed: true
      });
    }

    const currentQuestion = questions[currentQuestionIndex];

    res.json({
      success: true,
      question: currentQuestion,
      questionNumber: currentQuestionIndex + 1,
      totalQuestions: questions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/:interviewId/submit-answer', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { answer, questionId, audioData } = req.body;

    const interviewDoc = await db.collection('interviews').doc(interviewId).get();
    const interview = interviewDoc.data();

    const response = {
      questionId,
      answer,
      audioData,
      timestamp: new Date(),
      responseTime: new Date() - interview.startTime
    };

    await db.collection('interviews').doc(interviewId).update({
      responses: [...interview.responses, response],
      currentQuestionIndex: interview.currentQuestionIndex + 1
    });

    res.json({
      success: true,
      message: 'Answer submitted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

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

module.exports = router;