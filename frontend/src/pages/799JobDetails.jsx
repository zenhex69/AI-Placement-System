import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "../components/799Layout";
import { logoColorClass } from "../components/logoColor";

/* ── Icons ── */
const Icon = {
  ArrowLeft: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  DollarSign: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  Sparkle: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.6H22l-6.4 4.6 2.4 7.8L12 17.4 6 22l2.4-7.8L2 9.6h7.6z"/>
    </svg>
  ),
};

/* Hardcoded fallback — same data as original */
const FALLBACK_JOBS = [
  { id:"1", company:"TechNova Solutions",     role:"MERN Stack Developer",      location:"Ahmedabad / Remote", type:"Full Time", salary:"₹6 - ₹9 LPA",  skills:["React","Node.js","MongoDB"],            match:94, description:"We are looking for a motivated MERN Stack Developer to build modern and scalable web applications.", requirements:["Good knowledge of React.js","Understanding of Node.js and Express","Knowledge of MongoDB","Strong JavaScript fundamentals","Basic understanding of REST APIs"] },
  { id:"2", company:"DataSphere Technologies", role:"Data Analyst",             location:"Bangalore",          type:"Full Time", salary:"₹5 - ₹8 LPA",  skills:["Python","SQL","Pandas"],               match:87, description:"Join our analytics team and work with real-world datasets to generate meaningful business insights.",  requirements:["Python programming","SQL knowledge","Knowledge of Pandas","Data visualization basics","Analytical thinking"] },
  { id:"3", company:"AI Vision Labs",          role:"Machine Learning Engineer",location:"Hyderabad",          type:"Full Time", salary:"₹7 - ₹12 LPA", skills:["Python","Machine Learning","TensorFlow"],match:82, description:"Work on machine learning solutions and AI-powered applications using modern technologies.", requirements:["Python programming","Machine Learning fundamentals","Knowledge of TensorFlow","Understanding of data preprocessing","Basic mathematics and statistics"] },
  { id:"4", company:"CloudCore Systems",       role:"Backend Developer",        location:"Pune / Remote",      type:"Full Time", salary:"₹6 - ₹10 LPA", skills:["Node.js","Express","MongoDB"],          match:89, description:"Build secure and scalable backend systems and REST APIs for enterprise applications.", requirements:["Node.js","Express.js","MongoDB","REST API development","Git and GitHub"] },
  { id:"5", company:"PixelSoft Technologies",  role:"Frontend Developer",       location:"Mumbai",             type:"Full Time", salary:"₹4 - ₹7 LPA",  skills:["React","JavaScript","CSS"],             match:91, description:"Create responsive and interactive user interfaces for modern web applications.", requirements:["React.js","JavaScript","HTML and CSS","Responsive design","Git basics"] },
  { id:"6", company:"InnovateX",               role:"Software Engineer",        location:"Ahmedabad",          type:"Full Time", salary:"₹5 - ₹9 LPA",  skills:["Java","DSA","SQL"],                     match:76, description:"Develop software solutions while working with an experienced engineering team.", requirements:["Java programming","Data Structures and Algorithms","SQL","Problem solving","Object Oriented Programming"] },
];

