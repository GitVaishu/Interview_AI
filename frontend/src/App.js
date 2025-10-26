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

// --- New Component: Resume Action Hub (The Choice Screen) ---
const ResumeActionHub = ({ onNavigate }) => {
    return (
        <div className="page-container">
            <button className="back-btn" onClick={() => onNavigate("home")}>
                ← Back to Dashboard
            </button>

            <div className="resume-action-hub">
                <h2 className="welcome-heading">Resume Uploaded! What's Next?</h2>
                <p className="selection-desc">Your resume has been processed. Choose how you'd like to use the analysis.</p>

                {/* === Option 1: View ATS Report (New) === */}
                <div className="action-card primary-action" onClick={() => console.log("ATS Scan functionality coming soon.")}>
                    <div className="icon-section">
                        <span role="img" aria-label="scanner">🔍</span>
                    </div>
                    <div className="text-section">
                        <h3 className="card-title">View ATS Scan Report</h3>
                        <p className="card-description">
                            See your ATS matching score, keyword gaps, and receive suggestions for the specified job role.
                        </p>
                        <button 
                            className="btn btn-primary large-btn"
                            //onClick={(e) => {e.stopPropagation(); onNavigate("ats-report");}}>
                            // CHANGE: Remove onNavigate call and use a simple console log/alert
                            onClick={(e) => {
                                e.stopPropagation(); 
                                onNavigate("ats-report");
                            }}>
                            Start ATS Scan
                        </button>
                    </div>
                </div>
                
                {/* Separator */}
                <div className="divider-text">OR</div>

                {/* === Option 2: Start Interview === */}
                <div className="action-card secondary-action" onClick={() => onNavigate("interview")}>
                    <div className="icon-section">
                        <span role="img" aria-label="interview">🎯</span>
                    </div>
                    <div className="text-section">
                        <h3 className="card-title">Begin Mock Interview</h3>
                        <p className="card-description">
                            Use your uploaded resume and job description to generate highly personalized questions.
                        </p>
                        <button 
                            className="btn btn-secondary large-btn"
                            onClick={(e) => {e.stopPropagation(); onNavigate("interview");}}>
                            Begin Interview
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
// --- End New Component ---



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
      setTimeout(() => onNavigate("action-hub"), 2000);
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
    // Navigate to interview session
    onNavigate("interview-session", {
      level,
      duration,
      topics: topics.length > 0 ? topics : allTopics,
    });
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

// --- Interview Session Component ---
const InterviewSession = ({ user, onNavigate, config }) => {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(config?.duration * 60 || 1800); // seconds

  // Mock question for now
  const mockQuestion = {
    number: currentQuestion,
    total: 10,
    text: "Explain the concept of closures in JavaScript with an example. How would you use closures in a real-world application?",
    category: "JavaScript",
  };

  // Timer effect
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-end interview when timer reaches 0
          alert(
            "Time's up! Your interview has ended. Redirecting to results..."
          );
          onNavigate("progress");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onNavigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmitAnswer = () => {
    if (!answer.trim()) {
      alert("Please provide an answer before submitting!");
      return;
    }

    // TODO: Send answer to backend for evaluation
    console.log("Submitted answer:", answer);

    // Move to next question or finish
    if (currentQuestion < mockQuestion.total) {
      setCurrentQuestion((prev) => prev + 1);
      setAnswer("");
    } else {
      alert("Interview completed! Redirecting to results...");
      onNavigate("progress");
    }
  };

  return (
    <div className="interview-session-container">
      {/* Header with timer and progress */}
      <div className="interview-header">
        <div className="interview-header-left">
          <h2>🎤 AI Mock Interview</h2>
          <span className="interview-level">
            {config?.level || "Medium"} Level
          </span>
        </div>
        <div className="interview-header-right">
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="interview-main">
        {/* Left side: Video preview */}
        <div className="interview-video-section">
          <div className="video-preview">
            <div className="video-placeholder">
              <span className="camera-icon">📹</span>
              <p>Camera Preview</p>
              <small>Proctoring will be enabled here</small>
            </div>
          </div>

          <div className="interview-stats">
            <div className="stat-item">
              <span className="stat-label">Question</span>
              <span className="stat-value">
                {currentQuestion} / {mockQuestion.total}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Category</span>
              <span className="stat-value">{mockQuestion.category}</span>
            </div>
          </div>
        </div>

        {/* Right side: Question and answer */}
        <div className="interview-qa-section">
          {/* Progress bar */}
          <div className="question-progress">
            <div
              className="question-progress-fill"
              style={{
                width: `${(currentQuestion / mockQuestion.total) * 100}%`,
              }}
            ></div>
          </div>

          {/* Question box */}
          <div className="question-box">
            <div className="question-header">
              <span className="question-number">
                Question {mockQuestion.number}
              </span>
              <span className="question-category">{mockQuestion.category}</span>
            </div>
            <div className="question-text">{mockQuestion.text}</div>
          </div>

          {/* Answer box */}
          <div className="answer-section">
            <label className="answer-label">Your Answer:</label>
            <textarea
              className="answer-textarea"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here... Be clear and concise."
              rows={12}
            />
            <div className="answer-meta">
              <span className="char-count">{answer.length} characters</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="interview-actions">
            <button
              className="submit-answer-btn"
              onClick={handleSubmitAnswer}
              disabled={!answer.trim()}
            >
              Submit & Next →
            </button>
          </div>
        </div>
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
  const [interviewConfig, setInterviewConfig] = useState(null);

  const handleNavigation = (page, config = null) => {
    setCurrentPage(page);
    if (config) {
      setInterviewConfig(config);
    }
  };

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
        return <Dashboard user={user} onNavigate={handleNavigation} />;
      case "resume":
        return <ResumeUpload user={user} onNavigate={handleNavigation} />;
      case "action-hub": // <-- NEW: The choice screen after upload
        return <ResumeActionHub onNavigate={handleNavigation} />; 
      case "ats-report": // <-- NEW: Route for the ATS detailed report/results
        return <ATSReport user={user} onNavigate={handleNavigation} />;
      case "interview":
        return <InterviewSetup user={user} onNavigate={handleNavigation} />;
      case "interview-session":
        return (
          <InterviewSession
            user={user}
            onNavigate={handleNavigation}
            config={interviewConfig}
          />
        );
      case "progress":
        return <ProgressTracker user={user} onNavigate={handleNavigation} />;
      default:
        return <Dashboard user={user} onNavigate={handleNavigation} />;
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



// --- New Component: ATSReport ---
const ATSReport = ({ user, onNavigate }) => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    React.useEffect(() => {
        // Define the fetch function INSIDE useEffect
        const fetchATSReport = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Call the new FastAPI endpoint
                const response = await fetch(`http://localhost:8000/ats-report/${user.id}`);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Failed to fetch ATS report.");
                }
                
                const data = await response.json();
                
                if (data.ats_report && data.ats_report.match_score !== undefined) {
                    setReportData({
                        match_score: data.ats_report.match_score,
                        missing_keywords: data.ats_report.missing_keywords || [],
                        suggestions: data.ats_report.suggestions || [],
                        job_role: data.job_role || "Not specified",
                        job_description_preview: data.job_role ? data.job_role.substring(0, 70) + '...' : "General analysis"
                    });
                } else {
                    setError("Report generated successfully, but the full analysis was skipped because no Job Description was provided during upload.");
                }

            } catch (err) {
                console.error("Fetch Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        // Call the inner function
        fetchATSReport();
        
    }, [user.id]); // Now only 'user.id' is the dependency. The function is scoped.

    // --- Loading and Error States ---
    if (loading) {
        return (
            <div className="loading-screen page-container">
                <div className="spinner"></div>
                <p>Analyzing resume against job description...</p>
            </div>
        );
    }
    
    if (error) {
         return (
             <div className="page-container error-state">
                 <button className="back-btn" onClick={() => onNavigate("action-hub")}>← Back to Selection</button>
                 <h2 style={{color: 'red'}}>❌ Report Error</h2>
                 <p>{error}</p>
                 <p>Please check your backend server and ensure a Job Description was included with the resume upload.</p>
             </div>
         );
    }

    // Now, replace `report` with `reportData` in the rendering logic
    return (
        <div className="page-container">
            <button className="back-btn" onClick={() => onNavigate("action-hub")}>
                ← Back to Selection
            </button>
            <div className="ats-report-section">
                <h2 className="welcome-heading">🔍 ATS Scan Report</h2>
                <p className="selection-desc">
                    Analysis for job: <strong className="job-desc-preview">{reportData.job_description_preview}</strong>
                </p>

                {/* --- Match Score Section --- */}
                <div className="score-container">
                    <h3 className="score-title">ATS Match Score</h3>
                    <div className={`match-score-circle score-${Math.floor(reportData.match_score / 10) * 10}`}>
                        {reportData.match_score}%
                    </div>
                    
                    {/* --- Start Score Advice Logic (Replacing the placeholder) --- */}
                    <p className="score-advice">
                        {reportData.match_score > 85 ? (
                            // Score 86-100: Excellent
                            "🥳 Outstanding Match! Your resume is highly aligned with this job description. Focus on interview prep!"
                        ) : reportData.match_score > 70 ? (
                            // Score 71-85: Good
                            "👍 Good Match. You have the core keywords covered. Review the suggestions and keyword gaps for minor final adjustments."
                        ) : reportData.match_score > 50 ? (
                            // Score 51-70: Moderate
                            "⚠️ Moderate Match. You meet basic requirements, but critical keywords are missing. Prioritize the suggestions to significantly improve your chances."
                        ) : (
                            // Score 0-50: Needs work
                            "🚨 Low Match. Your resume needs major revisions. Tailor your experience and skills to the job description immediately to pass the ATS filter."
                        )}
                    </p>
                    {/* --- End Score Advice Logic --- */}
                </div>

                <div className="report-details-container"> 
                    {/* --- Keyword Gaps --- */}
                    <div className="card report-card missing-keywords">
                        <h3>❌ Critical Missing Keywords</h3>
                        <p>These terms from the Job Description were not found in your resume:</p>
                        <ul className="keywords-list"> {/* Added class for specific styling */}
                            {reportData.missing_keywords.map((word, index) => (
                                // CHANGED: Added role="img" to the emoji span for alignment control
                                <li key={index}>
                                    <span className="warning-emoji" role="img" aria-label="alert">⚠️</span>
                                    {word}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* --- Suggestions --- */}
                    <div className="card report-card suggestions">
                        <h3>📝 Improvement Suggestions</h3>
                        <p>Actionable advice to increase your match score:</p>
                        <ol className="suggestions-list"> {/* Changed from ul to ol for numbering */}
                            {reportData.suggestions.map((s, index) => (
                                <li key={index}>{s}</li>
                            ))}
                        </ol>
                    </div>
                </div>

                <button 
                    className="start-interview-btn-report" 
                    onClick={() => onNavigate("interview")}>
                    🚀 Start Mock Interview with this Job Role
                </button>
            </div>
        </div>
    );
};

export default App;
