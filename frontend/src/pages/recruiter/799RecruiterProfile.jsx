import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RecruiterLayout from "../../components/799RecruiterLayout";
import {
  getToken,
  getRecruiter,
  saveAuth,
  recruiterMe,
  updateRecruiterProfile,
} from "../../components/recruiterApi";

/**
 * Company Profile page (Option A).
 *
 * "Company management" is implemented as the recruiter's OWN company profile:
 * the Recruiter model already has a `company` string (required) and `phone`.
 * No new Company model or migration is introduced.
 *
 * - Identity comes only from the JWT (req.user.id on the backend).
 * - Editable fields: name, company, phone.
 * - email is shown read-only and cannot be changed here.
 * - On success, the cached profile (localStorage) is refreshed so the sidebar
 *   and the job form reflect the new company name.
 */
export default function RecruiterProfile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: "", company: "", phone: "" });
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]      = useState(false);
  const [feedback, setFeedback]  = useState({ text: "", type: "" });
  const [errors, setErrors]      = useState({});

  useEffect(() => {
    if (!getToken()) {
      navigate("/recruiter/login");
      return;
    }
    let mounted = true;

    (async () => {
      // Fetch the authoritative profile from the server.
      const { data, error } = await recruiterMe();
      if (!mounted) return;

      if (error || !data?.recruiter) {
        setFeedback({ text: error || "Could not load your profile.", type: "error" });
        // Fall back to the cached profile so the form isn't empty.
        const cached = getRecruiter();
        if (cached) {
          setFormData({ name: cached.name || "", company: cached.company || "", phone: cached.phone || "" });
          setEmail(cached.email || "");
        }
      } else {
        const r = data.recruiter;
        setFormData({ name: r.name || "", company: r.company || "", phone: r.phone || "" });
        setEmail(r.email || "");
      }
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [navigate]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const validate = () => {
    const e = {};
    if (!formData.name || formData.name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (!formData.company || formData.company.trim().length < 2) e.company = "Company name must be at least 2 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ text: "", type: "" });
    if (!validate()) return;

    setSaving(true);
    const { data, error } = await updateRecruiterProfile({
      name: formData.name.trim(),
      company: formData.company.trim(),
      phone: formData.phone.trim(),
    });

    if (error || !data?.recruiter) {
      setFeedback({ text: error || "Failed to update profile.", type: "error" });
      setSaving(false);
      return;
    }

    // Refresh the cached profile so the sidebar / job form reflect the new company.
    saveAuth(getToken(), data.recruiter);
    const r = data.recruiter;
    setFormData({ name: r.name || "", company: r.company || "", phone: r.phone || "" });
    setFeedback({ text: "Company profile updated successfully.", type: "success" });
    setSaving(false);
  };

  if (loading) {
    return (
      <RecruiterLayout pageTitle="Company Profile">
        <div className="page-container" style={{ padding: "60px 0", textAlign: "center" }}>
          <div className="loading-spinner" style={{ margin: "0 auto" }} />
        </div>
      </RecruiterLayout>
    );
  }

  return (
    <RecruiterLayout pageTitle="Company Profile">
      <div className="page-container" style={{ maxWidth: 760 }}>
        {/* ── Page Header ── */}
        <div className="page-header">
          <button className="back-button" onClick={() => navigate("/recruiter/dashboard")}>
            ← Back to Dashboard
          </button>
          <p className="page-label">Company Profile</p>
          <h1>Manage Your Company Profile</h1>
          <p>
            Your company name is used as the authoritative value on every job you post.
            Email is shown for reference and cannot be changed here.
          </p>
        </div>

        {feedback.text && (
          <div className={`alert alert-${feedback.type === "success" ? "success" : "error"}`} style={{ marginBottom: 20 }}>
            {feedback.text}
          </div>
        )}

        {/* ── Form Card ── */}
        <div className="section-card">
          <form onSubmit={handleSubmit}>
            <div className="job-form-grid">
              {/* Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="prof-name">Full Name *</label>
                <input
                  id="prof-name"
                  className="form-input"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                {errors.name && <span style={{ color: "var(--error)", fontSize: 12 }}>{errors.name}</span>}
              </div>

              {/* Company */}
              <div className="form-group">
                <label className="form-label" htmlFor="prof-company">Company Name *</label>
                <input
                  id="prof-company"
                  className="form-input"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                />
                {errors.company && <span style={{ color: "var(--error)", fontSize: 12 }}>{errors.company}</span>}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label" htmlFor="prof-phone">Phone Number</label>
                <input
                  id="prof-phone"
                  className="form-input"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Email — read-only, not editable here */}
              <div className="form-group">
                <label className="form-label" htmlFor="prof-email">Email Address (not editable)</label>
                <input
                  id="prof-email"
                  className="form-input"
                  type="email"
                  name="email"
                  value={email}
                  readOnly
                  style={{ background: "var(--bg-alt)", cursor: "default" }}
                />
              </div>
            </div>

            <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate("/recruiter/dashboard")}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                {saving ? "Saving…" : "Save Profile →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </RecruiterLayout>
  );
}
