# backend/resume_parser.py
import os
import tempfile
from pypdf import PdfReader
from docx import Document

def extract_text_from_file(file_path: str, file_name: str) -> str:
    """Extracts text from PDF or DOCX files."""
    _, file_extension = os.path.splitext(file_name)
    file_extension = file_extension.lower()
    text = ""
    
    try:
        if file_extension == '.pdf':
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += page.extract_text() or ""
        
        elif file_extension == '.docx':
            doc = Document(file_path)
            for paragraph in doc.paragraphs:
                text += paragraph.text + '\n'
        
        else:
            raise ValueError(f"Unsupported file type: {file_extension}. Only PDF and DOCX are supported.")
            
    except Exception as e:
        print(f"Error during text extraction from {file_name}: {e}")
        # Return a standard error message instead of failing the whole request
        return f"Error: Could not process file - {str(e)}"
        
    return text.strip()