export default function JobDetails() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const [jobs,     setJobs]     = useState(FALLBACK_JOBS);
  const [applying, setApplying] = useState(false);
  const [message,  setMessage]  = useState({ text: "", type: "" });

  useEffect(() => {
    const saved = localStorage.getItem("student");
    if (!saved) return;
    const student = JSON.parse(saved);

    const fetchJobs = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/jobs/match/${student._id}`);
        if (res.ok) {
          const { jobs: apiJobs } = await res.json();
          setJobs(apiJobs);
        }
      } catch { /* keep fallback */ }
    };

    fetchJobs();
  }, []);

  const job = jobs.find(j => j.id === id || j.id === Number(id));

  if (!job) {
    return (
      <Layout pageTitle="Job Not Found">
        <div className="page-container">
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-state-icon">🔍</div>
            <h3>Job not found</h3>
            <p>This job listing may have been removed or the URL is incorrect.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/jobs")}>
              Back to Jobs
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleApply = async () => {
    const saved = localStorage.getItem("student");
    if (!saved) { navigate("/login"); return; }
    const student = JSON.parse(saved);

    setApplying(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("http://localhost:5000/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student: student._id,
          jobId:   job.id,
          company: job.company,
          role:    job.role,
          location:job.location,
          salary:  job.salary,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "Application submitted successfully!", type: "success" });
      } else {
        setMessage({ text: data.message || "Application failed.", type: "error" });
      }
    } catch {
      setMessage({ text: "Cannot connect to the server.", type: "error" });
    } finally {
      setApplying(false);
    }
  };

  const alreadyApplied = message.type === "success" ||
    (message.text && message.text.toLowerCase().includes("already"));

  return (
    <Layout pageTitle={job.role}>
      <div className="page-container">

        {/* Back button */}
        <button className="back-button" onClick={() => navigate("/jobs")}>
          <Icon.ArrowLeft /> Back to Jobs
        </button>

        {/* ── Header card ── */}
        <div className="job-details-header-card">
          <div className={`company-logo large ${logoColorClass(job.company)}`}>
            {job.company.charAt(0)}
          </div>

          <div className="job-header-body">
            <div className="job-header-company-name">{job.company}</div>
            <h1 className="job-header-title">{job.role}</h1>
            <div className="job-header-meta">
              <span className="meta-tag"><Icon.MapPin /> {job.location}</span>
              <span className="meta-tag"><Icon.Briefcase /> {job.type}</span>
              <span className="meta-tag"><Icon.DollarSign /> {job.salary}</span>
            </div>
          </div>

          <div className="detail-match-badge">
            <span>AI Match</span>
            <strong>{job.match}%</strong>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="job-details-layout">

          {/* Left — details */}
          <div>
            <div className="detail-section-card">
              <h2>About the Role</h2>
              <p>{job.description}</p>
            </div>

            <div className="detail-section-card">
              <h2>Required Skills</h2>
              <div className="skills-grid" style={{ marginTop: 4 }}>
                {job.skills.map((skill, i) => {
                  if (!job.matchedSkills) {
                    return <span className="skill-chip" key={i}>{skill}</span>;
                  }
                  const matched = job.matchedSkills.includes(skill);
                  return (
                    <span
                      key={i}
                      className={matched ? "skill-matched" : "skill-missing"}
                      title={matched ? "You have this skill" : "You are missing this skill"}
                    >
                      {matched ? "✓ " : "○ "}{skill}
                    </span>
                  );
                })}
              </div>
              {job.matchedSkills && (
                <p className="skills-match-summary" style={{ marginTop: 10 }}>
                  <strong>{job.matchedSkills.length}</strong> of{" "}
                  <strong>{job.skills.length}</strong> required skills matched
                  {job.missingSkills?.length > 0 && (
                    <> · Missing: {job.missingSkills.join(", ")}</>
                  )}
                </p>
              )}
            </div>

            <div className="detail-section-card">
              <h2>Requirements</h2>
              <ul className="requirements-list">
                {job.requirements.map((req, i) => (
                  <li key={i}>
                    <span style={{ color: "var(--teal)", flexShrink: 0 }}><Icon.Check /></span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right — apply sidebar */}
          <aside className="apply-sidebar">
            <p className="page-label" style={{ marginBottom: 6 }}>Application</p>
            <h2>Ready to Apply?</h2>
            <p>Submit your application for this position at {job.company}.</p>

            <button
              className={`btn btn-lg btn-full${alreadyApplied ? " btn-ghost" : " btn-primary"}`}
              style={{ marginTop: 16, marginBottom: 6 }}
              disabled={applying || alreadyApplied}
              onClick={handleApply}
            >
              {applying
                ? "Submitting…"
                : alreadyApplied
                ? "✓ Applied"
                : "Apply Now →"}
            </button>

            {message.text && (
              <div
                className={`application-message alert alert-${message.type === "success" ? "success" : "error"}`}
              >
                {message.text}
              </div>
            )}

            <div className="apply-info-list">
              {[
                ["Company",     job.company],
                ["Role",        job.role],
                ["Location",    job.location],
                ["Job Type",    job.type],
                ["Salary",      job.salary],
                ["Match Score", `${job.match}%`],
              ].map(([label, val]) => (
                <div className="apply-info-row" key={label}>
                  <span>{label}</span>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          </aside>

        </div>

      </div>
    </Layout>
  );
}
