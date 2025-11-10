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
                        "difficulty": "easy|medium|hard",
                        "hints": [
                            "Specific hint 1 for THIS question",
                            "Specific hint 2 for THIS question",
                            "Specific hint 3 for THIS question",
                            "Specific hint 4 for THIS question",
                            "Specific hint 5 for THIS question"
                        ]
                    }}
                ],
                "focus_areas": ["area1", "area2", "area3"]
            }}
            
            IMPORTANT: 
            - Make hints SPECIFIC to each question (not generic advice)
            - Keep hints short and actionable (5 points per question)
            - Example: For "Tell me about yourself" → hints about career journey, hobbies, interests
            - Example: For "Why this company" → hints about researching company, aligning values
            - Personalize based on resume content when possible
            
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
                    "difficulty": "medium",
                    "hints": [
                        "Start with your current role/education, then work backwards",
                        "Highlight 2-3 key achievements or projects relevant to this role",
                        "Connect your experiences to the job requirements",
                        "Keep it concise - aim for 2-3 minutes",
                        "End with why you're excited about this opportunity"
                    ]
                },
                {
                    "question": "What do you know about our company and why do you want to work here?",
                    "category": "company_knowledge", 
                    "purpose": "Evaluate research skills and genuine interest",
                    "difficulty": "medium",
                    "hints": [
                        "Mention specific products, services, or recent news about the company",
                        "Connect company values/mission with your personal values",
                        "Show you've researched their culture and work environment",
                        "Explain how this role aligns with your career goals",
                        "Be genuine - don't just praise, show understanding"
                    ]
                },
                {
                    "question": "Where do you see yourself in the next 5 years?",
                    "category": "career_goals",
                    "purpose": "Understand long-term career aspirations",
                    "difficulty": "easy",
                    "hints": [
                        "Show ambition but be realistic about the timeline",
                        "Align your goals with potential growth in this company",
                        "Mention skills you want to develop and leadership aspirations",
                        "Avoid saying you want their boss's job or to leave soon",
                        "Focus on professional growth, not just titles"
                    ]
                },
                {
                    "question": "Tell me about a time you faced a significant challenge and how you overcame it.",
                    "category": "behavioral",
                    "purpose": "Assess problem-solving and resilience",
                    "difficulty": "medium",
                    "hints": [
                        "Use STAR method: Situation, Task, Action, Result",
                        "Choose a real challenge (academic project, work conflict, deadline pressure)",
                        "Focus on YOUR actions, not what the team did",
                        "Include specific steps you took to solve the problem",
                        "End with measurable results and what you learned"
                    ]
                },
                {
                    "question": "What achievement are you most proud of and why?",
                    "category": "achievements",
                    "purpose": "Understand values and motivation drivers",
                    "difficulty": "medium",
                    "hints": [
                        "Pick an achievement relevant to the job (project, award, leadership role)",
                        "Explain the context and why it was challenging",
                        "Describe your specific contribution and effort",
                        "Quantify the impact (improved X by Y%, led team of Z)",
                        "Share why it matters to you personally"
                    ]
                },
                {
                    "question": "How do your extracurricular activities contribute to your professional development?",
                    "category": "extracurricular", 
                    "purpose": "Assess transferable skills and work-life balance",
                    "difficulty": "medium",
                    "hints": [
                        "Connect activities to skills needed for the job (leadership, teamwork, time management)",
                        "Give specific examples (sports → discipline, clubs → collaboration)",
                        "Show how these activities shaped your personality",
                        "Mention any leadership roles or organizing responsibilities",
                        "Demonstrate balance between work/studies and personal interests"
                    ]
                },
                {
                    "question": "Describe a situation where you had to take leadership responsibility. What did you learn?",
                    "category": "behavioral",
                    "purpose": "Evaluate leadership potential and learning ability", 
                    "difficulty": "hard",
                    "hints": [
                        "Choose a specific instance where you led a team or project",
                        "Explain the challenge and your leadership approach",
                        "Describe how you motivated team members and resolved conflicts",
                        "Share measurable outcomes (delivered on time, achieved X result)",
                        "Reflect on lessons learned about leadership and yourself"
                    ]
                },
                {
                    "question": "What motivates you to perform at your best?",
                    "category": "behavioral",
                    "purpose": "Understand intrinsic motivation factors",
                    "difficulty": "easy",
                    "hints": [
                        "Be honest about what drives you (learning, impact, recognition, challenges)",
                        "Give examples of when you felt most motivated",
                        "Connect your motivations to this role and company",
                        "Avoid generic answers like 'money' - focus on growth and purpose",
                        "Show self-awareness about what energizes you"
                    ]
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
                "difficulty": "easy",
                "hints": [
                    "Start with current role/education and career journey",
                    "Mention 2-3 key achievements or skills",
                    "Include hobbies or interests that show your personality",
                    "Connect your background to why you're here today",
                    "Keep it professional but personable (2-3 minutes max)"
                ]
            },
            {
                "question": "Why should we hire you?",
                "category": "self_promotion", 
                "purpose": "Assess self-awareness and value proposition",
                "difficulty": "medium",
                "hints": [
                    "Match your skills directly to the job requirements",
                    "Highlight unique strengths or experiences you bring",
                    "Give 2-3 specific examples of past successes",
                    "Show enthusiasm and cultural fit with the company",
                    "Be confident but not arrogant"
                ]
            },
            {
                "question": "What are your strengths and weaknesses?",
                "category": "self_awareness",
                "purpose": "Evaluate self-assessment and honesty", 
                "difficulty": "medium",
                "hints": [
                    "For strengths: Pick 2-3 relevant to the job with examples",
                    "For weaknesses: Be honest but choose something minor",
                    "Show you're actively working to improve the weakness",
                    "Don't say 'I'm a perfectionist' - it's overused",
                    "Balance honesty with confidence"
                ]
            },
            {
                "question": "How do you handle pressure and tight deadlines?",
                "category": "behavioral",
                "purpose": "Assess stress management skills",
                "difficulty": "medium",
                "hints": [
                    "Share a specific example of working under pressure",
                    "Describe your prioritization and time management approach",
                    "Mention techniques you use (planning, breaks, asking for help)",
                    "Show the successful outcome despite the pressure",
                    "Demonstrate you stay calm and focused"
                ]
            },
            {
                "question": "What are your salary expectations?",
                "category": "compensation", 
                "purpose": "Understand compensation alignment",
                "difficulty": "hard",
                "hints": [
                    "Research market rates for this role in your location",
                    "Provide a salary range, not a fixed number",
                    "Consider total compensation (benefits, growth opportunities)",
                    "Be flexible and open to negotiation",
                    "Focus on value you bring, not just your needs"
                ]
            }
        ]