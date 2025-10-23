# backend/main.py
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

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
async def upload_resume(file: UploadFile = File(...)):
    # Resume parsing logic will go here
    return {"filename": file.filename, "status": "Uploaded and waiting for LLM processing"}

# Run this file with: uvicorn main:app --reload