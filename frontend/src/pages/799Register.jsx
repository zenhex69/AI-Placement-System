import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    college: "",
    degree: "BTech",
    branch: "",
    cgpa: "",
    skills: "",
    projects: "",
    experience: "",
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

    try {
      const response = await fetch("http://localhost:5000/api/students/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          cgpa: Number(formData.cgpa),
          skills: formData.skills.split(",").map(s => s.trim()).filter(Boolean),
          projects: formData.projects.split(",").map(p => p.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: "Account created! Redirecting to login…", type: "success" });
        setFormData({
          name: "", email: "", password: "", phone: "", college: "",
          degree: "BTech", branch: "", cgpa: "", skills: "", projects: "", experience: "",
        });
        setTimeout(() => navigate("/login"), 1200);
      } else {
        setMessage({ text: data.message || "Registration failed.", type: "error" });
      }
    } catch {
      setMessage({ text: "Cannot connect to the server. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ alignItems: "flex-start" }}>

      {/* ── Left branding panel ── */}
      <div className="auth-panel" style={{ minHeight: "100vh" }}>
        <div className="auth-panel-logo">
          <span>Career</span>AI
        </div>

        <div className="auth-panel-content">
          <h2>Start your placement journey today</h2>
          <p>
            Create your profile, upload your resume, get AI predictions, and
            discover jobs matched to your skills.
          </p>

          <div className="auth-panel-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">📊</div>
              <span>Placement Probability Prediction</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">🔍</div>
              <span>NLP-powered Resume Parsing</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">💼</div>
              <span>Skill-based Job Recommendations</span>
            </div>
          </div>
        </div>

        <div className="auth-panel-footer">
          © 2026 CareerAI · Academic Project
        </div>
      </div>

      {/* ── Right form side ── */}
      <div className="auth-form-side" style={{ alignItems: "flex-start", paddingTop: 44 }}>
        <div className="auth-form-card" style={{ maxWidth: 560 }}>

          <h1>Create your account</h1>
          <p>Join CareerAI and let AI supercharge your placement journey.</p>

          <form className="auth-form" onSubmit={handleSubmit}>

            {/* Row 1: Name + Email */}
            <div className="auth-form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name <span style={{color:"var(--error)"}}>*</span></label>
                <input id="name" className="form-input" type="text" name="name"
                  placeholder="Parth Shah" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email <span style={{color:"var(--error)"}}>*</span></label>
                <input id="reg-email" className="form-input" type="email" name="email"
                  placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
              </div>
            </div>

            {/* Row 2: Password + Phone */}
            <div className="auth-form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password <span style={{color:"var(--error)"}}>*</span></label>
                <div className="password-wrapper">
                  <input id="reg-password" className="form-input"
                    type={showPw ? "text" : "password"} name="password"
                    placeholder="Min. 6 characters" value={formData.password}
                    onChange={handleChange} required />
                  <button type="button" className="password-toggle"
                    onClick={() => setShowPw(s => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Phone</label>
                <input id="phone" className="form-input" type="text" name="phone"
                  placeholder="+91 98765 43210" value={formData.phone} onChange={handleChange} />
              </div>
            </div>

            {/* College */}
            <div className="form-group">
              <label className="form-label" htmlFor="college">College / University</label>
              <input id="college" className="form-input" type="text" name="college"
                placeholder="e.g. DAIICT, Gandhinagar" value={formData.college} onChange={handleChange} />
            </div>

            {/* Row 3: Degree + Branch + CGPA */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="degree">Degree</label>
                <select id="degree" className="form-select form-input" name="degree"
                  value={formData.degree} onChange={handleChange}>
                  <option value="BTech">BTech</option>
                  <option value="BE">BE</option>
                  <option value="BCA">BCA</option>
                  <option value="MCA">MCA</option>
                  <option value="MTech">MTech</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="branch">Branch</label>
                <input id="branch" className="form-input" type="text" name="branch"
                  placeholder="e.g. CSE" value={formData.branch} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cgpa">CGPA</label>
                <input id="cgpa" className="form-input" type="number" name="cgpa"
                  placeholder="8.5" min="0" max="10" step="0.01"
                  value={formData.cgpa} onChange={handleChange} />
              </div>
            </div>

            {/* Skills */}
            <div className="form-group">
              <label className="form-label" htmlFor="skills">Technical Skills</label>
              <input id="skills" className="form-input" type="text" name="skills"
                placeholder="React, Node.js, Python, SQL (comma-separated)"
                value={formData.skills} onChange={handleChange} />
            </div>

            {/* Projects */}
            <div className="form-group">
              <label className="form-label" htmlFor="projects">Projects</label>
              <input id="projects" className="form-input" type="text" name="projects"
                placeholder="E-commerce App, Chat Bot, ML Model (comma-separated)"
                value={formData.projects} onChange={handleChange} />
            </div>

            {/* Experience */}
            <div className="form-group">
              <label className="form-label" htmlFor="experience">Experience / Internships</label>
              <input id="experience" className="form-input" type="text" name="experience"
                placeholder="e.g. 6-month internship at XYZ Tech"
                value={formData.experience} onChange={handleChange} />
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
              {loading ? "Creating account…" : "Create Account →"}
            </button>

          </form>

          <div className="auth-link-row">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>Sign in</span>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Are you an employer / recruiter?{" "}
              <strong
                style={{ color: "#D97706", cursor: "pointer" }}
                onClick={() => navigate("/recruiter/register")}
              >
                Register as Recruiter →
              </strong>
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
