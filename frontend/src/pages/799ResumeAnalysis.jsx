import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/799Layout";

/* ── Icons ── */
const Icon = {
  Upload: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  FileText: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Check: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
    </svg>
  ),
  RefreshCw: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
};

export default function ResumeAnalysis() {
  const navigate    = useNavigate();
  const fileInputRef = useRef(null);

  const [file,      setFile]      = useState(null);
  const [analysis,  setAnalysis]  = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const [message,   setMessage]   = useState({ text: "", type: "" });

  /* Validate and set file */
  const processFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setMessage({ text: "Please select a PDF file.", type: "error" });
      setFile(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setMessage({ text: "File size must be less than 5 MB.", type: "error" });
      setFile(null);
      return;
    }
    setFile(f);
    setAnalysis(null);
    setMessage({ text: "", type: "" });
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  /* Drag & drop */
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  /* Analyze */
  const analyzeResume = async () => {
    if (!file) {
      setMessage({ text: "Please select a resume first.", type: "error" });
      return;
    }

    setAnalyzing(true);
    setMessage({ text: "", type: "" });
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);   /* field name matches backend */

      const res = await fetch("http://localhost:5000/api/resume/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Resume analysis failed.");

      setAnalysis(data);
      setMessage({ text: "Resume analyzed successfully!", type: "success" });

      /* Save extracted skills to student MongoDB profile */
      if (data.skills?.length > 0) {
        const saved = localStorage.getItem("student");
        if (saved) {
          const student = JSON.parse(saved);
          try {
            const skillsRes = await fetch(
              `http://localhost:5000/api/students/${student._id}/skills`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skills: data.skills }),
              }
            );
            if (skillsRes.ok) {
              const { student: updated } = await skillsRes.json();
              localStorage.setItem("student", JSON.stringify(updated));
              setMessage({ text: "Resume analyzed and skills saved to your profile!", type: "success" });
            }
          } catch { /* saving skills is non-critical */ }
        }
      }
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setMessage({ text: "", type: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const scoreLabel = (n) =>
    n >= 75 ? "Strong Profile" : n >= 50 ? "Good Profile" : "Needs Improvement";

  return (
    <Layout pageTitle="Resume Analysis">
      <div className="page-container">

        {/* ── Header ── */}
        <div className="page-header">
          <p className="page-label">AI Career Tools</p>
          <h1>Resume Analysis</h1>
          <p>
            Upload your PDF resume and let CareerAI extract your profile,
            detect technical skills, and score your profile strength.
          </p>
        </div>

        <div className="resume-layout">

          {/* ── Upload zone (shown when no analysis yet) ── */}
          {!analysis && (
            <div
              className={`upload-zone${dragOver ? " drag-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              aria-label="Upload resume PDF"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              <div className="upload-zone-icon">
                <Icon.Upload />
              </div>

              <h3>Upload Your Resume</h3>
              <p>
                {dragOver
                  ? "Drop your PDF here…"
                  : "Click to browse or drag and drop your PDF resume here"}
              </p>

              {file ? (
                <div
                  className="selected-file-row"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon.FileText />
                  <span>{file.name}</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : (
                <p className="upload-zone-hint">PDF only · Max 5 MB</p>
              )}
            </div>
          )}

          {/* Alert */}
          {message.text && (
            <div className={`alert alert-${message.type === "success" ? "success" : "error"}`}>
              {message.text}
            </div>
          )}

          {/* Action buttons */}
          {!analysis && (
            <button
              className="btn btn-primary btn-lg"
              onClick={analyzeResume}
              disabled={analyzing || !file}
              style={{ width: "fit-content" }}
            >
              {analyzing ? "Analysing…" : "Analyze Resume →"}
            </button>
          )}

          {analysis && (
            <div
              style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleReset}
              >
                <Icon.RefreshCw /> Analyze another resume
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/jobs")}
              >
                Find Matching Jobs <Icon.ArrowRight />
              </button>
            </div>
          )}

          {/* ── Results ── */}
          {analysis && (
            <>
              {/* Candidate info */}
              <div className="resume-result-card">
                <p className="page-label" style={{ marginBottom: 4 }}>Profile Information</p>
                <h3>Candidate Details</h3>
                <div className="resume-profile-grid">
                  {[
                    ["Name",  analysis.candidate?.name  || "Not detected"],
                    ["Email", analysis.candidate?.email || "Not detected"],
                    ["Phone", analysis.candidate?.phone || "Not detected"],
                  ].map(([label, val]) => (
                    <div className="resume-info-box" key={label}>
                      <span>{label}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills + Score side by side */}
              <div className="resume-results-grid">

                <div className="resume-result-card">
                  <p className="page-label" style={{ marginBottom: 4 }}>NLP Analysis</p>
                  <h3>Detected Skills</h3>
                  <p>Technical skills identified from your resume.</p>

                  {analysis.skills?.length > 0 ? (
                    <div className="detected-skills-grid">
                      {analysis.skills.map((skill, i) => (
                        <span className="skill-detected" key={i}>
                          <Icon.Check /> {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                      No recognized technical skills detected.
                    </p>
                  )}
                </div>

                <div className="resume-result-card">
                  <p className="page-label" style={{ marginBottom: 4 }}>AI Analysis</p>
                  <h3>Profile Strength</h3>
                  <p>Based on detected content and skill count.</p>

                  <div className="resume-score-display">
                    <span className="resume-score-number">{analysis.profileScore}%</span>
                    <span className="resume-score-label">{scoreLabel(analysis.profileScore)}</span>
                  </div>

                  <div className="progress-bar" style={{ marginBottom: 14 }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${analysis.profileScore}%` }}
                    />
                  </div>

                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Your resume contains{" "}
                    <strong>{analysis.skills?.length ?? 0}</strong> recognized
                    technical skill{analysis.skills?.length !== 1 ? "s" : ""}.
                  </p>
                </div>

              </div>

              {/* Education */}
              {analysis.education && (
                <div className="resume-result-card">
                  <p className="page-label" style={{ marginBottom: 4 }}>Education</p>
                  <h3>Education</h3>
                  <div className="resume-extracted-text">{analysis.education}</div>
                </div>
              )}

              {/* Experience */}
              {analysis.experience && (
                <div className="resume-result-card">
                  <p className="page-label" style={{ marginBottom: 4 }}>Experience</p>
                  <h3>Work Experience</h3>
                  <div className="resume-extracted-text">{analysis.experience}</div>
                </div>
              )}

              {/* Projects */}
              {analysis.projects && (
                <div className="resume-result-card">
                  <p className="page-label" style={{ marginBottom: 4 }}>Projects</p>
                  <h3>Projects</h3>
                  <div className="resume-extracted-text">{analysis.projects}</div>
                </div>
              )}

              {/* Final CTA */}
              <div className="resume-final-action">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => navigate("/jobs")}
                >
                  🎯 Find Jobs Matching My Skills →
                </button>
              </div>

            </>
          )}

        </div>

      </div>
    </Layout>
  );
}
