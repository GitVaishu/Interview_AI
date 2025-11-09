# backend/hr_questions.py

import json
from typing import List, Dict, Any
import google.generativeai as genai
import os

class HRQuestionGenerator:
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None

    def get_hr_questions_based_on_resume(self, resume_text: str, job_description: str = "") -> Dict[str, Any]:
        """
        Generate personalized HR questions based on resume content
        """
        if not self.gemini_api_key or not self.model:
            return self.get_fallback_hr_questions()

        try:
            prompt = f"""
            Analyze this resume and generate 8 personalized HR interview questions focusing on:
            1. Self-introduction and background
            2. Company knowledge and motivation
            3. Career goals and aspirations
            4. Behavioral and situational questions
            5. Questions based on extracurricular activities, achievements, and positions of responsibility mentioned in resume
            
            RESUME TEXT:
            {resume_text[:4000]}
            
            JOB DESCRIPTION:
            {job_description or 'General professional role'}
            
            Return ONLY a JSON object with this exact structure:
            {{
                "hr_questions": [
                    {{
                        "question": "the question text",
                        "category": "introduction|company_knowledge|career_goals|behavioral|achievements|extracurricular",
                        "purpose": "brief explanation of what this question assesses",
                        "difficulty": "easy|medium|hard"
                    }}
                ],
                "focus_areas": ["area1", "area2", "area3"]
            }}
            
            Make questions personalized based on the resume content. For example:
            - If resume mentions leadership positions, ask about leadership experiences
            - If resume shows achievements, ask about the journey to those achievements
            - If resume has extracurricular activities, ask about transferable skills
            
            Generate the questions now:
            """
            
            response = self.model.generate_content(prompt)
            ai_response = response.text.strip()
            
            # Clean the response
            cleaned_response = self.clean_ai_response(ai_response)
            return json.loads(cleaned_response)
            
        except Exception as e:
            print(f"HR question generation failed: {e}")
            return self.get_fallback_hr_questions()

    def clean_ai_response(self, response: str) -> str:
        """Clean AI response by removing markdown formatting"""
        if response.startswith("```json"):
            response = response[7:]
        if response.endswith("```"):
            response = response[:-3]
        return response.strip()

    def get_fallback_hr_questions(self) -> Dict[str, Any]:
        """Fallback HR questions if AI fails"""
        return {
            "hr_questions": [
                {
                    "question": "Can you walk me through your resume and highlight key experiences that make you a good fit for this role?",
                    "category": "introduction",
                    "purpose": "Assess communication skills and self-awareness",
                    "difficulty": "medium"
                },
                {
                    "question": "What do you know about our company and why do you want to work here?",
                    "category": "company_knowledge", 
                    "purpose": "Evaluate research skills and genuine interest",
                    "difficulty": "medium"
                },
                {
                    "question": "Where do you see yourself in the next 5 years?",
                    "category": "career_goals",
                    "purpose": "Understand long-term career aspirations",
                    "difficulty": "easy"
                },
                {
                    "question": "Tell me about a time you faced a significant challenge and how you overcame it.",
                    "category": "behavioral",
                    "purpose": "Assess problem-solving and resilience",
                    "difficulty": "medium"
                },
                {
                    "question": "What achievement are you most proud of and why?",
                    "category": "achievements",
                    "purpose": "Understand values and motivation drivers",
                    "difficulty": "medium"
                },
                {
                    "question": "How do your extracurricular activities contribute to your professional development?",
                    "category": "extracurricular", 
                    "purpose": "Assess transferable skills and work-life balance",
                    "difficulty": "medium"
                },
                {
                    "question": "Describe a situation where you had to take leadership responsibility. What did you learn?",
                    "category": "behavioral",
                    "purpose": "Evaluate leadership potential and learning ability", 
                    "difficulty": "hard"
                },
                {
                    "question": "What motivates you to perform at your best?",
                    "category": "behavioral",
                    "purpose": "Understand intrinsic motivation factors",
                    "difficulty": "easy"
                }
            ],
            "focus_areas": ["Communication", "Motivation", "Career Goals", "Leadership", "Achievements"]
        }

    def get_common_hr_questions(self) -> List[Dict[str, str]]:
        """Get common HR questions that are always relevant"""
        return [
            {
                "question": "Tell me about yourself.",
                "category": "introduction",
                "purpose": "Ice breaker and overview of candidate",
                "difficulty": "easy"
            },
            {
                "question": "Why should we hire you?",
                "category": "self_promotion", 
                "purpose": "Assess self-awareness and value proposition",
                "difficulty": "medium"
            },
            {
                "question": "What are your strengths and weaknesses?",
                "category": "self_awareness",
                "purpose": "Evaluate self-assessment and honesty", 
                "difficulty": "medium"
            },
            {
                "question": "How do you handle pressure and tight deadlines?",
                "category": "behavioral",
                "purpose": "Assess stress management skills",
                "difficulty": "medium"
            },
            {
                "question": "What are your salary expectations?",
                "category": "compensation", 
                "purpose": "Understand compensation alignment",
                "difficulty": "hard"
            }
        ]