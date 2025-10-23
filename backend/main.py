# backend/main.py
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
