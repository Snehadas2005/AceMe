const express = require('express');
const { auth, db } = require('../config/firebase');
const multer = require('multer');
const path = require('path');
const { parseResume } = require('../services/resumeParser');
const { validateSignup, validateLogin } = require('../middleware/validation');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } 
});

router.post('/register', validateSignup, async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      fullName,
      createdAt: new Date(),
      profileComplete: false
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        uid: userRecord.uid,
        email,
        fullName
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/login', validateLogin, async (req, res) => {
  try {
    const { idToken } = req.body;

    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      message: 'Login successful',
      user: userData
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

router.post('/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { uid } = req.body;
    const resumePath = req.file.path;

    const resumeData = await parseResume(resumePath);

    await db.collection('users').doc(uid).update({
      resume: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        path: resumePath,
        uploadedAt: new Date()
      },
      resumeData: resumeData,
      profileComplete: true
    });

    res.json({
      success: true,
      message: 'Resume uploaded and parsed successfully',
      resumeData: resumeData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;