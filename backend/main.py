import os
import json
import tempfile
import shutil
from sqlalchemy import ARRAY 
from contextlib import contextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Generator
from datetime import datetime
import uuid
# Database Imports
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from sqlalchemy.exc import ArgumentError
from supabase import Client
import google.generativeai as genai

# Import utility files
from db_client import get_supabase_client
from auths_utils import ensure_user_exists as ensure_user_supabase
from resume_parser import extract_text_from_file
from gemini_client import get_ats_report 
from hr_interview_service import HRInterviewService


app = FastAPI()

load_dotenv()

# --- 1. ENVIRONMENT & LLM CLIENT SETUP ---

DATABASE_URL = os.getenv("DATABASE_URL", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "REACT_APP_CLERK_PUBLISHABLE_KEY")



if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    try:
        gemini_client = genai.GenerativeModel('gemini-2.5-flash')
        print("DEBUG: Gemini 2.5  model loaded successfully")
    except Exception as e:
        try:
            gemini_client = genai.GenerativeModel('gemini-1.0-pro')
            print("DEBUG: Gemini 1.0 Pro model loaded successfully")
        except Exception as e2:
            print(f"DEBUG: Both Gemini models failed: {e2}")
            gemini_client = None
else:
    gemini_client = None
    print("WARNING: GEMINI_API_KEY not set. AI features will use mock data.")


# --- 2. DATABASE CONFIGURATION ---

if not DATABASE_URL:
    raise ArgumentError("DATABASE_URL environment variable is missing or empty. Please set it in backend/.env.")

try:
    engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"}) 
except ArgumentError as e:
    raise ArgumentError(f"Could not parse SQLAlchemy URL. Check the format: {e}")

Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Initialize HR service
hr_service = HRInterviewService()

# --- 3. DATABASE MODELS ---

class User(Base):
    __tablename__ = "users"
    user_id = Column(Text, primary_key=True)
    email = Column(Text, unique=True, nullable=False)
    first_name = Column(Text, nullable=True)
    last_name = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    resumes = relationship("Resume", back_populates="user")
    sessions = relationship("InterviewSession", back_populates="user")

class Resume(Base):
    __tablename__ = "resumes"
    resume_id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Text, ForeignKey("users.user_id"), nullable=False)
    upload_date = Column(DateTime, default=datetime.now)
    job_role = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=False)
    job_description = Column(Text, nullable=True)
    structured_data = Column(JSON, nullable=True)
    initial_questions = Column(JSON, nullable=True)
    ats_report = Column(JSON, nullable=True)
    embedding = Column(JSON, nullable=True)

    user = relationship("User", back_populates="resumes")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    session_id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Text, ForeignKey("users.user_id"), nullable=False)
    start_time = Column(DateTime, default=datetime.now)
    end_time = Column(DateTime, nullable=True)
    difficulty = Column(String, nullable=True)
    topics_covered = Column(ARRAY(Text), nullable=True)  
    final_score = Column(Integer, nullable=True)
    final_report = Column(Text, nullable=True)
    status = Column(String, default="active")

    user = relationship("User", back_populates="sessions")
    messages = relationship("InterviewMessage", back_populates="session")

