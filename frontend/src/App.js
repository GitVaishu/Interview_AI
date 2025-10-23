import React, { useState } from 'react';
import { SignIn, SignUp, SignedIn, SignedOut, UserButton, useUser, useClerk } from '@clerk/clerk-react';

// --- Dashboard Component (Remains the same) ---
const Dashboard = ({ user }) => {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: '#10B981' }}>
        Welcome, {user.firstName || user.emailAddresses[0].emailAddress.split('@')[0]}!
      </h2>
      <p style={{ fontSize: '1.1rem', color: '#4B5563', marginBottom: '30px' }}>
        You are securely logged in. Your unique user ID (Clerk ID) is:
        <code style={{ display: 'block', marginTop: '5px', padding: '10px', backgroundColor: '#F3F4F6', borderRadius: '5px', fontWeight: 'bold' }}>
          {user.id}
        </code>
      </p>

      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '30px' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Next Step: Resume Upload</h3>
        <p style={{ color: '#6B7280', marginBottom: '20px' }}>
          This is where you will build the component to upload the resume.
          We will send this file, along with your secure User ID, to the FastAPI backend.
        </p>
        <button 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#10B981', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontSize: '1rem' 
          }}
        >
          Go to Resume Upload (Coming Soon)
        </button>
      </div>
    </div>
  );
};

// --- Authentication Screen (Updated for direct component usage) ---
const AuthScreen = () => {
  // Use 'true' to show Sign In first, 'false' to show Sign Up
  const [isSignIn, setIsSignIn] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      <header style={{ width: '100%', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#1F2937' }}>AI Interview System</h1>
        <p style={{ color: '#6B7280' }}>Your personalized, multimodal interview preparation tool.</p>
      </header>
      
      <main style={{ marginTop: '50px', padding: '20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', width: '90%', maxWidth: '400px' }}>
        
        {/* Toggle Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <button 
            onClick={() => setIsSignIn(true)}
            style={{ 
              padding: '10px 20px', 
              marginRight: '10px',
              backgroundColor: isSignIn ? '#10B981' : '#E5E7EB', 
              color: isSignIn ? 'white' : '#4B5563', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Sign In
          </button>
          <button 
            onClick={() => setIsSignIn(false)}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: !isSignIn ? '#10B981' : '#E5E7EB', 
              color: !isSignIn ? 'white' : '#4B5563', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Sign Up
          </button>
        </div>
        
        {/* Render the appropriate Clerk component based on state */}
        {isSignIn ? (
          // Renders the dedicated Sign In form
          <SignIn />
        ) : (
          // Renders the dedicated Sign Up form
          <SignUp /> 
        )}

      </main>
    </div>
  );
};


function App() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return <div style={{ textAlign: 'center', padding: '100px', fontSize: '1.5rem' }}>Loading Authentication...</div>;
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Signed In View */}
      <SignedIn>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '15px 40px', 
          backgroundColor: '#374151', 
          color: 'white' 
        }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>AI Interview Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <button 
               onClick={() => signOut()}
               style={{ 
                 padding: '8px 15px', 
                 backgroundColor: '#EF4444', 
                 color: 'white', 
                 border: 'none', 
                 borderRadius: '6px', 
                 cursor: 'pointer' 
               }}
             >
               Sign Out
             </button>
            <UserButton /> {/* The small user avatar/menu */}
          </div>
        </header>
        <Dashboard user={user} />
      </SignedIn>

      {/* Signed Out View */}
      <SignedOut>
        <AuthScreen />
      </SignedOut>
    </div>
  );
}

export default App;
