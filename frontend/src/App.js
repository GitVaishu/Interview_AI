// frontend/src/App.js

import React from 'react';
import { SignIn, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

function App() {
  return (
    <div className="App">
      <h1>AI Interview System</h1>

      {/* This content is only visible to logged-in users */}
      <SignedIn>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #ccc' }}>
          <h2>Welcome to your dashboard!</h2>
          <UserButton /> {/* The logout button and user settings */}
        </div>
        {/* TODO: Add the Resume Upload Component here next! */}
      </SignedIn>

      {/* This content is visible if the user is logged OUT */}
      <SignedOut>
        <div style={{ padding: '20px', border: '1px solid #eee', width: '300px', margin: '50px auto' }}>
          <p>Please Sign In to start your mock interview.</p>
          <SignIn signUpUrl="/signup" /> {/* The Sign In component */}
        </div>
      </SignedOut>
    </div>
  );
}

export default App;