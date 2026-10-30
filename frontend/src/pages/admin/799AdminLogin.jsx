import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin, saveAuth } from "../../components/adminApi";

export default function AdminLogin() {
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

    const { data, error } = await adminLogin(formData);

    if (error || !data) {
      setMessage({ text: error || "Invalid email or password.", type: "error" });
      setLoading(false);
      return;
    }

    // Store token + admin profile the same way the other portals do.
    saveAuth(data.token, data.admin);
    setMessage({ text: "Login successful! Redirecting…", type: "success" });
    setTimeout(() => navigate("/admin/dashboard"), 700);
  };

  return (
    <div className="auth-page">
      {/* ── Left branding panel ── */}
      <div className="auth-panel">
        <div className="auth-panel-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span>Career</span>AI
        </div>

        <div className="auth-panel-content">
          <div className="badge admin-topbar-badge" style={{ display: "inline-flex", marginBottom: 16 }}>
            ✦ Administrator Portal
          </div>
          <h2>Platform-wide oversight and control</h2>
          <p>
            Monitor students, recruiters, job listings, applications, and AI
            placement predictions across the entire CareerAI platform from a
            single secure dashboard.
          </p>

          <div className="auth-panel-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">📊</div>
              <span>Real-time platform statistics and analytics</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">👥</div>
              <span>Manage students and recruiters, suspend accounts</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">🛡️</div>
              <span>Role-restricted access — admin credentials only</span>
            </div>
          </div>
        </div>

        <div className="auth-panel-footer">
          © 2026 CareerAI · Admin Portal
        </div>
      </div>

      {/* ── Right form side ── */}
      <div className="auth-form-side">
        <div className="auth-form-card">
          <h1>Admin Sign In</h1>
          <p>Access the platform administration dashboard.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">Admin email address</label>
              <input
                id="admin-email"
                className="form-input"
                type="email"
                name="email"
                placeholder="admin@careerai.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">Password</label>
              <div className="password-wrapper">
                <input
                  id="admin-password"
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
              {loading ? "Signing in…" : "Sign In to Admin Portal →"}
            </button>
          </form>

          <div className="auth-link-row" style={{ marginTop: 20 }}>
            Admin accounts are provisioned by the platform — there is no public registration.
          </div>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Are you a student?{" "}
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
