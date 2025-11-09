# backend/db_client.py

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path 

# 1. EXPLICITLY CALCULATE PATH TO .env FILE
DOTENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=DOTENV_PATH) 

# --- Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    
    raise EnvironmentError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables.")

# --- Supabase Client Initialization ---
def get_supabase_client() -> Client:
    """Initializes and returns the Supabase client."""
    # Using the 'supabase-py' library
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# backend/auths_utils.py
from supabase import Client

async def ensure_user_exists(db_client: Client, clerk_user_id: str, email: str):
    try:
        # Check if user exists using Supabase syntax
        result = db_client.table('users').select('*').eq('user_id', clerk_user_id).execute()
        
        if result.data and len(result.data) > 0:
            # User exists, return it
            return result.data[0]
        
        # User doesn't exist, create new user
        new_user_data = {
            'user_id': clerk_user_id,
            'email': email
        }
        
        insert_result = db_client.table('users').insert(new_user_data).execute()
        
        if insert_result.data and len(insert_result.data) > 0:
            return insert_result.data[0]
        else:
            raise Exception("Failed to create user in database")
            
    except Exception as e:
        print(f"Error in ensure_user_exists: {e}")
        raise Exception(f"Database error while ensuring user exists: {e}")