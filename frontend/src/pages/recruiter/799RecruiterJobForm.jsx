import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RecruiterLayout from "../../components/799RecruiterLayout";
import {
  getToken,
  getRecruiter,
  createJob,
  getOwnJob,
  updateJob,
  updateJobStatus,
} from "../../components/recruiterApi";

export default function RecruiterJobForm() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const isEdit = Boolean(jobId);

  const recruiter = getRecruiter();

  const [formData, setFormData] = useState({
    role: "",
    company: recruiter?.company || "",
    location: "",
    type: "Full Time",
    salary: "",
    description: "",
    skills: [],
    requirements: [],
  });

  const [skillInput, setSkillInput] = useState("");
  const [reqInput, setReqInput]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [initLoading, setInitLoading] = useState(isEdit);
  const [feedback, setFeedback]     = useState({ text: "", type: "" });
  const [publishImmediately, setPublishImmediately] = useState(!isEdit);

  useEffect(() => {
    if (!getToken()) {
      navigate("/recruiter/login");
      return;
    }

    if (isEdit) {
      const loadJob = async () => {
        setInitLoading(true);
        const { data, error } = await getOwnJob(jobId);
        if (error || !data?.job) {
          setFeedback({ text: error || "Could not load job details.", type: "error" });
        } else {
          const j = data.job;
          setFormData({
            role: j.role || "",
            company: recruiter?.company || j.company || "",
            location: j.location || "",
            type: j.type || "Full Time",
            salary: j.salary || "",
            description: j.description || "",
            skills: Array.isArray(j.skills) ? j.skills : [],
            requirements: Array.isArray(j.requirements) ? j.requirements : [],
          });
        }
        setInitLoading(false);
      };

      loadJob();
    }
  }, [isEdit, jobId, navigate, recruiter?.company]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Skills input helper
  const handleAddSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (!formData.skills.some((item) => item.toLowerCase() === s.toLowerCase())) {
      setFormData({ ...formData, skills: [...formData.skills, s] });
    }
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skillToRemove),
    });
  };

  // Requirements input helper
  const handleAddRequirement = () => {
    const r = reqInput.trim();
    if (!r) return;
    setFormData({ ...formData, requirements: [...formData.requirements, r] });
    setReqInput("");
  };

  const handleRemoveRequirement = (idx) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((_, i) => i !== idx),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ text: "", type: "" });

    if (isEdit) {
      const { error } = await updateJob(jobId, formData);
      if (error) {
        setFeedback({ text: error, type: "error" });
        setLoading(false);
        return;
      }
      setFeedback({ text: "Job updated successfully!", type: "success" });
      setTimeout(() => navigate("/recruiter/jobs"), 800);
    } else {
      const { data, error } = await createJob(formData);
      if (error || !data?.job) {
        setFeedback({ text: error || "Failed to create job.", type: "error" });
        setLoading(false);
        return;
      }

      const newId = data.job._id;
      if (publishImmediately) {
        await updateJobStatus(newId, "Open");
      }

      setFeedback({
        text: `Job created successfully ${publishImmediately ? "and published!" : "as draft."}`,
        type: "success",
      });
      setTimeout(() => navigate("/recruiter/jobs"), 800);
    }
  };

  if (initLoading) {
    return (
      <RecruiterLayout pageTitle="Loading Job…">
        <div className="page-container" style={{ padding: "60px 0", textAlign: "center" }}>
          <div className="loading-spinner" style={{ margin: "0 auto" }} />
        </div>
      </RecruiterLayout>
    );
  }

  return (
    <RecruiterLayout pageTitle={isEdit ? "Edit Job Listing" : "Post a New Job"}>
      <div className="page-container" style={{ maxWidth: 880 }}>
        {/* ── Page Header ── */}
        <div className="page-header">
          <button
            className="back-button"
            onClick={() => navigate("/recruiter/jobs")}
          >
            ← Back to Manage Jobs
          </button>
          <p className="page-label">Listing Editor</p>
          <h1>{isEdit ? "Edit Job Listing" : "Create New Job Opening"}</h1>
          <p>
            {isEdit
              ? "Update details, requirements, and required skills for this job listing."
              : "Define the job role, requirements, and technical skills to match candidate profiles."}
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
              {/* Role Title */}
              <div className="form-group full-width">
                <label className="form-label" htmlFor="role">Job Title / Role *</label>
                <input
                  id="role"
                  className="form-input"
                  type="text"
                  name="role"
                  placeholder="e.g. Full Stack Developer, Data Analyst, ML Engineer"
                  value={formData.role}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Company — authoritative; managed in Company Profile */}
              <div className="form-group">
                <label className="form-label" htmlFor="company">Company Name</label>
                <input
                  id="company"
                  className="form-input"
                  type="text"
                  name="company"
                  value={formData.company}
                  readOnly
                  aria-describedby="company-help"
                />
                <span id="company-help" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Your company is set in your profile. Update it under Company Profile.
                </span>
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-label" htmlFor="location">Location</label>
                <input
                  id="location"
                  className="form-input"
                  type="text"
                  name="location"
                  placeholder="e.g. Ahmedabad / Remote, Bangalore, Pune"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              {/* Employment Type */}
              <div className="form-group">
                <label className="form-label" htmlFor="type">Employment Type</label>
                <select
                  id="type"
                  className="form-input form-select"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              {/* Salary */}
              <div className="form-group">
                <label className="form-label" htmlFor="salary">Salary / Compensation</label>
                <input
                  id="salary"
                  className="form-input"
                  type="text"
                  name="salary"
                  placeholder="e.g. ₹6 - ₹9 LPA or ₹25,000/month"
                  value={formData.salary}
                  onChange={handleChange}
                />
              </div>

              {/* Description */}
              <div className="form-group full-width">
                <label className="form-label" htmlFor="description">Job Description</label>
                <textarea
                  id="description"
                  className="form-textarea"
                  name="description"
                  rows={4}
                  placeholder="Describe the role responsibilities, team environment, and expectations…"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              {/* Required Skills (Tag chips) */}
              <div className="form-group full-width">
                <label className="form-label">
                  Required Skills (used for AI candidate matching)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Type skill (e.g. React, Node.js, Python, MongoDB) and press Enter"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleAddSkill}
                  >
                    Add Skill
                  </button>
                </div>

                <div className="skills-tag-list">
                  {formData.skills.map((skill) => (
                    <span className="skill-tag" key={skill}>
                      {skill}
                      <button
                        type="button"
                        className="skill-tag-remove"
                        onClick={() => handleRemoveSkill(skill)}
                        aria-label={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {formData.skills.length === 0 && (
                    <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      No skills added yet. Add at least 1 or 2 skills for AI matching.
                    </span>
                  )}
                </div>
              </div>

              {/* Key Requirements (bullet list) */}
              <div className="form-group full-width">
                <label className="form-label">Key Requirements / Eligibility</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. Good knowledge of React.js, Strong DSA fundamentals"
                    value={reqInput}
                    onChange={(e) => setReqInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRequirement();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleAddRequirement}
                  >
                    Add
                  </button>
                </div>

                {formData.requirements.length > 0 && (
                  <ul className="requirements-list" style={{ marginTop: 10 }}>
                    {formData.requirements.map((req, idx) => (
                      <li key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>• {req}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRemoveRequirement(idx)}
                          style={{ color: "var(--error)", padding: "2px 8px" }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {!isEdit && (
                <div className="form-group full-width" style={{ marginTop: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={publishImmediately}
                      onChange={(e) => setPublishImmediately(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "var(--teal)" }}
                    />
                    <span>Publish immediately (Make job &quot;Open&quot; for student applications right away)</span>
                  </label>
                </div>
              )}
            </div>

            <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate("/recruiter/jobs")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
              >
                {loading
                  ? "Saving…"
                  : isEdit
                  ? "Save Changes"
                  : publishImmediately
                  ? "Create & Publish Job Opening →"
                  : "Save as Draft Opening →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </RecruiterLayout>
  );
}
