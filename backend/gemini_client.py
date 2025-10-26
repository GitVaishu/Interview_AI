import os
import json
from pydantic import BaseModel
from google import genai
from google.genai.errors import APIError

# --- Pydantic Schema for Structured Output ---
# This ensures Gemini returns a reliably formatted JSON
class ATSReportSchema(BaseModel):
    """Defines the structure of the desired ATS Report JSON output."""
    match_score: int
    missing_keywords: list[str]
    suggestions: list[str]

def get_ats_report(resume_text: str, job_description: str) -> dict:
    """
    Analyzes the resume against the job description using the Gemini API 
    and returns a structured ATS report.
    """
    # The API key should be set as an environment variable (e.g., GEMINI_API_KEY)
    # The client will automatically pick it up.
    try:
        client = genai.Client()
    except Exception as e:
        print(f"Error initializing Gemini client: {e}")
        # Return a fallback/empty report on failure
        return {
            "match_score": 0,
            "missing_keywords": ["AI Service Unavailable"],
            "suggestions": ["Please check the backend logs for AI connection errors."]
        }
        
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) and Career Coach. 
    Analyze the provided RESUME against the JOB DESCRIPTION.

    RESUME:
    ---
    {resume_text}
    ---

    JOB DESCRIPTION:
    ---
    {job_description}
    ---

    Provide a concise ATS report using the requested JSON schema. 
    1. 'match_score' is an integer (0-100) representing the match percentage.
    2. 'missing_keywords' is a list of up to 5 critical keywords/skills from the job description missing or underrepresented in the resume.
    3. 'suggestions' is a list of up to 5 actionable suggestions to improve the resume for this specific job, focusing on gaps and quantification.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash', # Excellent for fast structured reasoning
            contents=prompt,
            config={"response_mime_type": "application/json", "response_schema": ATSReportSchema}
        )
        
        # The response.text will be a valid JSON string matching ATSReportSchema
        return json.loads(response.text)

    except APIError as e:
        print(f"Gemini API Error: {e}")
        return {
            "match_score": 0,
            "missing_keywords": ["AI Processing Failed"],
            "suggestions": [f"AI Model failed to generate report. Detail: {e}"]
        }
    except Exception as e:
        print(f"An unexpected error occurred during AI analysis: {e}")
        return {
            "match_score": 0,
            "missing_keywords": ["Internal Analysis Error"],
            "suggestions": ["An unexpected error occurred on the server during AI processing."]
        }