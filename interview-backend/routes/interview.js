const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { adminDB } = require('../config/firebase');
const questionGenerator = require('../services/questionGenerator');
const reportGenerator = require('../services/reportGenerator');
const router = express.Router();

// Start interview
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { resumeId } = req.body;

    // Get user's resume data
    const resumeDoc = await adminDB.collection('resumes').doc(resumeId).get();
    if (!resumeDoc.exists) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    const resumeData = resumeDoc.data();
    
    // Generate questions based on resume
    const questions = await questionGenerator.generateQuestions(resumeData);
    
    // Create interview session
    const interviewData = {
      userId: uid,
      resumeId,
      questions,
      startTime: new Date(),
      status: 'active',
      duration: 30 * 60 * 1000 // 30 minutes in milliseconds
    };

    const interviewRef = await adminDB.collection('interviews').add(interviewData);

    res.json({
      success: true,
      interviewId: interviewRef.id,
      questions,
      duration: interviewData.duration
    });

  } catch (error) {
    console.error('Interview start error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get interview status
router.get('/status/:interviewId', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { uid } = req.user;

    const interviewDoc = await adminDB.collection('interviews').doc(interviewId).get();
    if (!interviewDoc.exists) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    const interviewData = interviewDoc.data();
    
    // Check if user owns this interview
    if (interviewData.userId !== uid) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({
      success: true,
      interview: interviewData
    });

  } catch (error) {
    console.error('Interview status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate report
router.post('/generate-report', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { interviewId } = req.body;

    // Get interview data
    const interviewDoc = await adminDB.collection('interviews').doc(interviewId).get();
    if (!interviewDoc.exists) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    const interviewData = interviewDoc.data();
    
    // Check if user owns this interview
    if (interviewData.userId !== uid) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Get resume data
    const resumeDoc = await adminDB.collection('resumes').doc(interviewData.resumeId).get();
    const resumeData = resumeDoc.data();

    // Generate report
    const reportData = {
      userId: uid,
      interviewId,
      questions: interviewData.questions,
      answers: interviewData.answers,
      resumeData,
      duration: interviewData.endTime - interviewData.startTime,
      audioAnalysis: interviewData.audioData
    };

    const report = await reportGenerator.generateReport(reportData);

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get report
router.get('/report/:interviewId', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { uid } = req.user;

    const reportDoc = await adminDB.collection('reports').doc(interviewId).get();
    if (!reportDoc.exists) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const reportData = reportDoc.data();
    
    // Check if user owns this report
    if (reportData.userId !== uid) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({
      success: true,
      report: reportData
    });

  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;