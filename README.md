This project is currently under development 

```
aceme-interview/
├── interview-backend/
│   ├── app.py                 # Main Flask application
│   ├── config.py              # Configuration settings
│   ├── requirements.txt       # Python dependencies
│   ├── models/
│   │   ├── __init__.py
│   │   ├── ml_models.py       # ML model loading and inference
│   │   └── data_models.py     # Data structures and validation
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py            # Authentication routes
│   │   ├── interview.py       # Interview-related routes
│   │   └── upload.py          # File upload routes
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py    # Authentication logic
│   │   ├── interview_service.py # Interview processing
│   │   ├── ml_service.py      # ML model services
│   │   └── file_service.py    # File processing services
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── helpers.py         # Utility functions
│   │   └── validators.py      # Input validation
│   └── uploads/               # Temporary file storage
│       └── .gitkeep
├── interview-frontend/
│   ├── index.html             # Landing page
│   ├── login.html
│   ├── register.html
│   ├── start.html
│   ├── studio.html
│   ├── feedback.html
│   ├── css/
│   │   ├── styles.css         # Global styles
│   │   ├── start.css
│   │   ├── studio.css
│   │   └── feedback.css
│   └── js/
│       ├── firebase-config.js
│       ├── authAPI.js
│       ├── interviewAPI.js
│       ├── storage.js
│       └── utils.js
├── ml_models/                 # Pre-trained models directory
│   ├── grammar_correction/
│   └── speech_analysis/
├── data/
│   ├── resumes/              # Processed resume storage
│   └── interviews/           # Interview data storage
├── tests/
│   ├── test_auth.py
│   ├── test_interview.py
│   └── test_ml_models.py
├── scripts/
│   ├── setup_models.py       # Download and setup ML models
│   └── init_db.py           # Database initialization
├── .env                      # Environment variables
├── .gitignore
├── README.md
└── run.py                    # Application entry point
```
