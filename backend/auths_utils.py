# backend/auth_utils.py
from supabase import Client
from postgrest.exceptions import APIError

async def ensure_user_exists(db_client: Client, clerk_user_id: str, email: str = None) -> dict:
    """
    Checks if a user exists in the 'users' table using the Clerk ID (user_id) 
    and inserts them if they don't. Returns the user data.
    """
    
    # 1. Check if the user exists
    user_result = (
        db_client.table('users')
        .select('user_id, email, first_name') # Select necessary columns
        .eq('user_id', clerk_user_id)
        .limit(1)
        .execute()
    )
    
    user_data = user_result.data
    
    if user_data:
        # User exists
        return user_data[0]
    else:
        # 2. User does not exist, insert new user
        if not email:
            # You should ideally fetch the email from Clerk's backend API or JWT payload
            # For simplicity, we assume it's passed or derived from the token.
            raise ValueError("Email is required to create a new user.")
            
        new_user_data = {
            'user_id': clerk_user_id, # Clerk ID as PK
            'email': email,
            # 'created_at' defaults to CURRENT_TIMESTAMP in SQL, no need to include it
        }
        
        try:
            insert_result = (
                db_client.table('users')
                .insert(new_user_data)
                .execute()
            )
            
            # The inserted data is returned in insert_result.data
            if insert_result.data:
                return insert_result.data[0]
            else:
                 # This path is generally for successful but empty responses, which is unlikely
                raise Exception("Insert operation failed to return data.")

        except APIError as e:
            # Handle specific Supabase/PostgREST errors (e.g., integrity constraint violation)
            raise Exception(f"Database error during user creation: {e.message}")
        except Exception as e:
             raise Exception(f"An unexpected error occurred during user creation: {e}")