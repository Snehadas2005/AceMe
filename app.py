from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
import threading
import queue
import cv2
import speech_recognition as sr
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from PyPDF2 import PdfReader
from docx import Document
from textblob import TextBlob
import re
import json
import uuid
from datetime import datetime
import bcrypt
import jwt
from functools import wraps

app = Flask(__name__)

# Configure CORS properly
CORS(app, 
     origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "*"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# In-memory storage (replace with real database in production)
users = {}
interviews = {}
resumes = {}

# ========== Initialize Models ==========
print("Loading models...")
tokenizer, model = None, None
try:
    tokenizer = AutoTokenizer.from_pretrained("vennify/t5-base-grammar-correction")
    model = AutoModelForSeq2SeqLM.from_pretrained("vennify/t5-base-grammar-correction")
    print("✅ Grammar correction model loaded")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("⚠️ Continuing without grammar correction model")

# ========== Core Helpers ==========
def correct_grammar(text):
    if not tokenizer or not model:
        return text
    try:
        input_text = "correct: " + text
        input_ids = tokenizer.encode(input_text, return_tensors="pt", max_length=512, truncation=True)
        outputs = model.generate(input_ids, max_length=128, num_beams=4, early_stopping=True)
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
    except Exception as e:
        print(f"Grammar correction error: {e}")
        return text

def extract_text_from_resume(file_path):
    try:
        if file_path.lower().endswith(".pdf"):
            reader = PdfReader(file_path)
            text = " ".join(page.extract_text() for page in reader.pages if page.extract_text())
            return text.strip()
        elif file_path.lower().endswith(".docx"):
            doc = Document(file_path)
            return " ".join(para.text for para in doc.paragraphs if para.text.strip())
        elif file_path.lower().endswith(".txt"):
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        else:
            return ""
    except Exception as e:
        print(f"Error extracting text: {e}")
        return ""

def generate_questions_from_resume(text):
    questions = []
    text_lower = text.lower()
    
    # Technical skills questions
    if any(skill in text_lower for skill in ['python', 'javascript', 'java', 'c++', 'react', 'node', 'sql']):
        questions.append("Can you walk me through your technical skills and experience?")
        questions.append("How would you rate your proficiency in your primary programming language?")
    
    # Project-based questions
    if 'project' in text_lower:
        questions.append("Tell me about a challenging project you've worked on.")
        questions.append("What was your role in your most significant project?")
    
    # Experience-based questions
    if any(exp in text_lower for exp in ['internship', 'experience', 'work', 'job']):
        questions.append("What did you learn from your previous work experience?")
        questions.append("How do you handle working in a team environment?")
    
    # Education-based questions
    if any(edu in text_lower for edu in ['university', 'college', 'degree', 'graduate']):
        questions.append("How has your educational background prepared you for this role?")
    
    # Default questions if nothing specific found
    if not questions:
        questions = [
            "Tell me about yourself.",
            "What are your strengths and weaknesses?",
            "Why are you interested in this position?"
        ]
    
    # Always add these common questions
    questions.extend([
        "Where do you see yourself in 5 years?",
        "Why should we hire you?",
        "Do you have any questions for us?"
    ])
    
    return questions[:8]  # Limit to 8 questions

def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow().timestamp() + 86400  # 24 hours
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Token is invalid'}), 401
            
        return f(user_id, *args, **kwargs)
    return decorated

# ========== Auth Routes ==========
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ['name', 'email', 'password']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        email = data['email'].lower()
        
        # Check if user already exists
        if email in users:
            return jsonify({'error': 'User already exists'}), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # Create user
        user_id = str(uuid.uuid4())
        users[email] = {
            'id': user_id,
            'name': data['name'],
            'email': email,
            'password': hashed_password,
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Generate token
        token = generate_token(user_id)
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': {
                'id': user_id,
                'name': data['name'],
                'email': email
            },
            'token': token
        })
        
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ['email', 'password']):
            return jsonify({'error': 'Missing email or password'}), 400
        
        email = data['email'].lower()
        
        # Check if user exists
        if email not in users:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        user = users[email]
        
        # Verify password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate token
        token = generate_token(user['id'])
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email']
            },
            'token': token
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# ========== Interview Routes ==========
@app.route('/api/upload-resume', methods=['POST'])
@token_required
def upload_resume(user_id):
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Check file type
        allowed_extensions = {'.pdf', '.docx', '.txt'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': 'File type not supported. Please upload PDF, DOCX, or TXT files.'}), 400

        # Save file temporarily and extract text
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            file.save(tmp.name)
            text = extract_text_from_resume(tmp.name)
            os.unlink(tmp.name)

        if not text:
            return jsonify({'error': 'Could not extract text from file'}), 400

        # Generate questions
        questions = generate_questions_from_resume(text)
        
        # Store resume data
        resume_id = str(uuid.uuid4())
        resumes[resume_id] = {
            'id': resume_id,
            'user_id': user_id,
            'filename': file.filename,
            'text': text,
            'questions': questions,
            'word_count': len(text.split()),
            'uploaded_at': datetime.utcnow().isoformat()
        }

        return jsonify({
            'success': True,
            'message': 'Resume processed successfully',
            'resume_id': resume_id,
            'text_preview': text[:500] + '...' if len(text) > 500 else text,
            'questions': questions,
            'word_count': len(text.split())
        })
        
    except Exception as e:
        print(f"Upload resume error: {e}")
        return jsonify({'error': 'Failed to process resume'}), 500

@app.route('/api/interview/start', methods=['POST'])
@token_required
def start_interview(user_id):
    try:
        data = request.get_json()
        resume_id = data.get('resumeId') or data.get('resume_id')
        
        if not resume_id:
            return jsonify({'error': 'Resume ID is required'}), 400
        
        if resume_id not in resumes:
            return jsonify({'error': 'Resume not found'}), 404
        
        resume = resumes[resume_id]
        
        if resume['user_id'] != user_id:
            return jsonify({'error': 'Unauthorized access to resume'}), 403
        
        # Create interview session
        interview_id = str(uuid.uuid4())
        interviews[interview_id] = {
            'id': interview_id,
            'user_id': user_id,
            'resume_id': resume_id,
            'questions': resume['questions'],
            'responses': [],
            'current_question': 0,
            'status': 'active',
            'started_at': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'message': 'Interview started successfully',
            'interview_id': interview_id,
            'questions': resume['questions'],
            'current_question': 0
        })
        
    except Exception as e:
        print(f"Start interview error: {e}")
        return jsonify({'error': 'Failed to start interview'}), 500

