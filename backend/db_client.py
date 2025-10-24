# backend/db_client.py

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path # Import pathlib

# --- Modified Load: Explicitly point to the .env file ---
# Calculate the path to the .env file in the same directory as db_client.py
DOTENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=DOTENV_PATH)
# --------------------------------------------------------

# --- Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables.")

# ... rest of the code

# --- Supabase Client Initialization ---
def get_supabase_client() -> Client:
    """Initializes and returns the Supabase client."""
    # Using the 'supabase-py' library
    return create_client(SUPABASE_URL, SUPABASE_KEY)