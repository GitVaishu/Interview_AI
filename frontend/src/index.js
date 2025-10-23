import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Standard CSS import
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';

// Retrieve the Publishable Key from the environment variables
const PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
console.log("eefref",PUBLISHABLE_KEY)

if (!PUBLISHABLE_KEY) {
  // If the key is missing, log a critical error and stop the application
  console.error("FATAL ERROR: Clerk Publishable Key is missing! Check frontend/.env and ensure you restarted npm start.");
  throw new Error("REACT_APP_CLERK_PUBLISHABLE_KEY not found. Please check your .env file.");
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
