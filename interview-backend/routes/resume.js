const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { catchAsync } = require('../middleware/errorHandler');
const { uploadResume, deleteFile } = require('../middleware/upload');
const { validateFileUpload } = require('../middleware/validation');
const authMiddleware = require('../middleware/auth');
const resumeParserService = require('../services/resumeParserService');
const { getStorage } = require('../config/database');

// Upload resume
router.post('/upload', authMiddleware, uploadResume.single('resume'), validateFileUpload, catchAsync(async (req, res) => {
  const { uid } = req.user;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'No resume file uploaded'
    });
  }
  
  try {
    // Parse resume
    const resumeData = await resumeParserService.parseResume(file.path);
    
    // Upload to Firebase Storage
    const bucket = getStorage().bucket();
    const fileName = `resumes/${uid}/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);
    
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });
    
    stream.on('error', (err) => {
      console.error('Upload error:', err);
      throw err;
    });
    
    stream.on('finish', async () => {
      try {
        // Make the file publicly accessible
        await fileUpload.makePublic();
        
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        
        // Update user with resume data
        await User.updateResume(uid, publicUrl, resumeData);
        
        // Clean up local file
        await deleteFile(file.path);
        
        res.json({
          success: true,
          data: {
            resumeUrl: publicUrl,
            resumeData: resumeData
          },
          message: 'Resume uploaded and parsed successfully'
        });
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
          success: false,
          message: 'Error saving resume data'
        });
      }
    });
    
    // Start upload
    require('fs').createReadStream(file.path).pipe(stream);
    
  } catch (error) {
    console.error('Resume parsing error:', error);
    
    // Clean up local file
    if (file.path) {
      await deleteFile(file.path).catch(console.error);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error processing resume',
      error: error.message
    });
  }
}));

// Get parsed resume data
router.get('/data/:userId', authMiddleware, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  if (userId !== req.user.uid) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  if (!user.resumeData) {
    return res.status(404).json({
      success: false,
      message: 'No resume data found'
    });
  }
  
  res.json({
    success: true,
    data: user.resumeData
  });
}));

// Parse resume from URL
router.post('/parse-url', authMiddleware, catchAsync(async (req, res) => {
  const { resumeUrl } = req.body;
  
  if (!resumeUrl) {
    return res.status(400).json({
      success: false,
      message: 'Resume URL is required'
    });
  }
  
  try {
    const resumeData = await resumeParserService.parseResumeFromUrl(resumeUrl);
    
    res.json({
      success: true,
      data: resumeData,
      message: 'Resume parsed successfully'
    });
  } catch (error) {
    console.error('Resume parsing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error parsing resume from URL',
      error: error.message
    });
  }
}));

// Update resume data manually
router.put('/data/:userId', authMiddleware, catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { resumeData } = req.body;
  
  if (userId !== req.user.uid) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  if (!resumeData) {
    return res.status(400).json({
      success: false,
      message: 'Resume data is required'
    });
  }
  
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  await User.updateResume(userId, user.resumeUrl, resumeData);
  
  res.json({
    success: true,
    data: resumeData,
    message: 'Resume data updated successfully'
  });
}));

// Delete resume
router.delete('/:userId', authMiddleware, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  if (userId !== req.user.uid) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Delete from Firebase Storage if exists
  if (user.resumeUrl) {
    try {
      const bucket = getStorage().bucket();
      const fileName = user.resumeUrl.split('/').pop();
      await bucket.file(`resumes/${userId}/${fileName}`).delete();
    } catch (error) {
      console.error('Error deleting resume from storage:', error);
    }
  }
  
  // Update user to remove resume data
  await User.updateResume(userId, null, null);
  
  res.json({
    success: true,
    message: 'Resume deleted successfully'
  });
}));

// Extract keywords from resume
router.post('/extract-keywords', authMiddleware, catchAsync(async (req, res) => {
  const { resumeData } = req.body;
  
  if (!resumeData) {
    return res.status(400).json({
      success: false,
      message: 'Resume data is required'
    });
  }
  
  const keywords = await resumeParserService.extractKeywords(resumeData);
  
  res.json({
    success: true,
    data: keywords,
    message: 'Keywords extracted successfully'
  });
}));

// Get resume analysis
router.post('/analyze', authMiddleware, catchAsync(async (req, res) => {
  const { resumeData } = req.body;
  
  if (!resumeData) {
    return res.status(400).json({
      success: false,
      message: 'Resume data is required'
    });
  }
  
  const analysis = await resumeParserService.analyzeResume(resumeData);
  
  res.json({
    success: true,
    data: analysis,
    message: 'Resume analyzed successfully'
  });
}));

// Get suggested improvements
router.post('/suggestions', authMiddleware, catchAsync(async (req, res) => {
  const { resumeData } = req.body;
  
  if (!resumeData) {
    return res.status(400).json({
      success: false,
      message: 'Resume data is required'
    });
  }
  
  const suggestions = await resumeParserService.getSuggestions(resumeData);
  
  res.json({
    success: true,
    data: suggestions,
    message: 'Suggestions generated successfully'
  });
}));

module.exports = router;