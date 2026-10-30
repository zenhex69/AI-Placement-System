import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/799Layout";
import { logoColorClass } from "../components/logoColor";

/* ── Status config ── */
const STATUS_MAP = {
  "Applied":      "applied",
  "Under Review": "under-review",
  "Shortlisted":  "shortlisted",
  "Interview":    "interview",
  "Selected":     "selected",
  "Rejected":     "rejected",
};

function statusClass(status = "") {
  const key = Object.keys(STATUS_MAP).find(
    k => k.toLowerCase() === status.toLowerCase()
  );
  return key ? STATUS_MAP[key] : "applied";
}

/* ── Icons ── */
const Icon = {
  MapPin: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  DollarSign: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
};

export default function Applications() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("student");
    if (!saved) { navigate("/login"); return; }

    const student = JSON.parse(saved);

    const fetchApplications = async () => {
      try {
        const res  = await fetch(`http://localhost:5000/api/applications/student/${student._id}`);
        const data = await res.json();
        if (res.ok) setApplications(data);
      } catch (err) {
        console.error("Failed to fetch applications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [navigate]);

  /* Stat counts */
  const count = (status) =>
    applications.filter(a => a.status?.toLowerCase() === status.toLowerCase()).length;

  const stats = [
    { label: "Total",       value: applications.length },
    { label: "Under Review",value: count("Under Review") },
    { label: "Shortlisted", value: count("Shortlisted") },
    { label: "Selected",    value: count("Selected") },
  ];

  return (
    <Layout pageTitle="My Applications">
      <div className="page-container">

        {/* ── Header ── */}
        <div className="page-header">
          <p className="page-label">Career Activity</p>
          <h1>My Applications</h1>
          <p>Track all your job applications and their current status.</p>
        </div>

        {/* ── Stats row ── */}
        <div className="app-stats-grid">
          {stats.map(({ label, value }) => (
            <div className="app-stat-card" key={label}>
              <div className="app-stat-label">{label}</div>
              <div className="app-stat-value">{value}</div>
            </div>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div className="loading-spinner" style={{ margin: "0 auto" }} />
          </div>

        ) : applications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3>No applications yet</h3>
            <p>
              You haven't applied for any jobs yet. Browse open positions and
              kick-start your placement journey.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/jobs")}>
              Browse Jobs →
            </button>
          </div>

        ) : (
          <div className="applications-list">
            {applications.map((app) => (
              <div className="application-card" key={app._id}>

                {/* Company logo */}
                <div className={`app-company-logo ${logoColorClass(app.company)}`}>
                  {app.company?.charAt(0) ?? "?"}
                </div>

                {/* Info */}
                <div className="app-card-info">
                  <div className="app-card-role">{app.role}</div>
                  <div className="app-card-company">{app.company}</div>
                  <div className="app-card-meta">
                    {app.location && (
                      <span><Icon.MapPin /> {app.location}</span>
                    )}
                    {app.salary && (
                      <span><Icon.DollarSign /> {app.salary}</span>
                    )}
                    {app.createdAt && (
                      <span>
                        <Icon.Calendar />{" "}
                        Applied {new Date(app.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="app-status-wrap">
                  <span className={`status-badge ${statusClass(app.status)}`}>
                    {app.status || "Applied"}
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