@app.route('/api/interview/response', methods=['POST'])
@token_required
def submit_response(user_id):
    try:
        data = request.get_json()
        interview_id = data.get('interviewId') or data.get('interview_id')
        question_index = data.get('questionIndex', 0)
        response_text = data.get('response', '')
        
        if not interview_id:
            return jsonify({'error': 'Interview ID is required'}), 400
        
        if interview_id not in interviews:
            return jsonify({'error': 'Interview not found'}), 404
        
        interview = interviews[interview_id]
        
        if interview['user_id'] != user_id:
            return jsonify({'error': 'Unauthorized access to interview'}), 403
        
        # Correct grammar if model is available
        corrected_response = correct_grammar(response_text)
        
        # Store response
        response_data = {
            'question_index': question_index,
            'question': interview['questions'][question_index] if question_index < len(interview['questions']) else '',
            'original_response': response_text,
            'corrected_response': corrected_response,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        interview['responses'].append(response_data)
        interview['current_question'] = question_index + 1
        
        return jsonify({
            'success': True,
            'message': 'Response recorded successfully',
            'corrected_response': corrected_response,
            'next_question_index': question_index + 1,
            'has_more_questions': question_index + 1 < len(interview['questions'])
        })
        
    except Exception as e:
        print(f"Submit response error: {e}")
        return jsonify({'error': 'Failed to submit response'}), 500

@app.route('/api/interview/complete', methods=['POST'])
@token_required
def complete_interview(user_id):
    try:
        data = request.get_json()
        interview_id = data.get('interviewId') or data.get('interview_id')
        
        if not interview_id:
            return jsonify({'error': 'Interview ID is required'}), 400
        
        if interview_id not in interviews:
            return jsonify({'error': 'Interview not found'}), 404
        
        interview = interviews[interview_id]
        
        if interview['user_id'] != user_id:
            return jsonify({'error': 'Unauthorized access to interview'}), 403
        
        # Update interview status
        interview['status'] = 'completed'
        interview['completed_at'] = datetime.utcnow().isoformat()
        
        # Generate basic feedback
        total_questions = len(interview['questions'])
        answered_questions = len(interview['responses'])
        
        feedback = {
            'completion_rate': f"{answered_questions}/{total_questions}",
            'total_questions': total_questions,
            'answered_questions': answered_questions,
            'responses': interview['responses']
        }
        
        return jsonify({
            'success': True,
            'message': 'Interview completed successfully',
            'feedback': feedback
        })
        
    except Exception as e:
        print(f"Complete interview error: {e}")
        return jsonify({'error': 'Failed to complete interview'}), 500

# ========== Health Check ==========
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'message': 'Server is running',
        'model_loaded': tokenizer is not None and model is not None,
        'timestamp': datetime.utcnow().isoformat()
    })

# ========== Static File Serving ==========
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# ========== Error Handlers ==========
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large'}), 413

if __name__ == '__main__':
    print("🚀 Starting AceMe Interview Service...")
    print("📊 Available endpoints:")
    print("  - GET  /api/health")
    print("  - POST /api/auth/register")
    print("  - POST /api/auth/login")
    print("  - POST /api/upload-resume")
    print("  - POST /api/interview/start")
    print("  - POST /api/interview/response")
    print("  - POST /api/interview/complete")
    print()
    print("🔗 Frontend will be served at: http://localhost:5000")
    print("🔗 API base URL: http://localhost:5000/api")
    
    app.run(debug=True, host='0.0.0.0', port=5000)