import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { recruiterRegister, recruiterLogin, saveAuth } from "../../components/recruiterApi";

export default function RecruiterRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
    phone: "",
  });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    const { error } = await recruiterRegister(formData);

    if (error) {
      setMessage({ text: error, type: "error" });
      setLoading(false);
      return;
    }

    // Auto-login upon registration
    const loginRes = await recruiterLogin({
      email: formData.email,
      password: formData.password,
    });

    if (loginRes.data) {
      saveAuth(loginRes.data.token, loginRes.data.recruiter);
      setMessage({ text: "Account created successfully! Redirecting…", type: "success" });
      setTimeout(() => navigate("/recruiter/dashboard"), 800);
    } else {
      setMessage({ text: "Account created! Please sign in.", type: "success" });
      setTimeout(() => navigate("/recruiter/login"), 1000);
    }
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
            ✦ Recruiter Onboarding
          </div>
          <h2>Join top companies hiring with AI</h2>
          <p>
            Create your recruiter profile to post jobs, screen talent with AI matching,
            and hire high-performing students.
          </p>

          <div className="auth-panel-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">🎯</div>
              <span>Targeted campus candidate matching</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">📊</div>
              <span>Transparent application tracking pipeline</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">🔒</div>
              <span>Secure, isolated private company portal</span>
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
          <h1>Register as Recruiter</h1>
          <p>Create a company account to start posting placement opportunities.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full name</label>
              <input
                id="name"
                className="form-input"
                type="text"
                name="name"
                placeholder="e.g. Sarah Jenkins"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="company">Company name</label>
              <input
                id="company"
                className="form-input"
                type="text"
                name="company"
                placeholder="e.g. Acme Corp / TechCorp"
                value={formData.company}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Work email address</label>
              <input
                id="email"
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
              <label className="form-label" htmlFor="phone">Phone number (optional)</label>
              <input
                id="phone"
                className="form-input"
                type="tel"
                name="phone"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
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
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  minLength={6}
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
              {loading ? "Creating Account…" : "Create Recruiter Account →"}
            </button>
          </form>

          <div className="auth-link-row" style={{ marginTop: 20 }}>
            Already have a recruiter account?{" "}
            <span onClick={() => navigate("/recruiter/login")}>Sign in here</span>
          </div>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Are you a student?{" "}
              <strong
                style={{ color: "var(--teal)", cursor: "pointer" }}
                onClick={() => navigate("/register")}
              >
                Register as Student →
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
