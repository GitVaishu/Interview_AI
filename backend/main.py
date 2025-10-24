"""# backend/main.py
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

app = FastAPI()

# Crucial for connecting React (Frontend) to Python (Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Replace with your React URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "AI Interview System Backend Running"}

@app.post("/upload-resume/")
async def upload_resume(
    file: UploadFile = File(...),
    userId: str = Form(...),
    jobDescription: Optional[str] = Form(None)
):
 
    return {
        "status": "success",
        "filename": file.filename,
        "userId": userId,
        "hasJobDescription": jobDescription is not None,
        "message": "Resume uploaded successfully! Ready for LLM processing."
    }
"""

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

        # 5. Store metadata and raw text in the 'resumes' table
        resume_data = {
            'user_id': user_db_id,
            # Use the jobDescription provided by the user, default to None if not provided
            'job_role': job_role, 
            'raw_text': extracted_text,
        }

        # Insert the data and retrieve the new resume_id
        store_result = db_client.table('resumes').insert(resume_data).execute()
        resume_id = store_result.data[0]['resume_id']

        return {
            "status": "success",
            "resume_id": resume_id,
            "user_id": user_db_id,
            "message": "Resume uploaded, parsed, and stored successfully. Ready for AI analysis."
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