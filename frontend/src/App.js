import React, { useState } from "react";
import {
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
  useClerk,
} from "@clerk/clerk-react";
import "./App.css";

// --- Dashboard Home Component ---
const Dashboard = ({ user, onNavigate }) => {
  const features = [
    {
      id: "resume",
      title: "Upload Resume",
      desc: "Upload your resume for AI analysis",
      icon: "📄",
      available: true,
    },
    {
      id: "interview",
      title: "Start Interview",
      desc: "Begin your AI mock interview",
      icon: "🎯",
      available: true,
    },
    {
      id: "progress",
      title: "My Progress",
      desc: "Track your interview performance",
      icon: "📊",
      available: true,
    },
    {
      id: "hr",
      title: "HR Round",
      desc: "Practice HR questions",
      icon: "💼",
      available: false,
    },
    {
      id: "vision",
      title: "Video Interview",
      desc: "AI-powered video assessment",
      icon: "📹",
      available: false,
    },
    {
      id: "scraper",
      title: "Profile Import",
      desc: "Import from LinkedIn/GitHub",
      icon: "🔗",
      available: false,
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="welcome-section">
        <h2>
          Welcome back,{" "}
          {user?.firstName ||
            user?.emailAddresses?.[0]?.emailAddress.split("@")[0] ||
            "User"}
          ! 👋
        </h2>
        <p>Ready to ace your next interview? Let's get started!</p>
      </div>

      <div className="features-grid">
        {features.map((feature) => (
          <div
            key={feature.id}
            className={`feature-card ${
              !feature.available ? "coming-soon" : ""
            }`}
            onClick={() => feature.available && onNavigate(feature.id)}
          >
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
            {!feature.available && <span className="badge">Coming Soon</span>}
          </div>
        ))}
      </div>

      <div className="quick-stats">
        <div className="stat-card">
          <h4>Interviews Completed</h4>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h4>Average Score</h4>
          <p className="stat-number">--</p>
        </div>
        <div className="stat-card">
          <h4>Hours Practiced</h4>
          <p className="stat-number">0h</p>
        </div>
      </div>
    </div>
  );
};

// --- Resume Upload Component ---
const ResumeUpload = ({ user, onNavigate }) => {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a resume file first!");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id);
    formData.append("jobDescription", jobDescription);

    try {
      const response = await fetch("http://localhost:8000/upload-resume/", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      console.log("Upload successful:", data);
      setUploadSuccess(true);
      setTimeout(() => onNavigate("interview"), 2000);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => onNavigate("home")}>
        ← Back to Dashboard
      </button>

      <div className="upload-section">
        <h2>📄 Upload Your Resume</h2>
        <p>
          Upload your resume and we'll analyze it with AI to generate
          personalized interview questions
        </p>

        <div className="upload-box">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            id="resume-input"
            className="file-input"
          />
          <label htmlFor="resume-input" className="file-label">
            <span className="upload-icon">☁️</span>
            <span>
              {file ? file.name : "Click to select resume (PDF, DOC, DOCX)"}
            </span>
          </label>
        </div>

        <div className="job-desc-section">
          <h3>🎯 Job Description (Optional)</h3>
          <p>Paste the job description for targeted interview questions</p>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste job description here..."
            rows="8"
            className="job-desc-textarea"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className={`upload-btn ${uploading ? "uploading" : ""}`}
        >
          {uploading
            ? "⏳ Uploading..."
            : uploadSuccess
            ? "✅ Success!"
            : "🚀 Upload & Continue"}
        </button>
      </div>
    </div>
  );
};

// --- Interview Setup Component ---
const InterviewSetup = ({ user, onNavigate }) => {
  const [level, setLevel] = useState("medium");
  const [duration, setDuration] = useState(30);
  const [topics, setTopics] = useState([]);

  const allTopics = [
    "JavaScript",
    "Python",
    "React",
    "Node.js",
    "SQL",
    "Data Structures",
    "Algorithms",
    "System Design",
  ];

  const toggleTopic = (topic) => {
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const startInterview = () => {
    alert(
      `Starting ${level} interview for ${duration} minutes focusing on: ${
        topics.join(", ") || "General Topics"
      }`
    );
    // Backend integration will go here
  };

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => onNavigate("home")}>
        ← Back to Dashboard
      </button>

      <div className="interview-setup">
        <h2>🎯 Configure Your Interview</h2>

        <div className="setup-section">
          <h3>Difficulty Level</h3>
          <div className="level-buttons">
            {["easy", "medium", "hard"].map((l) => (
              <button
                key={l}
                className={`level-btn ${level === l ? "active" : ""}`}
                onClick={() => setLevel(l)}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-section">
          <h3>Interview Duration</h3>
          <input
            type="range"
            min="15"
            max="60"
            step="15"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="duration-slider"
          />
          <p className="duration-display">{duration} minutes</p>
        </div>

        <div className="setup-section">
          <h3>Focus Topics (Optional)</h3>
          <div className="topics-grid">
            {allTopics.map((topic) => (
              <button
                key={topic}
                className={`topic-btn ${
                  topics.includes(topic) ? "selected" : ""
                }`}
                onClick={() => toggleTopic(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        <button className="start-interview-btn" onClick={startInterview}>
          🎤 Start Interview
        </button>
      </div>
    </div>
  );
};

// --- Progress Tracker Component ---
const ProgressTracker = ({ user, onNavigate }) => {
  const mockData = {
    interviews: [
      {
        date: "2025-10-20",
        score: 85,
        level: "Medium",
        topics: "React, JavaScript",
      },
      { date: "2025-10-18", score: 78, level: "Hard", topics: "System Design" },
      { date: "2025-10-15", score: 92, level: "Easy", topics: "Python Basics" },
    ],
    domainScores: [
      { domain: "Technical Skills", score: 85 },
      { domain: "Communication", score: 78 },
      { domain: "Problem Solving", score: 90 },
      { domain: "Coding", score: 82 },
    ],
  };

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => onNavigate("home")}>
        ← Back to Dashboard
      </button>

      <div className="progress-section">
        <h2>📊 Your Progress</h2>

        <div className="domain-scores">
          <h3>Domain-wise Scores</h3>
          {mockData.domainScores.map((item, idx) => (
            <div key={idx} className="score-bar-container">
              <div className="score-label">
                <span>{item.domain}</span>
                <span className="score-value">{item.score}%</span>
              </div>
              <div className="score-bar">
                <div
                  className="score-fill"
                  style={{ width: `${item.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="interview-history">
          <h3>Recent Interviews</h3>
          <div className="history-list">
            {mockData.interviews.map((interview, idx) => (
              <div key={idx} className="history-item">
                <div className="history-date">{interview.date}</div>
                <div className="history-details">
                  <span className="history-level">{interview.level}</span>
                  <span className="history-topics">{interview.topics}</span>
                </div>
                <div
                  className={`history-score ${
                    interview.score >= 80 ? "high" : "medium"
                  }`}
                >
                  {interview.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Authentication Screen ---
const AuthScreen = () => {
  const [isSignIn, setIsSignIn] = useState(true);

  return (
    <div className="auth-container">
      <header className="auth-header">
        <h1>🎯 AI Mock Interview System</h1>
        <p>Master your interviews with AI-powered practice sessions</p>
      </header>

      <main className="auth-main">
        <div className="auth-toggle">
          <button
            onClick={() => setIsSignIn(true)}
            className={`toggle-btn ${isSignIn ? "active" : ""}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignIn(false)}
            className={`toggle-btn ${!isSignIn ? "active" : ""}`}
          >
            Sign Up
          </button>
        </div>

        {isSignIn ? <SignIn /> : <SignUp />}
      </main>

      <footer className="auth-footer">
        <p>
          ✨ Features: Resume Analysis | AI Questions | Progress Tracking |
          Real-time Feedback
        </p>
      </footer>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [currentPage, setCurrentPage] = useState("home");

  if (!isLoaded) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <Dashboard user={user} onNavigate={setCurrentPage} />;
      case "resume":
        return <ResumeUpload user={user} onNavigate={setCurrentPage} />;
      case "interview":
        return <InterviewSetup user={user} onNavigate={setCurrentPage} />;
      case "progress":
        return <ProgressTracker user={user} onNavigate={setCurrentPage} />;
      default:
        return <Dashboard user={user} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app">
      <SignedIn>
        {/* Navbar */}
        <nav className="navbar">
          <div className="nav-brand" onClick={() => setCurrentPage("home")}>
            <span className="nav-logo">🎯</span>
            <span className="nav-title">AI Interview Prep</span>
          </div>

          <div className="nav-links">
            <button
              onClick={() => setCurrentPage("home")}
              className={currentPage === "home" ? "active" : ""}
            >
              🏠 Home
            </button>
            <button
              onClick={() => setCurrentPage("resume")}
              className={currentPage === "resume" ? "active" : ""}
            >
              📄 Resume
            </button>
            <button
              onClick={() => setCurrentPage("interview")}
              className={currentPage === "interview" ? "active" : ""}
            >
              🎤 Interview
            </button>
            <button
              onClick={() => setCurrentPage("progress")}
              className={currentPage === "progress" ? "active" : ""}
            >
              📊 Progress
            </button>
          </div>

          <div className="nav-user">
            <span className="user-name">
              {user?.firstName ||
                user?.emailAddresses?.[0]?.emailAddress.split("@")[0] ||
                "User"}
            </span>
            <UserButton />
            <button onClick={() => signOut()} className="signout-btn">
              Sign Out
            </button>
          </div>
        </nav>

        {/* Page Content */}
        <main className="main-content">{renderPage()}</main>
      </SignedIn>

      <SignedOut>
        <AuthScreen />
      </SignedOut>
    </div>
  );
}

export default App;
