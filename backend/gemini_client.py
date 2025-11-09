import os
import json
from pydantic import BaseModel
import google.generativeai as genai
from google.api_core import exceptions


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
    try:
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
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
        response = model.generate_content(
            contents=prompt,
            generation_config={"response_mime_type": "application/json", "response_schema": ATSReportSchema}
        )
        
        # The response.text will be a valid JSON string matching ATSReportSchema

        return json.loads(response.text)

    except exceptions.GoogleAPICallError as e:
        print(f"Gemini API Error: {e}")
        return {
            "match_score": 0,
            "missing_keywords": ["AI Processing Failed"],
            "suggestions": [f"AI Model failed to generate report. Detail: {e}"]
        }
    except exceptions.GoogleAPICallError as e:
        print(f"An unexpected error occurred during AI analysis: {e}")
        return {
            "match_score": 0,
            "missing_keywords": ["Internal Analysis Error"],
            "suggestions": ["An unexpected error occurred on the server during AI processing."]
        }