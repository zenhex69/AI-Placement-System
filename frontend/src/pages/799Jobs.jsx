import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/799Layout";
import { logoColorClass } from "../components/logoColor";

/* ── Inline icons ── */
const Icon = {
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  DollarSign: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Sparkle: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.6H22l-6.4 4.6 2.4 7.8L12 17.4 6 22l2.4-7.8L2 9.6h7.6z"/>
    </svg>
  ),
};

/* Hardcoded fallback jobs — same data as the original */
const FALLBACK_JOBS = [
  { id: 1, company: "TechNova Solutions",    role: "MERN Stack Developer",      location: "Ahmedabad / Remote", type: "Full Time", salary: "₹6 - ₹9 LPA",   skills: ["React","Node.js","MongoDB"],            match: 94 },
  { id: 2, company: "DataSphere Technologies",role: "Data Analyst",             location: "Bangalore",          type: "Full Time", salary: "₹5 - ₹8 LPA",   skills: ["Python","SQL","Pandas"],               match: 87 },
  { id: 3, company: "AI Vision Labs",         role: "Machine Learning Engineer",location: "Hyderabad",          type: "Full Time", salary: "₹7 - ₹12 LPA",  skills: ["Python","Machine Learning","TensorFlow"],match: 82 },
  { id: 4, company: "CloudCore Systems",      role: "Backend Developer",        location: "Pune / Remote",      type: "Full Time", salary: "₹6 - ₹10 LPA",  skills: ["Node.js","Express","MongoDB"],          match: 89 },
  { id: 5, company: "PixelSoft Technologies", role: "Frontend Developer",       location: "Mumbai",             type: "Full Time", salary: "₹4 - ₹7 LPA",   skills: ["React","JavaScript","CSS"],             match: 91 },
  { id: 6, company: "InnovateX",              role: "Software Engineer",        location: "Ahmedabad",          type: "Full Time", salary: "₹5 - ₹9 LPA",   skills: ["Java","DSA","SQL"],                     match: 76 },
];

export default function Jobs() {
  const navigate = useNavigate();

  const [jobs,     setJobs]     = useState(FALLBACK_JOBS);
  const [search,   setSearch]   = useState("");
  const [location, setLocation] = useState("All Locations");
  const [jobType,  setJobType]  = useState("All Job Types");
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("student");
    if (!saved) return;
    const student = JSON.parse(saved);

    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/jobs/match/${student._id}`);
        if (res.ok) {
          const { jobs: apiJobs } = await res.json();
          setJobs(apiJobs);
        }
      } catch { /* keep fallback */ }
      finally { setLoading(false); }
    };

    fetchJobs();
  }, []);

  const filtered = jobs.filter((job) => {
    const q = search.toLowerCase();
    return (
      (job.role.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.skills.some(s => s.toLowerCase().includes(q))) &&
      (location === "All Locations" ||
        job.location.toLowerCase().includes(location.toLowerCase())) &&
      (jobType === "All Job Types" || job.type === jobType)
    );
  });

  return (
    <Layout pageTitle="Browse Jobs">
      <div className="page-container">

        {/* ── Header ── */}
        <div className="page-header">
          <p className="page-label">Opportunities</p>
          <h1>Find Your Dream Job</h1>
          <p>Discover roles matched to your skills with AI-powered scoring.</p>
        </div>

        {/* ── Search + filters ── */}
        <div className="jobs-search-bar">
          <div className="search-input-wrap">
            <span className="search-icon"><Icon.Search /></span>
            <input
              className="form-input"
              type="text"
              placeholder="Search roles, companies or skills…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-input form-select"
            value={location}
            onChange={e => setLocation(e.target.value)}
          >
            <option>All Locations</option>
            <option>Ahmedabad</option>
            <option>Bangalore</option>
            <option>Hyderabad</option>
            <option>Pune</option>
            <option>Mumbai</option>
          </select>

          <select
            className="form-input form-select"
            value={jobType}
            onChange={e => setJobType(e.target.value)}
          >
            <option>All Job Types</option>
            <option>Full Time</option>
            <option>Internship</option>
          </select>
        </div>

        {/* ── Count row ── */}
        <div className="jobs-meta-row">
          <p className="jobs-count-text">
            <strong>{filtered.length}</strong>{" "}
            {filtered.length === 1 ? "job" : "jobs"} found
            {loading && " · Updating matches…"}
          </p>
          <span className="ai-badge">
            <Icon.Sparkle /> AI Matched
          </span>
        </div>

        {/* ── Job grid ── */}
        <div className="jobs-grid">
          {filtered.length > 0 ? (
            filtered.map((job) => (
              <div className="job-card" key={job.id}>

                {/* Company row */}
                <div className="job-card-top">
                  <div className={`company-logo ${logoColorClass(job.company)}`}>
                    {job.company.charAt(0)}
                  </div>
                  <div className="job-company-info">
                    <div className="job-company-name">{job.company}</div>
                    <div className="job-company-location">
                      <Icon.MapPin /> {job.location}
                    </div>
                  </div>
                  <div className="match-badge">
                    <Icon.Sparkle /> {job.match}%
                  </div>
                </div>

                {/* Role title */}
                <div className="job-role-title">{job.role}</div>

                {/* Meta tags */}
                <div className="job-meta-tags">
                  <span className="meta-tag"><Icon.Briefcase /> {job.type}</span>
                  <span className="meta-tag"><Icon.DollarSign /> {job.salary}</span>
                </div>

                {/* Skills */}
                <div className="job-skills-row">
                  {job.skills.map((skill, i) => (
                    <span className="skill-chip" key={i}>{skill}</span>
                  ))}
                </div>

                {/* Footer */}
                <div className="job-card-footer">
                  <span className="posted-label">Posted recently</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    View Details →
                  </button>
                </div>

              </div>
            ))
          ) : (
            <div className="no-jobs-state">
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No jobs found</h3>
                <p>Try adjusting your search terms or clearing filters.</p>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSearch(""); setLocation("All Locations"); setJobType("All Job Types"); }}
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
