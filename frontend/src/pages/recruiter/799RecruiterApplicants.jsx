import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RecruiterLayout from "../../components/799RecruiterLayout";
import {
  getToken,
  listOwnJobs,
  listAllApplicants,
  listJobApplicants,
  updateApplicationStatus,
} from "../../components/recruiterApi";

const ALLOWED_STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Selected",
  "Rejected",
];

export default function RecruiterApplicants() {
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs]                 = useState([]);
  const [selectedJob, setSelectedJob]   = useState(jobId || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [updatingId, setUpdatingId]     = useState(null);
  const [statusMsg, setStatusMsg]       = useState({});
  const [expandedId, setExpandedId]     = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      navigate("/recruiter/login");
      return;
    }

    let isMounted = true;

    async function fetchData() {
      const [jobsRes, appsRes] = await Promise.all([
        listOwnJobs(),
        selectedJob && selectedJob !== "all"
          ? listJobApplicants(selectedJob)
          : listAllApplicants(),
      ]);

      if (!isMounted) return;

      if (jobsRes.data?.jobs) {
        setJobs(jobsRes.data.jobs);
      }
      if (appsRes.data?.applications) {
        setApplications(appsRes.data.applications);
      } else {
        setApplications([]);
      }
      setLoading(false);
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [navigate, selectedJob, refreshIndex]);

  const refreshData = useCallback(() => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  const handleStatusChange = async (appJobId, appId, newStatus) => {
    setUpdatingId(appId);
    setStatusMsg((prev) => ({ ...prev, [appId]: null }));

    const targetJobId = appJobId || selectedJob;
    const { error } = await updateApplicationStatus(targetJobId, appId, newStatus);
    setUpdatingId(null);

    if (error) {
      setStatusMsg((prev) => ({
        ...prev,
        [appId]: { text: error, type: "error" },
      }));
    } else {
      setStatusMsg((prev) => ({
        ...prev,
        [appId]: { text: `Status updated to "${newStatus}"`, type: "success" },
      }));
      setApplications((prev) =>
        prev.map((a) => (a._id === appId ? { ...a, status: newStatus } : a))
      );
    }
  };

  const filteredApps = applications.filter((app) => {
    const matchesStatus =
      statusFilter === "all" ||
      app.status?.toLowerCase() === statusFilter.toLowerCase();

    const q = search.toLowerCase();
    const studentName = app.student?.name?.toLowerCase() || "";
    const studentEmail = app.student?.email?.toLowerCase() || "";
    const studentCollege = app.student?.college?.toLowerCase() || "";
    const jobRole = (app.role || app.recruiterJobRef?.role || "").toLowerCase();

    const matchesSearch =
      studentName.includes(q) ||
      studentEmail.includes(q) ||
      studentCollege.includes(q) ||
      jobRole.includes(q);

    return matchesStatus && matchesSearch;
  });

  return (
    <RecruiterLayout pageTitle="Candidate Applications">
      <div className="page-container">
        {/* ── Page Header ── */}
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="page-label">Talent Pipeline</p>
            <h1>Candidate Applications</h1>
            <p>Review student applicants, inspect credentials, and advance candidates through hiring stages.</p>
          </div>
          <button
            className="btn btn-ghost"
            onClick={refreshData}
          >
            ↻ Refresh Pipeline
          </button>
        </div>

        {/* ── Filter Bar ── */}
        <div className="recruiter-filter-bar">
          <input
            className="form-input"
            type="text"
            placeholder="Search candidate name, email, college…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />

          <select
            className="form-input form-select"
            value={selectedJob}
            onChange={(e) => {
              setSelectedJob(e.target.value);
              if (e.target.value !== "all") {
                navigate(`/recruiter/jobs/${e.target.value}/applicants`);
              } else {
                navigate("/recruiter/applicants");
              }
            }}
          >
            <option value="all">All Jobs ({jobs.length})</option>
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.role} ({j.applicantCount || 0} apps)
              </option>
            ))}
          </select>

          <select
            className="form-input form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {ALLOWED_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* ── Applications List ── */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div className="loading-spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No applications found</h3>
            <p>
              {search || statusFilter !== "all" || selectedJob !== "all"
                ? "No candidates matched your search and filter settings."
                : "No students have applied to your active job listings yet."}
            </p>
            {(search || statusFilter !== "all" || selectedJob !== "all") && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setSelectedJob("all");
                  navigate("/recruiter/applicants");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredApps.map((app) => {
              const student = app.student || {};
              const jobRefId = app.recruiterJobRef?._id || app.recruiterJobRef || app.jobId;
              const isExpanded = expandedId === app._id;
              const msg = statusMsg[app._id];

              return (
                <div className="applicant-card" key={app._id} style={{ display: "block" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    {/* Avatar */}
                    <div className="applicant-avatar">
                      {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                    </div>

                    {/* Candidate Summary */}
                    <div className="applicant-card-body">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div className="applicant-name">{student.name || "Student Applicant"}</div>
                        <span className={`status-badge ${app.status.toLowerCase().replace(/\s+/g, "-")}`}>
                          {app.status}
                        </span>
                      </div>

                      <div className="applicant-sub">
                        Applied for <strong>{app.role || app.recruiterJobRef?.role || "Position"}</strong> ·{" "}
                        {app.company || app.recruiterJobRef?.company || "Company"}
                      </div>

                      <div className="recruiter-job-card-meta">
                        {student.email && <span>📧 {student.email}</span>}
                        {student.phone && <span>· 📞 {student.phone}</span>}
                        {student.college && <span>· 🏫 {student.college}</span>}
                        {student.degree && <span>· {student.degree}</span>}
                        {student.branch && <span>({student.branch})</span>}
                        {student.cgpa && (
                          <strong style={{ color: "var(--teal)" }}>· CGPA: {student.cgpa}</strong>
                        )}
                      </div>

                      {/* Skills */}
                      {student.skills && student.skills.length > 0 && (
                        <div className="applicant-skills">
                          {student.skills.map((skill) => (
                            <span className="skill-chip" key={skill} style={{ fontSize: 11, padding: "2px 8px" }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status updater */}
                    <div className="applicant-card-right">
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Stage
                      </label>
                      <select
                        className="status-select"
                        value={app.status}
                        onChange={(e) => handleStatusChange(jobRefId, app._id, e.target.value)}
                        disabled={updatingId === app._id}
                      >
                        {ALLOWED_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      {updatingId === app._id && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Saving…</span>
                      )}

                      {msg && (
                        <div className={`inline-confirm ${msg.type}`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile toggle & details */}
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setExpandedId(isExpanded ? null : app._id)}
                      style={{ fontSize: 12, padding: "4px 8px" }}
                    >
                      {isExpanded ? "▲ Hide Candidate Details" : "▼ View Candidate Details & Projects"}
                    </button>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="applicant-detail-grid" style={{ marginTop: 14 }}>
                      <div className="resume-info-box">
                        <span>Projects</span>
                        <strong>{student.projects || "None listed in profile"}</strong>
                      </div>
                      <div className="resume-info-box">
                        <span>Experience</span>
                        <strong>{student.experience || "Fresh graduate / None"}</strong>
                      </div>
                      <div className="resume-info-box">
                        <span>Academic Info</span>
                        <strong>
                          {student.degree || "Degree"} in {student.branch || "Branch"} · {student.college || "College"}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RecruiterLayout>
  );
}
