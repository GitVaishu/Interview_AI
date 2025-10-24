# backend/db_client.py

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path # Import pathlib

# 1. EXPLICITLY CALCULATE PATH TO .env FILE
# This calculates the path relative to the script's location (db_client.py)
DOTENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=DOTENV_PATH) # Load using the explicit path

# --- Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    # We are using a simple load_dotenv(), so if the keys are still missing,
    # the file wasn't found or the keys are empty.
    # The traceback will show this final, necessary error.
    raise EnvironmentError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables.")

# --- Supabase Client Initialization ---
def get_supabase_client() -> Client:
    """Initializes and returns the Supabase client."""
    # Using the 'supabase-py' library
    return create_client(SUPABASE_URL, SUPABASE_KEY)