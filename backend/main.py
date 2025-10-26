# backend/main.py
import tempfile
import shutil
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from supabase import Client

# Import the NEW utility files you created in the 'backend' directory
from .db_client import get_supabase_client
from .auths_utils import ensure_user_exists
from .resume_parser import extract_text_from_file
from .gemini_client import get_ats_report 

app = FastAPI()

# Crucial for connecting React (Frontend) to Python (Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Replace with your React URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency injection for the Supabase client
def get_db_client():
    """FastAPI Dependency to get the Supabase client."""
    return get_supabase_client()

@app.get("/")
def read_root():
    return {"message": "AI Interview System Backend Running"}

@app.post("/upload-resume/")
async def upload_resume(
    file: UploadFile = File(...),
    # Renamed 'userId' from Form to 'clerk_user_id' for clarity (matches auth_utils)
    clerk_user_id: str = Form(..., alias="userId"), 
    # Using 'jobDescription' as the targeted 'job_role' in the DB
    job_role: Optional[str] = Form(None, alias="jobDescription"),
    db_client: Client = Depends(get_db_client)
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
        # 2. Ensure user exists in DB (Requires user email; fetching it here for simplicity)
        # NOTE: In production, the email must come from a secure source (e.g., Clerk JWT).
        # We assume a placeholder email for now as you didn't include it in the Form data.
        user_email_placeholder = f"user_{clerk_user_id}@temp.com" 
        
        user = await ensure_user_exists(db_client, clerk_user_id, user_email_placeholder)
        user_db_id = user['user_id'] # Matches the Clerk ID
        
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
            'ats_report': ats_report_result, # <-- NEW DATA FIELD
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
        raise # Re-raise explicit 400 errors

    except Exception as e:
        print(f"An error occurred during resume upload: {e}")
        # Return a 500 status on internal error
        raise HTTPException(status_code=500, detail=f"Internal server error: Failed to process resume or save to DB. Detail: {e}")
    
    finally:
        # 6. Clean up the temporary file (ALWAYS runs)
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
# In backend/main.py

@app.get("/ats-report/{user_id}")
def get_latest_ats_report(user_id: str, db_client: Client = Depends(get_db_client)):
    """
    Retrieves the most recently uploaded resume entry (which contains the ATS report)
    for the specified user.
    """
    try:
        # Query the 'resumes' table for the latest entry by this user
        result = db_client.table('resumes')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('upload_date', desc=True)\
            .limit(1)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="No resume or ATS report found for this user.")

        # The ats_report field should be directly accessible
        latest_resume = result.data[0]
        
        # Only return the data needed for the report page (Report + context)
        return {
            "resume_id": latest_resume.get('resume_id'),
            "job_role": latest_resume.get('job_role'),
            "ats_report": latest_resume.get('ats_report'),
            "upload_date": latest_resume.get('upload_date')
        }

    except Exception as e:
        print(f"Error fetching ATS report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch report from database. Detail: {e}")