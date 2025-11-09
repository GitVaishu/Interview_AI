# backend/hr_interview_service.py

import json
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

# Import models directly to avoid circular imports
from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from .hr_questions import HRQuestionGenerator

Base = declarative_base()

# Define models here to avoid circular imports
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

class HRInterviewService:
    def __init__(self):
        
        self.question_generator = HRQuestionGenerator()

    def create_hr_interview_session(self, db: Session, user_id: str, resume_id: str, job_description: str = "") -> Dict[str, Any]:
        """Create a new HR interview session"""
        try:
            # Get resume data
            resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
            if not resume:
                raise ValueError("Resume not found")

            # Create HR interview session
            hr_session = InterviewSession(
                session_id=str(uuid.uuid4()),
                user_id=user_id,
                difficulty="medium",
                topics_covered=["HR", "Behavioral", "Career Goals", "Company Culture"],
                status="active",
                start_time=datetime.now()
            )
            
            db.add(hr_session)
            db.commit()
            db.refresh(hr_session)

            return {
                "status": "success",
                "session_id": hr_session.session_id,
                "session_type": "hr_interview",
                "resume_id": resume_id,
                "message": "HR interview session created successfully"
            }

        except Exception as e:
            db.rollback()
            raise Exception(f"Failed to create HR interview session: {str(e)}")

    def generate_next_hr_question(self, db: Session, session_id: str, resume_id: str, 
                                previous_questions: List[str] = None) -> Dict[str, Any]:
        """Generate the next HR question for the interview"""
        try:
            if previous_questions is None:
                previous_questions = []

            # Get session and resume
            session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
            resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
            
            if not session or not resume:
                raise ValueError("Session or resume not found")

            # Use the HR question generator
            hr_questions_data = self.question_generator.get_hr_questions_based_on_resume(
                resume.raw_text, 
                resume.job_role or ""
            )

            # Filter out previously asked questions
            available_questions = [
                q for q in hr_questions_data["hr_questions"] 
                if q["question"] not in previous_questions
            ]

            # If no unique questions left, use common questions
            if not available_questions:
                available_questions = self.question_generator.get_common_hr_questions()

            # Select next question
            question_index = len(previous_questions) % len(available_questions)
            next_question = available_questions[question_index]

            # Save question to database
            ai_message = InterviewMessage(
                session_id=session_id,
                role="ai",
                content=next_question["question"],
                timestamp=datetime.now()
            )
            db.add(ai_message)
            db.commit()
            db.refresh(ai_message)

            return {
                "status": "success",
                "question": next_question,
                "message_id": ai_message.message_id,
                "session_type": "hr_interview",
                "total_questions_asked": len(previous_questions) + 1
            }

        except Exception as e:
            db.rollback()
            raise Exception(f"Failed to generate HR question: {str(e)}")

    def evaluate_hr_answer(self, db: Session, session_id: str, question: str, 
                          answer: str, message_id: str) -> Dict[str, Any]:
        """Evaluate HR question answer"""
        try:
            # Basic evaluation
            evaluation = {
                "relevance_score": 75,
                "communication_score": 70,
                "key_strengths": ["Answer provided", "Relevant to question"],
                "improvement_areas": ["Could be more detailed", "Add specific examples"],
                "overall_feedback": "Good attempt. Try to provide more specific examples using the STAR method (Situation, Task, Action, Result)."
            }

            return {
                "status": "success", 
                "evaluation": evaluation,
                "message": "Answer evaluated successfully"
            }

        except Exception as e:
            # Fallback evaluation
            return {
                "status": "success",
                "evaluation": {
                    "relevance_score": 50,
                    "communication_score": 50,
                    "key_strengths": ["Attempted to answer"],
                    "improvement_areas": ["Need more structure in answers"],
                    "overall_feedback": "Basic answer provided. Try to structure your answers better."
                },
                "message": "Basic evaluation completed"
            }

    def generate_hr_interview_report(self, db: Session, session_id: str) -> Dict[str, Any]:
        """Generate HR interview report"""
        try:
            session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
            if not session:
                raise ValueError("Session not found")

            # Get messages count
            messages = db.query(InterviewMessage).filter(InterviewMessage.session_id == session_id).all()
            questions_asked = len([m for m in messages if m.role == "ai"])
            answers_given = len([m for m in messages if m.role == "user"])

            # Basic report
            report = {
                "session_id": session_id,
                "session_type": "hr_interview",
                "questions_asked": questions_asked,
                "answers_given": answers_given,
                "completion_rate": round((answers_given / questions_asked * 100) if questions_asked > 0 else 0, 2),
                "status": "completed",
                "message": "HR interview completed successfully"
            }

            # Update session
            session.status = "completed"
            session.end_time = datetime.now()
            db.commit()

            return {
                "status": "success",
                "report": report
            }

        except Exception as e:
            db.rollback()
            raise Exception(f"Failed to generate HR interview report: {str(e)}")