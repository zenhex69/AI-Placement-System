import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { recruiterLogin, saveAuth } from "../../components/recruiterApi";

export default function RecruiterLogin() {
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

    const { data, error } = await recruiterLogin(formData);

    if (error || !data) {
      setMessage({ text: error || "Invalid email or password.", type: "error" });
      setLoading(false);
      return;
    }

    saveAuth(data.token, data.recruiter);
    setMessage({ text: "Login successful! Redirecting…", type: "success" });
    setTimeout(() => navigate("/recruiter/dashboard"), 700);
  };

  return (
    <div className="auth-page">
      {/* ── Left branding panel ── */}
      <div className="auth-panel">
        <div className="auth-panel-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span>Career</span>AI
        </div>

        <div className="auth-panel-content">
          <div className="badge recruiter-topbar-badge" style={{ display: "inline-flex", marginBottom: 16 }}>
            ✦ Recruiter &amp; Employer Portal
          </div>
          <h2>Find and hire top campus talent</h2>
          <p>
            Publish job openings, discover pre-screened students matched by AI,
            and manage candidate pipelines seamlessly.
          </p>

          <div className="auth-panel-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">📢</div>
              <span>Create and publish company job listings</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">👥</div>
              <span>Review student profiles and applications</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">⚡</div>
              <span>Real-time hiring status pipeline tracking</span>
            </div>
          </div>
        </div>

        <div className="auth-panel-footer">
          © 2026 CareerAI · Recruiter Portal
        </div>
      </div>

      {/* ── Right form side ── */}
      <div className="auth-form-side">
        <div className="auth-form-card">
          <h1>Recruiter Sign In</h1>
          <p>Access your company hiring dashboard and job listings.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="recruiter-email">Work email address</label>
              <input
                id="recruiter-email"
                className="form-input"
                type="email"
                name="email"
                placeholder="recruiter@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="recruiter-password">Password</label>
              <div className="password-wrapper">
                <input
                  id="recruiter-password"
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
                  onClick={() => setShowPw((s) => !s)}
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
              {loading ? "Signing in…" : "Sign In to Recruiter Portal →"}
            </button>
          </form>

          <div className="auth-link-row" style={{ marginTop: 20 }}>
            Don&apos;t have a recruiter account?{" "}
            <span onClick={() => navigate("/recruiter/register")}>Register company</span>
          </div>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Are you a student looking for jobs?{" "}
              <strong
                style={{ color: "var(--teal)", cursor: "pointer" }}
                onClick={() => navigate("/login")}
              >
                Student Login →
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
