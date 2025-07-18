```
interview-backend/
├── package.json
├── .env
├── .env.example
├── .gitignore
├── server.js                          # Main server file with Express setup
├── config/
│   ├── firebase.js                    # Firebase Admin SDK configuration
│   └── database.js                    # Database connection settings
├── middleware/
│   ├── auth.js                        # JWT/Firebase authentication middleware
│   ├── upload.js                      # File upload middleware (multer)
│   └── validation.js                  # Request validation middleware
├── models/
│   ├── User.js                        # User data model
│   ├── Interview.js                   # Interview session model
│   ├── Question.js                    # Question model
│   └── Report.js                      # Interview report model
├── routes/
│   ├── auth.js                        # Authentication routes
│   ├── interview.js                   # Interview management routes
│   ├── questions.js                   # Question generation routes
│   ├── analysis.js                    # Analysis and reporting routes
│   └── resume.js                      # Resume upload and parsing routes
├── services/
│   ├── audioProcessor.js              # Google Cloud Speech-to-Text integration
│   ├── nlpAnalyzer.js                 # Natural Language Processing analysis
│   ├── reportGenerator.js             # Interview report generation
│   ├── questionGenerator.js           # AI question generation
│   ├── resumeParser.js                # Resume parsing (PDF/DOCX)
│   └── websocket.js                   # WebSocket connection management
├── utils/
│   ├── helpers.js                     # Common utility functions
│   ├── constants.js                   # Application constants
│   └── interviewTimer.js              # Interview session timing utilities
├── uploads/
│   └── resumes/                       # Resume file storage
├── temp/                              # Temporary files (audio processing)
├── logs/                              # Application logs
└── tests/                             # Test files
    ├── unit/
    ├── integration/
    └── fixtures/
```
