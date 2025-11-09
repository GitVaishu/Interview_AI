import React, { useState, useEffect } from "react";
import "./ReportPage.css";

const ReportPage = ({ user, sessionId, onNavigate }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:8000/generate-report/${sessionId}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to generate report");
        }

        const data = await response.json();

        if (data.status === "success") {
          setReportData({
            overallScore: data.report.overall_score,
            difficulty: data.report.difficulty,
            topics: data.report.topics,
            duration: data.report.duration,
            questionsAnswered: data.report.questions_answered,
            totalQuestions: data.report.total_questions,
            strengths: data.report.strengths,
            improvements: data.report.improvements,
            categoryScores: data.report.category_scores,
            summary: data.report.summary,
          });
        } else {
          throw new Error("Invalid response format");
        }
      } catch (error) {
        console.error("Failed to fetch report:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="report-container">
        <div className="report-loading">
          <div className="loading-spinner"></div>
          <h2>Generating Your Report...</h2>
          <p>Our AI is analyzing your interview performance</p>
        </div>
      </div>
    );
  }

  if (!reportData || error) {
    return (
      <div className="report-container">
        <div className="report-error">
          <h2>❌ Report Not Available</h2>
          <p>{error || "Unable to generate report. Please try again later."}</p>
          <button className="btn-primary" onClick={() => onNavigate("home")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return "#2DCC9F";
    if (score >= 60) return "#79D2FF";
    if (score >= 40) return "#FFA500";
    return "#FF7979";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  return (
    <div className="report-container">
      {/* Header Section */}
      <div className="report-header">
        <div className="report-header-content">
          <h1>📊 Interview Report</h1>
          <p className="report-subtitle">
            {user?.firstName || "User"}, here's your detailed performance
            analysis
          </p>
        </div>
        <button className="btn-home" onClick={() => onNavigate("home")}>
          🏠 Back to Dashboard
        </button>
      </div>

      {/* Overall Score Card */}
      <div className="score-hero">
        <div className="score-circle">
          <svg viewBox="0 0 200 200" className="score-ring">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#1E293B"
              strokeWidth="20"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={getScoreColor(reportData.overallScore)}
              strokeWidth="20"
              strokeDasharray={`${(reportData.overallScore / 100) * 565} 565`}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              className="score-progress"
            />
          </svg>
          <div className="score-text">
            <div className="score-number">{reportData.overallScore}</div>
            <div className="score-label">
              {getScoreLabel(reportData.overallScore)}
            </div>
          </div>
        </div>

        <div className="score-details">
          <div className="score-detail-item">
            <span className="detail-icon">🎯</span>
            <div>
              <div className="detail-label">Difficulty</div>
              <div className="detail-value">{reportData.difficulty}</div>
            </div>
          </div>
          <div className="score-detail-item">
            <span className="detail-icon">⏱️</span>
            <div>
              <div className="detail-label">Duration</div>
              <div className="detail-value">{reportData.duration}</div>
            </div>
          </div>
          <div className="score-detail-item">
            <span className="detail-icon">✅</span>
            <div>
              <div className="detail-label">Questions Answered</div>
              <div className="detail-value">
                {reportData.questionsAnswered} / {reportData.totalQuestions}
              </div>
            </div>
          </div>
          <div className="score-detail-item">
            <span className="detail-icon">📚</span>
            <div>
              <div className="detail-label">Topics Covered</div>
              <div className="detail-value">{reportData.topics.join(", ")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div className="report-section">
        <h2 className="section-title">📈 Performance by Category</h2>
        <div className="category-scores">
          {reportData.categoryScores.map((item, idx) => (
            <div key={idx} className="category-item">
              <div className="category-header">
                <span className="category-name">{item.category}</span>
                <span
                  className="category-score"
                  style={{ color: getScoreColor(item.score) }}
                >
                  {item.score}%
                </span>
              </div>
              <div className="category-bar">
                <div
                  className="category-fill"
                  style={{
                    width: `${item.score}%`,
                    backgroundColor: getScoreColor(item.score),
                  }}
                >
                  <div className="category-shine"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout for Strengths & Improvements */}
      <div className="report-grid">
        {/* Strengths */}
        <div className="report-section strengths-section">
          <h2 className="section-title">💪 Key Strengths</h2>
          <div className="insights-list">
            {reportData.strengths.map((strength, idx) => (
              <div key={idx} className="insight-item strength-item">
                <span className="insight-icon">✨</span>
                <p>{strength}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="report-section improvements-section">
          <h2 className="section-title">🎯 Areas for Improvement</h2>
          <div className="insights-list">
            {reportData.improvements.map((improvement, idx) => (
              <div key={idx} className="insight-item improvement-item">
                <span className="insight-icon">💡</span>
                <p>{improvement}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="report-actions">
        <button
          className="btn-secondary btn-large"
          onClick={() => onNavigate("progress")}
        >
          📊 View All Progress
        </button>
        <button
          className="btn-primary btn-large"
          onClick={() => onNavigate("interview")}
        >
          🎯 Start New Interview
        </button>
      </div>

      {/* Footer Message */}
      <div className="report-footer">
        <p>
          💡 <strong>Pro Tip:</strong> Review your answers and practice the
          areas marked for improvement to boost your score in the next
          interview!
        </p>
      </div>
    </div>
  );
};

export default ReportPage;
