import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage]   = useState({ text: "", type: "" });
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const response = await fetch("http://localhost:5000/api/students/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("student", JSON.stringify(data.student));
        setMessage({ text: "Login successful! Redirecting…", type: "success" });
        setTimeout(() => navigate("/dashboard"), 800);
      } else {
        setMessage({
          text: `${data.message}${data.error ? ` — ${data.error}` : ""}`,
          type: "error",
        });
      }
    } catch {
      setMessage({ text: "Cannot connect to the server. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── Left branding panel ── */}
      <div className="auth-panel">
        <div className="auth-panel-logo">
          <span>Career</span>AI
        </div>

        <div className="auth-panel-content">
          <h2>Your AI-powered career platform</h2>
          <p>
            Connect with top companies, get AI-matched job recommendations,
            and track your placement journey — all in one place.
          </p>

          <div className="auth-panel-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">🤖</div>
              <span>AI Placement Prediction</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">🎯</div>
              <span>Smart Job Matching</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">📄</div>
              <span>Resume Analysis &amp; NLP Skill Extraction</span>
            </div>
          </div>
        </div>

        <div className="auth-panel-footer">
          © 2026 CareerAI · Academic Project
        </div>
      </div>

      {/* ── Right form side ── */}
      <div className="auth-form-side">
        <div className="auth-form-card">

          <h1>Welcome back</h1>
          <p>Sign in to continue your placement journey.</p>

          <form className="auth-form" onSubmit={handleSubmit}>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                className="form-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  className="form-input"
                  type={showPw ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {message.text && (
              <div className={`alert alert-${message.type === "success" ? "success" : "error"}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>

          </form>

          <div className="auth-link-row">
            Don&apos;t have an account?{" "}
            <span onClick={() => navigate("/register")}>Create account</span>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Are you an employer / recruiter?{" "}
              <strong
                style={{ color: "#D97706", cursor: "pointer" }}
                onClick={() => navigate("/recruiter/login")}
              >
                Recruiter Portal →
              </strong>
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