class InterviewMessage(Base):
    __tablename__ = "interview_messages"
    message_id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(Text, ForeignKey("interview_sessions.session_id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.now)
    confidence_score = Column(Integer, nullable=True)
    facial_emotion = Column(String, nullable=True)
    proctoring_flag = Column(String, nullable=True)
    embedding = Column(JSON, nullable=True)  

    session = relationship("InterviewSession", back_populates="messages")


class HRInterviewCreate(BaseModel):
    user_id: str
    resume_id: str
    job_description: Optional[str] = ""

class HRQuestionRequest(BaseModel):
    session_id: str
    resume_id: str
    previous_questions: List[str] = []

class HRAnswerSubmit(BaseModel):
    session_id: str
    question: str
    answer: str
    message_id: str  # ID of the question message

# Create tables
Base.metadata.create_all(bind=engine)

# Make sure this matches your frontend URL for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency injection for the Supabase client
def get_db_client():
    """FastAPI Dependency to get the Supabase client."""
    return get_supabase_client()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def db_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 5. UTILITY FUNCTIONS ---

def generate_ai_analysis(raw_text: str, job_description: str) -> dict:
    """Calls AI to parse resume and generate questions using Gemini"""
    if not GEMINI_API_KEY or not gemini_client:
        print("DEBUG: Using mock analysis (no Gemini API key)")
        return {
            "structured_data": {
                "skills": ["JavaScript", "Python", "React", "Node.js"],
                "experience": "2+ years in web development", 
                "education": "Bachelor's in Computer Science"
            },
            "initial_questions": [
                "Explain your experience with React and state management.",
                "Describe a challenging project you worked on.",
                "How do you handle API integration in your applications?",
                "What testing strategies do you use in your projects?",
                "Explain your approach to database design and optimization."
            ]
        }
    
    text_limit = 3000
    if len(raw_text) > text_limit:
        raw_text = raw_text[:text_limit] + "..."

    try:
        prompt = f"""
        You are an expert HR and Technical Analyst. Your task is to process a raw resume text and a job description.
        
        First, extract the candidate's core skills, experience, and education into a structured JSON format.
        Second, generate 5 highly personalized and challenging technical interview questions based on the extracted skills and the job description.
        
        RESUME TEXT:
        {raw_text}
        
        JOB DESCRIPTION:
        {job_description or 'No job description provided'}
        
        Return ONLY a single JSON object with this exact structure:
        {{
            "structured_data": {{
                "skills": ["skill1", "skill2", "skill3"],
                "experience": "summary of experience",
                "education": "summary of education"
            }},
            "initial_questions": [
                "question 1",
                "question 2", 
                "question 3",
                "question 4",
                "question 5"
            ]
        }}
        
        Generate the analysis and questions now:
        """
        
        response = gemini_client.generate_content(prompt)
        ai_response = response.text
        
        # Clean the response
        cleaned_response = ai_response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
        cleaned_response = cleaned_response.strip()
        
        print(f"DEBUG: AI Analysis Response: {cleaned_response}")
        return json.loads(cleaned_response)
        
    except Exception as e:
        print(f"Gemini API call failed for resume analysis: {e}")
        # fallback
        return {
            "structured_data": {
                "skills": ["General Technical Skills"],
                "experience": "Could not extract experience.", 
                "education": "Could not extract education."
            },
            "initial_questions": [
                "Tell us about your most relevant professional experience.",
                "Describe a project that showcases your technical skills.",
                "How do you approach learning new technologies?",
                "Explain your experience with version control systems.",
                "What are your career goals?"
            ]
        }   
# Add this function in the UTILITY FUNCTIONS section:
def ensure_user_exists(db: Session, user_id: str, email: str):
    """Ensure user exists in database, create if not exists"""
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            user = User(
                user_id=user_id,
                email=email,
                first_name=None,
                last_name=None
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise e
       
# --- 6. API ENDPOINTS ---

class ResumeUploadData(BaseModel):
    
    userId: str 
    jobDescription: Optional[str] = ""

@app.get("/")
def read_root():
    return {"message": "AI Interview System Backend Running"}

@app.post("/upload-resume/")
async def upload_resume(
    file: UploadFile = File(...),
    clerk_user_id: str = Form(..., alias="userId"), 
    job_role: Optional[str] = Form(None, alias="jobDescription"),
    db_client: Client = Depends(get_db_client),
    db: Session = Depends(get_db)
):
    """
    Handles resume file upload, ensures user existence, extracts raw text, 
    and stores the data in the 'resumes' table.
    """
    temp_file_path = None
    
    # 1. File Type Validation
    allowed_extensions = {'.pdf', '.docx'}
    _, file_extension = os.path.splitext(file.filename)
    if file_extension.lower() not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {file_extension}. Please upload a PDF or DOCX."
        )

    try:
        user_email_placeholder = f"user_{clerk_user_id}@temp.com"
        user = ensure_user_exists(db, clerk_user_id, user_email_placeholder)
        user_db_id = user.user_id
        
        # user_email_placeholder = f"user_{clerk_user_id}@temp.com" 
        
        # user = await ensure_user_exists(db_client, clerk_user_id, user_email_placeholder)
        # user_db_id = user['user_id'] # Matches the Clerk ID
        
        # 3. Save the file temporarily
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name
        
        # 4. Extract raw text
        extracted_text = extract_text_from_file(temp_file_path, file.filename)
        if extracted_text.startswith("Error:") or not extracted_text:
            raise Exception(f"Text extraction failed: {extracted_text}")

        # --- 5. PERFORM ATS ANALYSIS (NEW) ---
        # The AI needs the raw resume text AND the job description to run.
        if not job_role:
             ats_report_result = {"match_score": None, "missing_keywords": [], "suggestions": ["No job description was provided. ATS Scan skipped."]}
        else:
             ats_report_result = get_ats_report(extracted_text, job_role)

        # --- 6. Store metadata, raw text, and ATS Report in the 'resumes' table (MODIFIED) ---
        resume_data = {
            'user_id': user_db_id,
            'job_role': job_role, 
            'raw_text': extracted_text,
            'ats_report': ats_report_result, 
        }

        # Insert the data and retrieve the new resume_id
        store_result = db_client.table('resumes').insert(resume_data).execute()
        resume_id = store_result.data[0]['resume_id']

        return {
            "status": "success",
            "resume_id": resume_id,
            "user_id": user_db_id,
            "message": "Resume uploaded, parsed, and AI analysis completed successfully."
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"An error occurred during resume upload: {e}")
        # Return a 500 status on internal error
        raise HTTPException(status_code=500, detail=f"Internal server error: Failed to process resume or save to DB. Detail: {e}")
    
    finally:
        # 6. Clean up the temporary file (ALWAYS runs)
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.get("/ats-report/{user_id}")
def get_latest_ats_report(user_id: str, db_client: Client = Depends(get_db_client)):
    """
    Retrieves the most recently uploaded resume entry (which contains the ATS report)
    for the specified user.
    """
    try:
        result = db_client.table('resumes')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('upload_date', desc=True)\
            .limit(1)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="No resume or ATS report found for this user.")

        # The ats_report field 
        latest_resume = result.data[0]
        
        # return the data needed for the report page (Report + context)
        return {
            "resume_id": latest_resume.get('resume_id'),
            "job_role": latest_resume.get('job_role'),
            "ats_report": latest_resume.get('ats_report'),
            "upload_date": latest_resume.get('upload_date')
        }

    except Exception as e:
        print(f"Error fetching ATS report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch report from database. Detail: {e}")


# Pydantic models for request/response
class InterviewSessionCreate(BaseModel):
    user_id: str
    difficulty: str = "medium"
    duration: int = 30
    topics: List[str] = []

class InterviewQuestionRequest(BaseModel):
    session_id: str
    resume_id: str
    previous_questions: List[str] = []
    current_topic: str = ""

class UserAnswer(BaseModel):
    session_id: str
    question: str
    answer: str
    confidence_score: Optional[int] = None
    facial_emotion: Optional[str] = None

# Interview Session Endpoints
@app.post("/create-interview-session/")
async def create_interview_session(session_data: InterviewSessionCreate, db: Session = Depends(get_db)):
    """Create a new interview session"""
    try:
        print(f"DEBUG: Creating session for user: {session_data.user_id}")
        print(f"DEBUG: Topics received: {session_data.topics}")
        
        # Ensure user exists
        user_email = f"user_{session_data.user_id}@clerk.dev"
        ensure_user_exists(db, user_id=session_data.user_id, email=user_email)
        
        # Get user's latest resume with proper error handling
        latest_resume = db.query(Resume).filter(
            Resume.user_id == session_data.user_id
        ).order_by(Resume.upload_date.desc()).first()
        
        print(f"DEBUG: Latest resume found: {latest_resume.resume_id if latest_resume else 'None'}")
        
        if not latest_resume:
            raise HTTPException(
                status_code=400, 
                detail="No resume found for user. Please upload a resume first."
            )
        
        topics_array = session_data.topics
        if isinstance(topics_array, str):
            try:
                topics_array = json.loads(topics_array)
            except:
                topics_array = [topics_array]
        elif not isinstance(topics_array, list):
            topics_array = []
        
        print(f"DEBUG: Topics to be saved: {topics_array}")
        
        # Create new session
        new_session = InterviewSession(
            user_id=session_data.user_id,
            difficulty=session_data.difficulty,
            topics_covered=topics_array, 
            status="active"
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        print(f"DEBUG: Session created with ID: {new_session.session_id}")
        return {
            "status": "success",
            "session_id": new_session.session_id,
            "resume_id": latest_resume.resume_id,
            "message": "Interview session created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Session creation failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@app.post("/generate-question/")
async def generate_question(question_request: InterviewQuestionRequest, db: Session = Depends(get_db)):
    """Generate the next interview question using Gemini AI"""
    try:
        print(f"DEBUG: Starting question generation for session {question_request.session_id}")
        
        # 1. Get resume and session data
        resume = db.query(Resume).filter(Resume.resume_id == question_request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        session = db.query(InterviewSession).filter(InterviewSession.session_id == question_request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        question_data = None
        ai_source = "none"
        
        if GEMINI_API_KEY and gemini_client:
            try:
                print("DEBUG: Attempting to use Gemini API...")
                
                prompt = f"""Generate a technical interview question based on this resume and job description.
                
RESUME EXCERPT:
{resume.raw_text[:2000]}

JOB DESCRIPTION:
{resume.job_description or 'Technical role'}

INTERVIEW CONTEXT:
- Difficulty Level: {session.difficulty}
- Previous Questions: {question_request.previous_questions[-3:] if question_request.previous_questions else 'None'}
- Focus Topics: {session.topics_covered or []}

Return ONLY valid JSON with this exact structure:
{{
    "question": "the generated question text",
    "category": "relevant technology category",
    "difficulty": "easy/medium/hard",
    "expected_answer_points": ["key point 1", "key point 2", "key point 3"]
}}

Generate one unique, personalized technical question:"""
                
                response = gemini_client.generate_content(prompt)
                ai_response = response.text
                
                # Clean the response
                cleaned_response = ai_response.strip()
                if cleaned_response.startswith("```json"):
                    cleaned_response = cleaned_response[7:]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]
                cleaned_response = cleaned_response.strip()
                
                print(f"DEBUG: Gemini raw response: {ai_response}")
                print(f"DEBUG: Gemini cleaned response: {cleaned_response}")
                
                question_data = json.loads(cleaned_response)
                ai_source = "gemini"
                print("DEBUG: Successfully used Gemini API for question generation")
                
            except Exception as gemini_error:
                print(f"DEBUG: Gemini API failed: {gemini_error}")
        
        # 3. Enhanced fallback if LLM model fails
        if not question_data:
            print("DEBUG: Using enhanced fallback questions")
            
            # Extract some context from resume for better fallbacks
            resume_lower = resume.raw_text.lower()
            job_desc_lower = (resume.job_description or "").lower()
            
            # Determine primary technology from resume/job description
            primary_tech = "technical"
            for tech in ["python", "javascript", "java", "sql", "react", "node", "aws", "docker"]:
                if tech in resume_lower or tech in job_desc_lower:
                    primary_tech = tech
                    break
            
            fallback_questions = [
                {
                    "question": f"Based on your experience with {primary_tech}, describe a challenging project you worked on and how you overcame technical obstacles.",
                    "category": "Project Experience",
                    "difficulty": session.difficulty,
                    "expected_answer_points": ["Project scope", "Technical challenges", "Your solution", "Results achieved"]
                },
                {
                    "question": "How do you approach debugging complex issues in your code? Walk me through your methodology.",
                    "category": "Problem Solving", 
                    "difficulty": session.difficulty,
                    "expected_answer_points": ["Debugging methodology", "Tools used", "Systematic approach", "Prevention strategies"]
                },
                {
                    "question": "Explain your experience with version control systems and collaborative development workflows.",
                    "category": "Development Practices",
                    "difficulty": session.difficulty,
                    "expected_answer_points": ["Version control usage", "Collaboration experience", "Best practices", "Code review process"]
                },
                {
                    "question": "Describe a situation where you had to learn a new technology quickly to meet project requirements.",
                    "category": "Learning Ability",
                    "difficulty": session.difficulty,
                    "expected_answer_points": ["Learning methodology", "Practical application", "Challenges faced", "Outcome achieved"]
                },
                {
                    "question": "How do you ensure code quality and maintainability in your projects?",
                    "category": "Software Engineering",
                    "difficulty": session.difficulty,
                    "expected_answer_points": ["Testing strategies", "Code standards", "Documentation", "Refactoring approach"]
                }
            ]
            
            # Use question history to avoid repeats
            previous_question_texts = [q.lower() for q in question_request.previous_questions] if question_request.previous_questions else []
            available_questions = [q for q in fallback_questions 
                                 if not any(pq in q["question"].lower() for pq in previous_question_texts[-3:])]
            
            if not available_questions:
                available_questions = fallback_questions
            
            question_index = (len(question_request.previous_questions) if question_request.previous_questions else 0) % len(available_questions)
            question_data = available_questions[question_index]
            ai_source = "fallback"
            print(f"DEBUG: Using enhanced fallback question #{question_index + 1}")

        # 4. Save the question to database
        ai_message = InterviewMessage(
            session_id=question_request.session_id,
            role="ai",
            content=question_data["question"],
            timestamp=datetime.now()
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)
        
        return {
            "status": "success",
            "question": question_data,
            "message_id": ai_message.message_id,
            "ai_source": ai_source,
            "debug": f"AI Source: {ai_source}"
        }
        
    except Exception as e:
        print(f"DEBUG: Question generation failed with error: {str(e)}")
        # Basic fallback in case of complete failure
        basic_question = {
            "question": "Tell me about your most relevant technical experience from your resume.",
            "category": "Technical Experience",
            "difficulty": "medium",
            "expected_answer_points": ["Technical skills", "Project experience", "Problem-solving approach"]
        }
        return {
            "status": "success",
            "question": basic_question,
            "message_id": "fallback-" + str(uuid.uuid4()),
            "ai_source": "error_fallback",
            "debug": f"Error: {str(e)}"
        }
@app.post("/submit-answer/")
async def submit_answer(answer_data: UserAnswer, db: Session = Depends(get_db)):
    """Submit user's answer and get evaluation"""
    try:
        print(f"DEBUG: Submitting answer for session {answer_data.session_id}")
        
        # Save user's answer
        user_message = InterviewMessage(
            session_id=answer_data.session_id,
            role="user",
            content=answer_data.answer,
            timestamp=datetime.now(),
            confidence_score=answer_data.confidence_score,
            facial_emotion=answer_data.facial_emotion  # Fixed field name
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        print(f"DEBUG: Answer saved successfully with ID: {user_message.message_id}")
        
        return {
            "status": "success",
            "message": "Answer submitted successfully",
            "message_id": user_message.message_id
        }
        
    except Exception as e:
        print(f"DEBUG: Submit answer failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit answer: {str(e)}")

@app.get("/interview-session/{session_id}")
async def get_session_details(session_id: str, db: Session = Depends(get_db)):
    """Get interview session details and messages"""
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(InterviewMessage).filter(
        InterviewMessage.session_id == session_id
    ).order_by(InterviewMessage.timestamp).all()
    
    return {
        "session": {
            "session_id": session.session_id,
            "difficulty": session.difficulty,
            "start_time": session.start_time,
            "status": session.status
        },
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp
            }
            for msg in messages
        ]
    }
@app.get("/hr-interview-session/{session_id}")
async def get_hr_interview_session(session_id: str, db: Session = Depends(get_db)):
    """Get HR interview session details"""
    try:        
        session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="HR interview session not found")
        
        messages = db.query(InterviewMessage).filter(
            InterviewMessage.session_id == session_id
        ).order_by(InterviewMessage.timestamp).all()
        
        return {
            "session": {
                "session_id": session.session_id,
                "session_type": "hr_interview",
                "start_time": session.start_time,
                "status": session.status,
                "difficulty": session.difficulty
            },
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp,
                    "message_id": msg.message_id
                }
                for msg in messages
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get HR interview session: {str(e)}")


  
@app.get("/debug-resumes/{user_id}")
async def debug_resumes(user_id: str, db: Session = Depends(get_db)):
    """Debug endpoint to check user's resumes"""
    resumes = db.query(Resume).filter(Resume.user_id == user_id).all()
    return {
        "user_id": user_id,
        "resume_count": len(resumes),
        "resumes": [
            {
                "resume_id": r.resume_id,
                "upload_date": r.upload_date,
                "job_role": r.job_role
            } for r in resumes
        ]
    }

@app.get("/debug-sessions/{user_id}")
async def debug_sessions(user_id: str, db: Session = Depends(get_db)):
    """Debug endpoint to check user's sessions"""
    sessions = db.query(InterviewSession).filter(InterviewSession.user_id == user_id).all()
    return {
        "user_id": user_id,
        "session_count": len(sessions),
        "sessions": [
            {
                "session_id": s.session_id,
                "start_time": s.start_time,
                "difficulty": s.difficulty,
                "status": s.status
            } for s in sessions
        ]
    }

@app.get("/test-gemini")
async def test_gemini():
    """Test if Gemini API is working"""
    if not GEMINI_API_KEY:
        return {"status": "error", "message": "GEMINI_API_KEY not set"}
    
    try:
        test_prompt = "Generate a simple technical interview question about Python and return it as JSON: {\"question\": \"the question\", \"category\": \"Python\", \"difficulty\": \"medium\", \"expected_answer_points\": [\"point1\", \"point2\"]}"
        response = gemini_client.generate_content(test_prompt)
        return {
            "status": "success", 
            "message": "Gemini API is working",
            "response": response.text
        }
    except Exception as e:
        return {"status": "error", "message": f"Gemini test failed: {str(e)}"}

@app.get("/user-stats/{user_id}")
async def get_user_stats(
    user_id: str,
    db_client: Client = Depends(get_db_client)
):
    
    try:
        sessions_result = db_client.table('interview_sessions')\
            .select('session_id, start_time, end_time, final_score, status')\
            .eq('user_id', user_id)\
            .eq('status', 'completed')\
            .execute()
        
        sessions = sessions_result.data
        
        # Calculate statistics
        total_interviews = len(sessions)
        
        # Calculate average score (only from sessions with final_score)
        scores = [s['final_score'] for s in sessions if s.get('final_score') is not None]
        average_score = round(sum(scores) / len(scores)) if scores else None
        
        # Calculate total hours practiced
        total_minutes = 0
        for session in sessions:
            if session.get('start_time') and session.get('end_time'):
                from datetime import datetime
                start = datetime.fromisoformat(session['start_time'].replace('Z', '+00:00'))
                end = datetime.fromisoformat(session['end_time'].replace('Z', '+00:00'))
                duration = (end - start).total_seconds() / 60  # minutes
                total_minutes += duration
        
        total_hours = round(total_minutes / 60, 1)
        
        return {
            "status": "success",
            "stats": {
                "interviews_completed": total_interviews,
                "average_score": average_score,
                "hours_practiced": total_hours
            }
        }
    
    except Exception as e:
        print(f"Error fetching user stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch user statistics: {str(e)}"
        )

@app.get("/interview-history/{user_id}")
async def get_interview_history(
    user_id: str,
    db_client: Client = Depends(get_db_client)
):
    """
    Get user's interview history with details:
    - Date, score, difficulty level, topics covered
    """
    try:
        # Get all completed interview sessions for this user
        sessions_result = db_client.table('interview_sessions')\
            .select('session_id, start_time, difficulty, topics_covered, final_score')\
            .eq('user_id', user_id)\
            .eq('status', 'completed')\
            .order('start_time', desc=True)\
            .limit(10)\
            .execute()
        
        sessions = sessions_result.data
        
        # Format the data for frontend
        history = []
        for session in sessions:
            # Format date
            from datetime import datetime
            if session.get('start_time'):
                date_obj = datetime.fromisoformat(session['start_time'].replace('Z', '+00:00'))
                formatted_date = date_obj.strftime('%Y-%m-%d')
            else:
                formatted_date = "N/A"
            
            # Format topics (it's stored as an array)
            topics = session.get('topics_covered', [])
            topics_str = ', '.join(topics) if topics else "General"
            
            history.append({
                "date": formatted_date,
                "score": session.get('final_score'),
                "level": session.get('difficulty', 'Medium').capitalize(),
                "topics": topics_str
            })
        
        return {
            "status": "success",
            "history": history
        }
    
    except Exception as e:
        print(f"Error fetching interview history: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch interview history: {str(e)}"
        )

@app.get("/generate-report/{session_id}")
async def generate_interview_report(
    session_id: str,
    db_client: Client = Depends(get_db_client)
):
    """
    Generate a comprehensive interview report using AI.
    Analyzes the questions asked and answers given during the interview.
    """
    try:
        import google.generativeai as genai
        from datetime import datetime
        
        # Configure Gemini
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # 1. Get session details
        session_result = db_client.table('interview_sessions')\
            .select('user_id, difficulty, topics_covered, start_time, end_time')\
            .eq('session_id', session_id)\
            .execute()
        
        if not session_result.data or len(session_result.data) == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_result.data[0]
        
        # Update end_time if not set
        if not session.get('end_time'):
            db_client.table('interview_sessions')\
                .update({'end_time': datetime.utcnow().isoformat()})\
                .eq('session_id', session_id)\
                .execute()
            session['end_time'] = datetime.utcnow().isoformat()
        
        # 2. Get all messages (questions and answers) from this session
        messages_result = db_client.table('interview_messages')\
            .select('role, content, timestamp')\
            .eq('session_id', session_id)\
            .order('timestamp')\
            .execute()
        
        messages = messages_result.data
        
        if not messages or len(messages) == 0:
            raise HTTPException(status_code=404, detail="No interview data found")
        
        # 3. Build conversation context for AI
        conversation_text = ""
        qa_pairs = []
        
        for i in range(0, len(messages) - 1, 2):
            if i + 1 < len(messages):
                question_msg = messages[i] if messages[i]['role'] == 'assistant' else messages[i+1]
                answer_msg = messages[i+1] if messages[i+1]['role'] == 'user' else messages[i]
                
                qa_pairs.append({
                    "question": question_msg['content'],
                    "answer": answer_msg['content']
                })
                
                conversation_text += f"\n\nQ: {question_msg['content']}\nA: {answer_msg['content']}"
        
        # 4. Use question count as duration estimate (skip timestamp calculation)
        duration_estimate = len(qa_pairs) * 3  
        
        # 5. Create prompt for AI to generate report
        prompt = f"""
You are an expert technical interviewer and career coach. Analyze this interview session and provide a comprehensive performance report.

**Interview Details:**
- Difficulty Level: {session.get('difficulty', 'Medium')}
- Topics Covered: {', '.join(session.get('topics_covered', [])) if session.get('topics_covered') else 'General'}
- Questions Answered: {len(qa_pairs)}

**Interview Transcript:**
{conversation_text}

**Task:**
Analyze the candidate's responses and provide a detailed performance report in JSON format with the following structure:

{{
    "overall_score": <integer 0-100>,
    "category_scores": [
        {{"category": "Technical Knowledge", "score": <0-100>}},
        {{"category": "Problem Solving", "score": <0-100>}},
        {{"category": "Communication", "score": <0-100>}},
        {{"category": "Code Quality", "score": <0-100>}}
    ],
    "strengths": [
        "<specific strength observed>",
        "<specific strength observed>",
        "<specific strength observed>"
    ],
    "improvements": [
        "<specific area to improve>",
        "<specific area to improve>",
        "<specific area to improve>"
    ],
    "summary": "<2-3 sentence overall assessment>"
}}

**Evaluation Criteria:**
1. **Technical Knowledge**: Accuracy and depth of technical concepts
2. **Problem Solving**: Logical thinking and approach to problems
3. **Communication**: Clarity, structure, and articulation of ideas
4. **Code Quality**: If applicable, code structure and best practices

Be specific, constructive, and encouraging. Base your assessment on actual responses given.
Return ONLY the JSON, no markdown formatting.
"""

        # 6. Call Gemini AI
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        # Parse AI response
        report_data = json.loads(response_text)
        
        # 7. Save the report to the session
        update_result = db_client.table('interview_sessions')\
            .update({
                'final_report': report_data,
                'final_score': report_data.get('overall_score', 0),
                'status': 'completed'
            })\
            .eq('session_id', session_id)\
            .execute()
        
        # 8. Return the complete report with session details
        return {
            "status": "success",
            "report": {
                "overall_score": report_data.get('overall_score', 0),
                "difficulty": session.get('difficulty', 'Medium'),
                "topics": session.get('topics_covered', []),
                "duration": f"~{duration_estimate} minutes",
                "questions_answered": len(qa_pairs),
                "total_questions": len(qa_pairs),
                "category_scores": report_data.get('category_scores', []),
                "strengths": report_data.get('strengths', []),
                "improvements": report_data.get('improvements', []),
                "summary": report_data.get('summary', '')
            }
        }
    
    except json.JSONDecodeError as e:
        print(f"Error parsing AI response: {e}")
        print(f"Raw response: {response_text}")
        raise HTTPException(
            status_code=500,
            detail="Failed to parse AI response. Please try again."
        )
    except Exception as e:
        print(f"Error generating report: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report: {str(e)}"
        )
    


@app.post("/create-hr-interview/")
async def create_hr_interview(interview_data: HRInterviewCreate, db: Session = Depends(get_db)):
    """Create a new HR interview session"""
    try:
        result = hr_service.create_hr_interview_session(
            db=db,
            user_id=interview_data.user_id,
            resume_id=interview_data.resume_id,
            job_description=interview_data.job_description
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create HR interview: {str(e)}")

@app.post("/generate-hr-question/")
async def generate_hr_question(question_request: HRQuestionRequest, db: Session = Depends(get_db)):
    """Generate next HR question"""
    try:
        result = hr_service.generate_next_hr_question(
            db=db,
            session_id=question_request.session_id,
            resume_id=question_request.resume_id,
            previous_questions=question_request.previous_questions
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate HR question: {str(e)}")

@app.post("/submit-hr-answer/")
async def submit_hr_answer(answer_data: HRAnswerSubmit, db: Session = Depends(get_db)):
    """Submit and evaluate HR answer"""
    try:
        result = hr_service.evaluate_hr_answer(
            db=db,
            session_id=answer_data.session_id,
            question=answer_data.question,
            answer=answer_data.answer,
            message_id=answer_data.message_id
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate HR answer: {str(e)}")

@app.post("/complete-hr-interview/{session_id}")
async def complete_hr_interview(session_id: str, db: Session = Depends(get_db)):
    """Complete HR interview and generate report"""
    try:
        result = hr_service.generate_hr_interview_report(db=db, session_id=session_id)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete HR interview: {str(e)}")


# ===== API STATUS CHECK ENDPOINT (FOR DEMO PREP) =====
@app.get("/api-status-check")
async def api_status_check():
    """Check if Gemini API is working properly - USE THIS BEFORE YOUR DEMO!"""
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY", "")
        
        if not api_key:
            return {
                "status": "❌ FAILED",
                "api_key_found": False,
                "error": "GEMINI_API_KEY not found in environment",
                "action_required": "Add GEMINI_API_KEY to your .env file",
                "demo_ready": False
            }
        
        # Test API call
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        test_response = model.generate_content("Say 'API Working' if you can read this.")
        
        if test_response and test_response.text:
            return {
                "status": "✅ SUCCESS",
                "api_key_found": True,
                "api_working": True,
                "model": "gemini-2.0-flash-exp",
                "test_response": test_response.text[:100],
                "message": "🎉 Your API is working! Demo ready!",
                "demo_ready": True
            }
        else:
            return {
                "status": "⚠️ WARNING",
                "api_key_found": True,
                "api_working": False,
                "error": "API responded but returned empty response",
                "demo_ready": False
            }
            
    except Exception as e:
        error_msg = str(e)
        
        # Check for quota exceeded
        if "429" in error_msg or "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
            return {
                "status": "❌ QUOTA EXCEEDED",
                "api_key_found": True,
                "api_working": False,
                "error": "API quota exceeded - you're hitting rate limits",
                "error_details": error_msg,
                "action_required": "Get a new API key from https://aistudio.google.com/app/apikey OR wait for quota reset",
                "demo_ready": False
            }
        
        # Check for invalid API key
        elif "API_KEY_INVALID" in error_msg or "invalid" in error_msg.lower():
            return {
                "status": "❌ INVALID API KEY",
                "api_key_found": True,
                "api_working": False,
                "error": "API key is invalid or expired",
                "error_details": error_msg,
                "action_required": "Get a new API key from https://aistudio.google.com/app/apikey",
                "demo_ready": False
            }
        
        # Other errors
        else:
            return {
                "status": "❌ ERROR",
                "api_key_found": bool(api_key),
                "api_working": False,
                "error": f"API test failed: {type(e).__name__}",
                "error_details": error_msg,
                "action_required": "Check your API key and internet connection",
                "demo_ready": False
            }
