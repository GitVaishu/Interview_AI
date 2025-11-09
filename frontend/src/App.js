import React, { useState, useEffect, useCallback, useRef } from "react";
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
import ReportPage from "./ReportPage";

// --- Custom Notification Component ---
const Notification = ({ message, type, onClose }) => {
  if (!message) return null;

  const baseClasses =
    "notification p-3 rounded-lg shadow-xl mb-4 fixed top-4 right-4 z-50 transition-transform transform duration-500 ease-out";
  const typeClasses =
    {
      error: "bg-red-500 text-white",
      success: "bg-green-500 text-white",
      info: "bg-blue-500 text-white",
    }[type] || "bg-gray-700 text-white";

  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      <div className="flex justify-between items-center">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 font-bold">
          &times;
        </button>
      </div>
    </div>
  );
};

// --- Dashboard Home Component ---
const Dashboard = ({ user, onNavigate, notify }) => {
  const [stats, setStats] = useState({
    interviews_completed: 0,
    average_score: null,
    hours_practiced: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(
          `http://localhost:8000/user-stats/${user.id}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.status === "success") {
            setStats(data.stats);
          }
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

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
    id: "hr-interview", // NEW
    title: "HR Interview", 
    desc: "Practice behavioral and HR questions",
    icon: "👥",
    available: true,
  },
    {
      id: "progress",
      title: "My Progress",
      desc: "Track your interview performance",
      icon: "📊",
      available: true,
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
            onClick={() => {
              if (feature.available) {
                onNavigate(feature.id);
              } else {
                notify("This feature is coming soon!", "info");
              }
            }}
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
          <p className="stat-number">
            {loading ? "..." : stats.interviews_completed}
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Resume Action Hub Component ---
const ResumeActionHub = ({ onNavigate, notify }) => {
  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => onNavigate("home")}>
        ← Back to Dashboard
      </button>

      <div className="resume-action-hub">
        <h2 className="welcome-heading">Resume Uploaded! What's Next?</h2>
        <p className="selection-desc">
          Your resume has been processed. Choose how you'd like to use the
          analysis.
        </p>

        {/* Option 1: View ATS Report */}
        <div
          className="action-card primary-action"
          onClick={() => onNavigate("ats-report")}
        >
          <div className="icon-section">
            <span role="img" aria-label="scanner">
              🔍
            </span>
          </div>
          <div className="text-section">
            <h3 className="card-title">View ATS Scan Report</h3>
            <p className="card-description">
              See your ATS matching score, keyword gaps, and receive suggestions
              for the specified job role.
            </p>
            <button
              className="btn btn-primary large-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("ats-report");
              }}
            >
              Start ATS Scan
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="divider-text">OR</div>

        {/* Option 2: Start Interview */}
        <div
          className="action-card secondary-action"
          onClick={() => onNavigate("interview")}
        >
          <div className="icon-section">
            <span role="img" aria-label="interview">
              🎯
            </span>
          </div>
          <div className="text-section">
            <h3 className="card-title">Begin Mock Interview</h3>
            <p className="card-description">
              Use your uploaded resume and job description to generate highly
              personalized questions.
            </p>
            <button
              className="btn btn-secondary large-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("interview");
              }}
            >
              Begin Interview
            </button>
          </div>
        </div>
         <div className="action-card" onClick={() => onNavigate("hr-interview")}>
    <div className="icon-section">
      <span role="img" aria-label="hr">👥</span>
    </div>
    <div className="text-section">
      <h3 className="card-title">Practice HR Interview</h3>
      <p className="card-description">
        Practice behavioral questions, "Tell me about yourself", 
        career goals, and questions about your achievements.
      </p>
      <button
        className="btn btn-tertiary large-btn"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate("hr-interview");
        }}
      >
        Start HR Practice
      </button>
    </div>
  </div>
</div>
      </div>
  );
};

// --- ATS Report Display Component ---
const ATSReportView = ({ user, onNavigate, notify }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const fetchATSReport = async () => {
      if (!user?.id || hasFetchedRef.current) return;

      hasFetchedRef.current = true;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:8000/ats-report/${user.id}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to fetch ATS report");
        }

        const data = await response.json();
        setReportData(data);
        notify("ATS Report loaded successfully!", "success");
      } catch (error) {
        console.error("Failed to fetch ATS report:", error);
        setError(error.message);
        notify(`Failed to load ATS report: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchATSReport();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading your ATS Report...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData || !reportData.ats_report) {
    return (
      <div className="page-container">
        <button className="back-btn" onClick={() => onNavigate("home")}>
          ← Back to Dashboard
        </button>
        <div className="ats-report-section">
          <h2>No ATS Report Available</h2>
          <p>
            {error ||
              "Please upload a resume with a job description to generate an ATS report."}
          </p>
        </div>
      </div>
    );
  }

  const { ats_report, job_role, upload_date } = reportData;
  const matchScore = ats_report.match_score || 0;

  let scoreAdvice = "";
  let scoreColor = "";

  if (matchScore >= 80) {
    scoreAdvice = "Excellent! Your resume is highly optimized for this role.";
    scoreColor = "#2DCC9F";
  } else if (matchScore >= 60) {
    scoreAdvice =
      "Good match! Consider the suggestions below to improve further.";
    scoreColor = "#79D2FF";
  } else if (matchScore >= 40) {
    scoreAdvice =
      "Moderate match. Review the missing keywords and suggestions carefully.";
    scoreColor = "#FFA500";
  } else {
    scoreAdvice =
      "Low match. Significant improvements needed to align with this role.";
    scoreColor = "#FF7979";
  }

  // Truncate job role if it's too long
  const truncateText = (text, maxLength = 100) => {
    if (!text) return "General Position";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => onNavigate("home")}>
        ← Back to Dashboard
      </button>

      <div className="ats-report-section">
        <h2 className="welcome-heading">🔍 ATS Scan Report</h2>
        <p className="selection-desc">
          Your resume has been analyzed for the role:{" "}
          <strong>{truncateText(job_role, 100)}</strong>
        </p>
        <p
          className="selection-desc"
          style={{ fontSize: "0.9em", color: "#A9B7C7" }}
        >
          Uploaded on: {new Date(upload_date).toLocaleDateString()}
        </p>

        {/* Match Score Display */}
        <div
          style={{
            textAlign: "center",
            margin: "30px 0",
            padding: "30px",
            background: "#243552",
            borderRadius: "12px",
          }}
        >
          <h3 style={{ color: "#79D2FF", marginBottom: "15px" }}>
            Match Score
          </h3>
          <div
            style={{
              fontSize: "4em",
              fontWeight: "bold",
              color: scoreColor,
              marginBottom: "10px",
            }}
          >
            {matchScore}%
          </div>
          <p
            className="score-advice"
            style={{ color: scoreColor, fontWeight: "600" }}
          >
            {scoreAdvice}
          </p>
        </div>

        {/* Report Details */}
        <div className="report-details-container">
          {/* Missing Keywords Card */}
          {ats_report.missing_keywords &&
            ats_report.missing_keywords.length > 0 && (
              <div className="report-card missing-keywords">
                <h3>⚠️ Critical Missing Keywords</h3>
                <ul className="keywords-list">
                  {ats_report.missing_keywords.map((keyword, index) => (
                    <li key={index}>
                      <span
                        className="warning-emoji"
                        role="img"
                        aria-label="warning"
                      >
                        ⚠️
                      </span>
                      {keyword}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Improvement Suggestions Card */}
          {ats_report.suggestions && ats_report.suggestions.length > 0 && (
            <div className="report-card">
              <h3>💡 Improvement Suggestions</h3>
              <ol className="suggestions-list">
                {ats_report.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button
            className="start-interview-btn-report"
            onClick={() => onNavigate("interview")}
          >
            🎯 Start Mock Interview
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Resume Upload Component ---
const ResumeUpload = ({ user, onNavigate, notify }) => {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (
      selectedFile &&
      ![
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(selectedFile.type)
    ) {
      notify(
        "Unsupported file type. Please select a PDF or DOCX file.",
        "error"
      );
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) {
      notify("Please select a resume file first!", "error");
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      console.log("Upload successful:", data);
      setUploadSuccess(true);
      notify("Resume uploaded and analyzed successfully!", "success");
      setTimeout(() => onNavigate("action-hub"), 2000);
    } catch (error) {
      console.error("Upload failed:", error);
      notify(`Upload failed: ${error.message}`, "error");
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
            accept=".pdf,.docx"
            onChange={handleFileChange}
            id="resume-input"
            className="file-input"
          />
          <label htmlFor="resume-input" className="file-label">
            <span className="upload-icon">☁️</span>
            <span>
              {file ? file.name : "Click to select resume (PDF, DOCX)"}
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
const InterviewSession = ({ user, onNavigate, config, notify }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(config?.duration * 60 || 1800);
  const [sessionId, setSessionId] = useState(null);
  const [resumeId, setResumeId] = useState(null);
  const [questionsHistory, setQuestionsHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions] = useState(10);
  const initializedRef = useRef(false);

  // Generate next question function - defined first
  const generateNextQuestion = useCallback(
    async (currentSessionId, currentResumeId) => {
      try {
        setLoading(true);
        console.log(
          "DEBUG: Generating next question for session:",
          currentSessionId
        );

        const response = await fetch(
          "http://localhost:8000/generate-question/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              session_id: currentSessionId,
              resume_id: currentResumeId,
              previous_questions: questionsHistory.map((q) => q.question),
              current_topic: config?.topics?.[0] || "",
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to generate question");
        }

        const data = await response.json();

        if (data.status === "success" && data.question) {
          const newQuestion = {
            ...data.question,
            message_id: data.message_id,
            number: currentQuestionNumber,
          };

          setCurrentQuestion(newQuestion);
          setQuestionsHistory((prev) => [...prev, newQuestion]);
          console.log("DEBUG: New question generated successfully");
          notify("New personalized question generated!", "info");
        } else {
          const mockQuestion = {
            question:
              "Tell me about your experience with the technologies mentioned in your resume. (Fallback Question)",
            category: "Technical (Fallback)",
            difficulty: config?.level || "medium",
            expected_answer_points: [
              "Technical skills",
              "Project experience",
              "Problem-solving approach",
            ],
          };
          setCurrentQuestion(mockQuestion);
          notify(
            "AI did not return a valid question; using a fallback.",
            "error"
          );
        }
      } catch (error) {
        console.error("Failed to generate question:", error);
        notify(
          `Failed to generate question: ${error.message}. Using a fallback question.`,
          "error"
        );

        // Fallback mock question
        const mockQuestion = {
          question:
            "Tell me about your experience with the technologies mentioned in your resume. (Fallback Question)",
          category: "Technical (Fallback)",
          difficulty: config?.level || "medium",
          expected_answer_points: [
            "Technical skills",
            "Project experience",
            "Problem-solving approach",
          ],
        };
        setCurrentQuestion(mockQuestion);
      } finally {
        setLoading(false);
      }
    },
    [questionsHistory, currentQuestionNumber, config, notify]
  );

  // Initialize interview session 
  const initializeInterviewSession = useCallback(async () => {
    try {
      setLoading(true);
      console.log("DEBUG: Starting session creation for user:", user?.id);

      const response = await fetch(
        "http://localhost:8000/create-interview-session/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user?.id,
            difficulty: config?.level || "medium",
            duration: config?.duration || 30,
            topics: config?.topics || [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("DEBUG: Session creation failed:", errorData);

        if (errorData.detail && errorData.detail.includes("No resume found")) {
          notify(
            "You must upload a resume before starting an interview. Redirecting...",
            "error"
          );
          setTimeout(() => onNavigate("resume"), 2000);
          return;
        }
        throw new Error(errorData.detail || "Failed to create session");
      }

      const data = await response.json();
      console.log("DEBUG: Session created successfully:", data);

      if (data.status === "success") {
        setSessionId(data.session_id);
        setResumeId(data.resume_id);
        await generateNextQuestion(data.session_id, data.resume_id);
      } else {
        throw new Error(data.message || "Failed to create session");
      }
    } catch (error) {
      console.error("Failed to initialize session:", error);
      notify(`Failed to start interview session: ${error.message}`, "error");

      if (!error.message.includes("resume")) {
        setTimeout(() => onNavigate("home"), 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [user, config, notify, onNavigate, generateNextQuestion]);

  // Submit answer function
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      notify("Please provide an answer before submitting!", "error");
      return;
    }

    if (!sessionId || !currentQuestion) {
      notify(
        "Session not properly initialized or question is missing!",
        "error"
      );
      return;
    }

    try {
      setLoading(true);

      // Submit answer to backend
      const response = await fetch("http://localhost:8000/submit-answer/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId, 
          question: currentQuestion.question,
          answer: answer,
          confidence_score: null,
          facial_emotion: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to submit answer");
      }
      const result = await response.json();
      console.log("Answer submitted successfully:", result);
      notify("Answer submitted successfully!", "success");

      // Move to next question or finish
      if (currentQuestionNumber < totalQuestions) {
        setCurrentQuestionNumber((prev) => prev + 1);
        setAnswer("");
        await generateNextQuestion(sessionId, resumeId);
      } else {
        notify("Interview completed! Redirecting to results...", "info");
        onNavigate("report", { sessionId });
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      notify(
        `Failed to submit answer: ${error.message}. Please try again.`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Initialize interview session on component mount
  useEffect(() => {
    if (user?.id && !initializedRef.current) {
      console.log("DEBUG: Initializing interview session...");
      initializedRef.current = true; 
      initializeInterviewSession();
    }
  }, [user?.id]);

  // Timer effect

  useEffect(() => {
    if (!sessionId) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          notify(
            "Time's up! Your interview has ended. Redirecting to results...",
            "info"
          );
          onNavigate("progress");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onNavigate, sessionId, notify]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading && !currentQuestion) {
    return (
      <div className="interview-session-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Initializing your AI interview session...</p>
        </div>
      </div>
    );
  }

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
                {currentQuestionNumber} / {totalQuestions}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Category</span>
              <span className="stat-value">
                {currentQuestion?.category || "Loading..."}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Difficulty</span>
              <span className="stat-value">
                {currentQuestion?.difficulty || config?.level || "Medium"}
              </span>
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
                width: `${(currentQuestionNumber / totalQuestions) * 100}%`,
              }}
            ></div>
          </div>

          {/* Question box */}
          <div className="question-box">
            <div className="question-header">
              <span className="question-number">
                Question {currentQuestionNumber}
              </span>
              <span className="question-category">
                {currentQuestion?.category || "Technical"}
              </span>
            </div>
            <div className="question-text">
              {currentQuestion?.question || "Loading question..."}
            </div>

            {/* Expected answer points */}
            {currentQuestion?.expected_answer_points && (
              <div className="expected-answer-hint">
                <details>
                  <summary>💡 What we're looking for (click to expand)</summary>
                  <ul>
                    {currentQuestion.expected_answer_points.map(
                      (point, index) => (
                        <li key={index}>{point}</li>
                      )
                    )}
                  </ul>
                </details>
              </div>
            )}
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
              disabled={loading}
            />
            <div className="answer-meta">
              <span className="char-count">{answer.length} characters</span>
              {loading && <span className="loading-text">Processing...</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="interview-actions">
            <button
              className="submit-answer-btn"
              onClick={handleSubmitAnswer}
              disabled={!answer.trim() || loading}
            >
              {loading ? "Processing..." : `Submit & Next →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Progress Tracker Component ---
const ProgressTracker = ({ user, onNavigate }) => {
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(
          `http://localhost:8000/interview-history/${user.id}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.status === "success") {
            setInterviewHistory(data.history);
          }
        }
      } catch (error) {
        console.error("Failed to fetch interview history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id]);

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
        <h2>Your Progress</h2>

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
            {loading ? (
              <p style={{ textAlign: "center", color: "#A9B7C7" }}>
                Loading...
              </p>
            ) : interviewHistory.length === 0 ? (
              <p style={{ textAlign: "center", color: "#A9B7C7" }}>
                No interviews completed yet. Start your first interview!
              </p>
            ) : (
              interviewHistory.map((interview, idx) => (
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
                    {interview.score ? `${interview.score}%` : "--"}
                  </div>
                </div>
              ))
            )}
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

// --- HR Interview Setup Component ---
const HRInterviewSetup = ({ user, onNavigate }) => {
  const [level, setLevel] = useState("medium");
  const [duration, setDuration] = useState(30);

  const startHRInterview = async () => {
    try {
      // First, get the user's latest resume
      const resumeResponse = await fetch(
        `http://localhost:8000/ats-report/${user.id}`
      );
      
      if (!resumeResponse.ok) {
        throw new Error("No resume found. Please upload a resume first.");
      }

      const resumeData = await resumeResponse.json();
      
      // Create HR interview session
      const sessionResponse = await fetch(
        "http://localhost:8000/create-hr-interview/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            resume_id: resumeData.resume_id,
            job_description: resumeData.job_role || "",
          }),
        }
      );

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.detail || "Failed to create HR interview");
      }

      const sessionData = await sessionResponse.json();
      
      onNavigate("hr-interview-session", {
        sessionId: sessionData.session_id,
        resumeId: sessionData.resume_id, 
        level,
        duration,
        sessionType: "hr"
      });
      
    } catch (error) {
      alert(`Failed to start HR interview: ${error.message}`);
    }
  };

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => onNavigate("home")}>
        ← Back to Dashboard
      </button>

      <div className="interview-setup">
        <h2>👥 Configure HR Interview</h2>
        <p className="selection-desc">
          Practice common HR questions like "Tell me about yourself", 
          "Where do you see yourself in 5 years?", and behavioral questions
          based on your resume achievements and extracurricular activities.
        </p>

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
          <h3>Focus Areas</h3>
          <div className="hr-topics-info">
            <p>HR interviews will cover:</p>
            <ul>
              <li>Self-introduction & background</li>
              <li>Company knowledge & motivation</li>
              <li>Career goals & aspirations</li>
              <li>Behavioral & situational questions</li>
              <li>Achievements & extracurricular activities</li>
              <li>Leadership & positions of responsibility</li>
            </ul>
          </div>
        </div>

        <button className="start-interview-btn" onClick={startHRInterview}>
          👥 Start HR Interview
        </button>
      </div>
    </div>
  );
};

// --- HR Interview Session Component ---
const HRInterviewSession = ({ user, onNavigate, config, notify }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(config?.duration * 60 || 1800);
  const [sessionId, setSessionId] = useState(config?.sessionId);
  const [questionsHistory, setQuestionsHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions] = useState(8);
  const [evaluation, setEvaluation] = useState(null);

  // Generate next HR question
  const generateNextHRQuestion = useCallback(async () => {
    try {
      setLoading(true);
      setEvaluation(null);

      const response = await fetch(
        "http://localhost:8000/generate-hr-question/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            resume_id: config?.resumeId,
            previous_questions: questionsHistory.map((q) => q.question),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate HR question");
      }

      const data = await response.json();

      if (data.status === "success" && data.question) {
        const newQuestion = {
          ...data.question,
          message_id: data.message_id,
          number: currentQuestionNumber,
        };

        setCurrentQuestion(newQuestion);
        setQuestionsHistory((prev) => [...prev, newQuestion]);
        notify("New HR question generated!", "info");
      } else {
        throw new Error("No question received from server");
      }
    } catch (error) {
      console.error("Failed to generate HR question:", error);
      notify(`Failed to generate question: ${error.message}`, "error");
      
      // Fallback HR questions
      const fallbackQuestions = [
        "Can you walk me through your resume and highlight key experiences that make you a good fit for this role?",
        "What do you know about our company and why do you want to work here?",
        "Where do you see yourself in the next 5 years?",
        "Tell me about a time you faced a significant challenge and how you overcame it.",
        "What achievement are you most proud of and why?",
        "How do your extracurricular activities contribute to your professional development?",
        "Describe a situation where you had to take leadership responsibility. What did you learn?",
        "What motivates you to perform at your best?"
      ];
      
      const fallbackQuestion = fallbackQuestions[currentQuestionNumber - 1] || 
        "Tell me about yourself and your career journey.";
      
      setCurrentQuestion({
        question: fallbackQuestion,
        category: "HR",
        difficulty: config?.level || "medium",
        purpose: "Assess your communication and self-awareness"
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId, questionsHistory, currentQuestionNumber, config, notify]);

  // Submit HR answer
  const handleSubmitHRAnswer = async () => {
    if (!answer.trim()) {
      notify("Please provide an answer before submitting!", "error");
      return;
    }

    if (!sessionId || !currentQuestion) {
      notify("Session not properly initialized!", "error");
      return;
    }

    try {
      setLoading(true);

      // Submit answer to backend
      const response = await fetch("http://localhost:8000/submit-hr-answer/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          question: currentQuestion.question,
          answer: answer,
          message_id: currentQuestion.message_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to submit answer");
      }

      const result = await response.json();
      console.log("HR Answer submitted successfully:", result);
      
      // Show evaluation if available
      if (result.evaluation) {
        setEvaluation(result.evaluation);
        notify("Answer evaluated successfully!", "success");
      } else {
        notify("Answer submitted successfully!", "success");
      }

      // Move to next question or finish
      if (currentQuestionNumber < totalQuestions) {
        setCurrentQuestionNumber((prev) => prev + 1);
        setAnswer("");
        setEvaluation(null);
        setTimeout(() => generateNextHRQuestion(), 1000);
      } else {
        notify("HR Interview completed! Generating report...", "info");
        
        // Generate final report
        const reportResponse = await fetch(
          `http://localhost:8000/complete-hr-interview/${sessionId}`,
          { method: "POST" }
        );
        
        if (reportResponse.ok) {
          onNavigate("hr-report", { sessionId });
        } else {
          onNavigate("home");
        }
      }
    } catch (error) {
      console.error("Failed to submit HR answer:", error);
      notify(`Failed to submit answer: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!sessionId) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          notify("Time's up! Your HR interview has ended.", "info");
          onNavigate("home");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onNavigate, sessionId, notify]);

  // Initialize HR interview
  useEffect(() => {
    if (sessionId && currentQuestionNumber === 1 && !currentQuestion) {
      generateNextHRQuestion();
    }
  }, [sessionId, currentQuestionNumber, currentQuestion, generateNextHRQuestion]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading && !currentQuestion) {
    return (
      <div className="interview-session-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Initializing your HR interview session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-session-container hr-interview">
      {/* Header with timer and progress */}
      <div className="interview-header">
        <div className="interview-header-left">
          <h2>👥 HR Mock Interview</h2>
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
                {currentQuestionNumber} / {totalQuestions}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Category</span>
              <span className="stat-value">
                {currentQuestion?.category || "HR"}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Purpose</span>
              <span className="stat-value purpose">
                {currentQuestion?.purpose || "Communication Assessment"}
              </span>
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
                width: `${(currentQuestionNumber / totalQuestions) * 100}%`,
              }}
            ></div>
          </div>

          {/* Question box */}
          <div className="question-box hr-question">
            <div className="question-header">
              <span className="question-number">
                HR Question {currentQuestionNumber}
              </span>
              <span className="question-category">
                {currentQuestion?.category || "Behavioral"}
              </span>
            </div>
            <div className="question-text">
              {currentQuestion?.question || "Loading HR question..."}
            </div>

            {/* Question purpose */}
            {currentQuestion?.purpose && (
              <div className="question-purpose">
                <span className="purpose-icon">🎯</span>
                <span>{currentQuestion.purpose}</span>
              </div>
            )}
          </div>

          {/* Evaluation display */}
          {evaluation && (
            <div className="evaluation-section">
              <h4>📊 AI Evaluation</h4>
              <div className="evaluation-scores">
                <div className="eval-score">
                  <span>Relevance: </span>
                  <strong>{evaluation.relevance_score}%</strong>
                </div>
                <div className="eval-score">
                  <span>Communication: </span>
                  <strong>{evaluation.communication_score}%</strong>
                </div>
              </div>
              <div className="evaluation-feedback">
                <p><strong>Feedback:</strong> {evaluation.overall_feedback}</p>
              </div>
            </div>
          )}

          {/* Answer box */}
          <div className="answer-section">
            <label className="answer-label">Your Answer:</label>
            <textarea
              className="answer-textarea"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here... Focus on clear communication and specific examples."
              rows={10}
              disabled={loading}
            />
            <div className="answer-meta">
              <span className="char-count">{answer.length} characters</span>
              {loading && <span className="loading-text">Processing...</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="interview-actions">
            <button
              className="submit-answer-btn"
              onClick={handleSubmitHRAnswer}
              disabled={!answer.trim() || loading}
            >
              {loading ? "Processing..." : `Submit & Next →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- HR Report Component ---
const HRReportPage = ({ user, sessionId, onNavigate }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHRReport = async () => {
      if (!sessionId) return;

      try {
        const response = await fetch(
          `http://localhost:8000/hr-interview-session/${sessionId}`
        );

        if (response.ok) {
          const data = await response.json();
          setReportData(data);
        }
      } catch (error) {
        console.error("Failed to fetch HR report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHRReport();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="report-container">
        <div className="report-loading">
          <div className="loading-spinner"></div>
          <h2>Generating Your HR Interview Report...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="report-container">
      <div className="report-header">
        <button className="back-btn" onClick={() => onNavigate("home")}>
          ← Back to Dashboard
        </button>
        <h1>👥 HR Interview Report</h1>
      </div>

      <div className="report-content">
        <div className="score-section">
          <h2>HR Interview Completed!</h2>
          <p>You've successfully completed the HR mock interview.</p>
          
          {reportData && (
            <div className="session-details">
              <h3>Session Details</h3>
              <p><strong>Questions Asked:</strong> {reportData.messages?.filter(m => m.role === 'ai').length || 0}</p>
              <p><strong>Your Answers:</strong> {reportData.messages?.filter(m => m.role === 'user').length || 0}</p>
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button 
            className="btn-primary" 
            onClick={() => onNavigate("hr-interview")}
          >
            🎯 Practice Another HR Interview
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => onNavigate("interview")}
          >
            💻 Try Technical Interview
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [currentPage, setCurrentPage] = useState("home");
  const [interviewConfig, setInterviewConfig] = useState(null);
  const [notification, setNotification] = useState(null);
  const [latestSessionId, setLatestSessionId] = useState(null);

  const notify = (message, type = "info") => {
    setNotification({ message, type });
    // Clear notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  const handleNavigation = (page, config = null) => {
    setCurrentPage(page);
    if (config) {
      setInterviewConfig(config);
      // Store sessionId separately when navigating to report
      if (config.sessionId) {
        setLatestSessionId(config.sessionId);
      }
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
    const props = {
      user,
      onNavigate: handleNavigation,
      notify,
    };

    switch (currentPage) {
      case "home":
        return <Dashboard {...props} />;
      case "resume":
        return <ResumeUpload {...props} />;
      case "action-hub":
        return <ResumeActionHub {...props} />;
      case "ats-report": // ADD THIS CASE
        return <ATSReportView {...props} />;
      case "interview":
        return <InterviewSetup {...props} />;
      case "interview-session":
        return <InterviewSession {...props} config={interviewConfig} />;
      case "hr-interview": // NEW
        return <HRInterviewSetup {...props} />;
      case "hr-interview-session": // NEW
        return <HRInterviewSession {...props} config={interviewConfig} />;
      case "hr-report": // NEW
        return <HRReportPage {...props} sessionId={interviewConfig?.sessionId} />;
      case "report":
        return (
          <ReportPage
            {...props}
            sessionId={interviewConfig?.sessionId || latestSessionId}
          />
        );
      case "progress":
        return <ProgressTracker {...props} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  return (
    <div className="app">
      <Notification
        message={notification?.message}
        type={notification?.type}
        onClose={() => setNotification(null)}
      />
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
              onClick={() => setCurrentPage("report")}
              className={currentPage === "report" ? "active" : ""}
            >
              📋 Report
            </button>
            <button
              onClick={() => setCurrentPage("progress")}
              className={currentPage === "progress" ? "active" : ""}
            >
            👥 HR
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
