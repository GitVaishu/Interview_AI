import os
import json
from contextlib import contextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Generator

# Database Imports
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from sqlalchemy.exc import ArgumentError

# AI Imports
import google.generativeai as genai
load_dotenv()



# --- 1. ENVIRONMENT & LLM CLIENT SETUP ---

# Load environment variables securely. Uvicorn/FastAPI handles the .env loading.
# The Canvas environment will inject the GEMINI_API_KEY.
# DATABASE_URL is required to be uncommented in your .env file.

# Select the first available non-empty URL
DATABASE_URL = os.getenv("DATABASE_URL", "")

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "YOUR_CLERK_SECRET_KEY")
#CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "REACT_APP_CLERK_PUBLISHABLE_KEY")

# --- GEMINI CLIENT FIX ---
# The client throws an error if api_key="" is explicitly passed, 
# even if key injection is intended. We pass None if the ENV variable is empty.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
gemini_key_safe = GEMINI_API_KEY if GEMINI_API_KEY != "" else None

try:
    # This will either load the key from the environment (Canvas) or use the one we pass (local)
    genai.configure(api_key=gemini_key_safe)
except Exception as e:
    # If the client still fails to initialize, raise an alert but allow the app to run for non-AI routes
    print(f"FATAL AI ERROR: Failed to initialize Gemini client. AI functions will fail. Error: {e}")
    ai_client = None

# --- 2. DATABASE CONFIGURATION ---

# Check if a valid URL was found before trying to create the engine
if not DATABASE_URL:
    raise ArgumentError("DATABASE_URL environment variable is missing or empty. Please set it in backend/.env.")

# SQLAlchemy setup
try:
    engine = create_engine(DATABASE_URL)
except ArgumentError as e:
    raise ArgumentError(f"Could not parse SQLAlchemy URL. Check the format: {e}")

Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- 3. DATABASE MODELS (Matching backend/schema.sql) ---

class User(Base):
    __tablename__ = "users"
    user_id = Column(Text, primary_key=True)
    email = Column(Text, unique=True, nullable=False)
    
    resumes = relationship("Resume", back_populates="user")
    sessions = relationship("InterviewSession", back_populates="user")

class Resume(Base):
    __tablename__ = "resumes"
    resume_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Text, ForeignKey("users.user_id"), nullable=False)
    raw_text = Column(Text, nullable=False)
    job_description = Column(Text, nullable=True)
    structured_data = Column(JSON, nullable=True) # AI-parsed JSON data
    initial_questions = Column(JSON, nullable=True) # AI-generated questions

    user = relationship("User", back_populates="resumes")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Text, ForeignKey("users.user_id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    status = Column(String, default="pending") # pending, active, completed
    final_score = Column(Integer, nullable=True)

    user = relationship("User", back_populates="sessions")
    messages = relationship("InterviewMessage", back_populates="session")

class InterviewMessage(Base):
    __tablename__ = "interview_messages"
    message_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.session_id"), nullable=False)
    role = Column(String, nullable=False) # 'user' or 'ai'
    content = Column(Text, nullable=False) # Question or Answer text/code
    timestamp = Column(DateTime, nullable=False)
    confidence_score = Column(Integer, nullable=True)
    facial_emotion = Column(String, nullable=True)

    session = relationship("InterviewSession", back_populates="messages")

# Create tables in the database (Only needs to run if they don't exist)
Base.metadata.create_all(bind=engine)

# --- 4. FASTAPI APP SETUP ---

app = FastAPI()

# Middleware for CORS (Connects React on 3000 to FastAPI on 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Context manager for database session
@contextmanager
def db_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 5. UTILITY FUNCTIONS ---

def ensure_user_exists(db: Session, user_id: str, email: str):
    """Checks if the user exists in PostgreSQL and creates them if not."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        new_user = User(user_id=user_id, email=email)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    return user

def generate_ai_analysis(raw_text: str, job_description: str) -> dict:
    """Calls Gemini to parse resume and generate questions."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI Service is currently unavailable.")
    
    system_prompt = (
        "You are an expert HR and Technical Analyst. Your task is to process a raw resume text and a job description. "
        "First, extract the candidate's core skills, experience, and education into a structured JSON format. "
        "Second, generate 5 highly personalized and challenging technical interview questions based *only* on the extracted skills and the job description. "
        "The output MUST be a single JSON object with two keys: 'structured_data' and 'initial_questions'."
    )
    
    user_prompt = (
        f"--- RAW RESUME TEXT ---\n{raw_text}\n\n"
        f"--- JOB DESCRIPTION ---\n{job_description}\n\n"
        "Generate the analysis and questions now."
    )

    try:
        model = genai.GenerativeModel("gemini-1.5-pro")
        response = model.generate_content([system_prompt, user_prompt])
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API call failed: {e}")
        raise HTTPException(status_code=503, detail="AI processing failed during analysis.")
# --- 6. API ENDPOINTS ---

class ResumeUploadData(BaseModel):
    # This matches the data the React component sends
    userId: str 
    jobDescription: Optional[str] = ""

@app.get("/")
def read_root():
    return {"message": "AI Interview System Backend Running"}

@app.post("/upload-resume/")
async def upload_resume(
    file: UploadFile = File(...), 
    userId: str = None, 
    jobDescription: str = ""
):
    """
    Handles resume upload, extracts text, calls AI for analysis, 
    and saves results to Supabase (PostgreSQL).
    """
    if not userId:
        raise HTTPException(status_code=400, detail="User ID is required for resume upload.")

    try:
        # --- Authentication and User Setup ---
        # NOTE: In a production app, you would validate the Clerk token here 
        # to get the user ID securely, not trust the userId passed in the form data.
        user_email = f"user_{userId}@clerk.dev" # Mock email for DB setup
        
        with db_session() as db:
            # 1. Ensure user exists in our local PostgreSQL database
            ensure_user_exists(db, user_id=userId, email=user_email)
            
            # --- File Handling and Text Extraction ---
            file_bytes = await file.read()
            # We skip file type checking to avoid the 'libmagic' dependency issue
            
            # Simple text decoding (assumes common formats like PDF/DOCX have been pre-processed to text)
            # NOTE: In a real app, you would use OCR or a library like 'pdfminer.six' here.
            raw_text = file_bytes.decode('utf-8', errors='ignore')

            # --- AI Analysis ---
            ai_results = generate_ai_analysis(raw_text, jobDescription)
            
            # 2. Save the full resume data and AI results
            new_resume = Resume(
                user_id=userId,
                raw_text=raw_text,
                job_description=jobDescription,
                structured_data=ai_results.get('structured_data'),
                initial_questions=ai_results.get('initial_questions')
            )
            db.add(new_resume)
            db.commit()
            db.refresh(new_resume)

            return {
                "status": "success",
                "message": "Resume analyzed and saved.",
                "resume_id": new_resume.resume_id,
                "questions_generated": len(ai_results.get('initial_questions', []))
            }

    except ArgumentError as e:
        raise HTTPException(status_code=500, detail=f"Database configuration error: {e}")
    except Exception as e:
        # Catch any other unexpected errors (e.g., file read failure, commit failure)
        print(f"Resume upload failed with error: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during processing: {e}")
