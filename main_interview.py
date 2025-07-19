import cv2
import os
import threading
import queue
import speech_recognition as sr
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from PyPDF2 import PdfReader
from docx import Document

# ---------------------- Grammar Correction ----------------------
tokenizer = AutoTokenizer.from_pretrained("vennify/t5-base-grammar-correction")
model = AutoModelForSeq2SeqLM.from_pretrained("vennify/t5-base-grammar-correction")

def correct_grammar(text):
    input_text = "correct: " + text
    input_ids = tokenizer.encode(input_text, return_tensors="pt")
    outputs = model.generate(input_ids, max_length=128, num_beams=4, early_stopping=True)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

# ---------------------- Resume Reader ----------------------
def extract_text_from_resume(file_path):
    if file_path.endswith(".pdf"):
        reader = PdfReader(file_path)
        return " ".join(page.extract_text() for page in reader.pages if page.extract_text())
    elif file_path.endswith(".docx"):
        doc = Document(file_path)
        return " ".join(para.text for para in doc.paragraphs)
    else:
        return ""

# ---------------------- Question Generator ----------------------
def generate_questions_from_resume(text):
    # Dummy logic; you can replace it with LLM-based generation
    questions = []
    if "Python" in text:
        questions.append("Can you talk about your experience with Python?")
    if "project" in text.lower():
        questions.append("Describe one of your favorite projects.")
    if "internship" in text.lower():
        questions.append("What did you learn during your internship?")
    if not questions:
        questions.append("Tell me something about yourself.")
    return questions

# ---------------------- Audio Analysis ----------------------
def analyze_audio(audio_queue, stop_event):
    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    with mic as source:
        recognizer.adjust_for_ambient_noise(source)
        print("🎙️  Listening...")
        while not stop_event.is_set():
            try:
                audio = recognizer.listen(source, timeout=3, phrase_time_limit=7)
                audio_queue.put(audio)
            except sr.WaitTimeoutError:
                continue

# ---------------------- Audio Transcriber ----------------------
def transcribe_and_correct(audio_queue, stop_event):
    recognizer = sr.Recognizer()
    while not stop_event.is_set():
        try:
            audio = audio_queue.get(timeout=1)
            text = recognizer.recognize_google(audio)
            corrected = correct_grammar(text)
            print(f"You said: {text}")
            print(f"Corrected: {corrected}\n")
        except queue.Empty:
            continue
        except sr.UnknownValueError:
            print("(Could not understand audio)")

# ---------------------- Webcam + Interview Logic ----------------------
def run_interview(questions):
    cap = cv2.VideoCapture(0)
    question_idx = 0

    audio_queue = queue.Queue()
    stop_event = threading.Event()

    audio_thread = threading.Thread(target=analyze_audio, args=(audio_queue, stop_event))
    transcriber_thread = threading.Thread(target=transcribe_and_correct, args=(audio_queue, stop_event))

    audio_thread.start()
    transcriber_thread.start()

    print("📸 Starting camera. Press 'q' to quit.")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if question_idx < len(questions):
            question_text = questions[question_idx]
            cv2.putText(frame, f"Q: {question_text}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        cv2.imshow('Live Interview', frame)
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('n') and question_idx < len(questions) - 1:
            question_idx += 1
        elif key == ord('q'):
            break

    stop_event.set()
    audio_thread.join()
    transcriber_thread.join()
    cap.release()
    cv2.destroyAllWindows()

# ---------------------- Main ----------------------
if __name__ == "__main__":
    print("📄 Upload your resume (PDF or DOCX)")
    resume_path = input("Enter full path of resume file: ").strip()

    if not os.path.exists(resume_path):
        print("❌ File not found.")
        exit(1)

    resume_text = extract_text_from_resume(resume_path)
    questions = generate_questions_from_resume(resume_text)

    print("✅ Resume parsed. Press 'n' to move to the next question, 'q' to quit.")
    run_interview(questions)
