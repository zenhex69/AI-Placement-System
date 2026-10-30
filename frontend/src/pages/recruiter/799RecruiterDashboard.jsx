import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RecruiterLayout from "../../components/799RecruiterLayout";
import { getToken, getRecruiter, listOwnJobs, listAllApplicants } from "../../components/recruiterApi";
import { logoColorClass } from "../../components/logoColor";

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs]             = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading]       = useState(true);

  const recruiter = getRecruiter();

  useEffect(() => {
    if (!getToken()) {
      navigate("/recruiter/login");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      const [jobsRes, appsRes] = await Promise.all([
        listOwnJobs(),
        listAllApplicants(),
      ]);

      if (jobsRes.data?.jobs) setJobs(jobsRes.data.jobs);
      if (appsRes.data?.applications) setApplicants(appsRes.data.applications);
      setLoading(false);
    };

    loadData();
  }, [navigate]);

  const openJobs    = jobs.filter((j) => j.status === "Open");
  const draftJobs   = jobs.filter((j) => j.status === "Draft");
  const closedJobs  = jobs.filter((j) => j.status === "Closed");

  const shortlistedCount = applicants.filter(
    (a) => a.status === "Shortlisted" || a.status === "Interview" || a.status === "Selected"
  ).length;

  return (
    <RecruiterLayout pageTitle="Recruiter Dashboard">
      <div className="page-container">
        {/* ── Page Header ── */}
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="page-label">Employer Overview</p>
            <h1>Welcome back, {recruiter?.name || "Recruiter"}</h1>
            <p>Manage your company hiring campaigns at {recruiter?.company || "your organization"}.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/recruiter/jobs/new")}
          >
            + Post a New Job
          </button>
        </div>

        {/* ── KPI Row ── */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-amber-dark">💼</div>
            <div className="kpi-label">Total Jobs Posted</div>
            <div className="kpi-value">{jobs.length}</div>
            <div className="kpi-trend" style={{ color: "var(--teal)" }}>
              {openJobs.length} active · {draftJobs.length} draft · {closedJobs.length} closed
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-amber-dark">📢</div>
            <div className="kpi-label">Active Open Positions</div>
            <div className="kpi-value">{openJobs.length}</div>
            <div className="kpi-trend">Accepting student applications</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-amber-dark">👥</div>
            <div className="kpi-label">Total Applicants</div>
            <div className="kpi-value">{applicants.length}</div>
            <div className="kpi-trend">Across all company postings</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-amber-dark">🎯</div>
            <div className="kpi-label">Advanced Candidates</div>
            <div className="kpi-value">{shortlistedCount}</div>
            <div className="kpi-trend">Shortlisted, Interviewed, or Selected</div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div className="loading-spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* ── Left Column: Active Jobs ── */}
            <div className="dash-col">
              <div className="section-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Your Job Listings</h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Recent roles you created</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate("/recruiter/jobs")}
                  >
                    View All ({jobs.length}) →
                  </button>
                </div>

                {jobs.length === 0 ? (
                  <div className="empty-state" style={{ padding: "32px 16px" }}>
                    <div className="empty-state-icon">📋</div>
                    <h4>No job postings yet</h4>
                    <p>Post your first job listing to start receiving qualified student applications.</p>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate("/recruiter/jobs/new")}
                      style={{ marginTop: 12 }}
                    >
                      Post Your First Job →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {jobs.slice(0, 4).map((job) => (
                      <div className="recruiter-job-card" key={job._id}>
                        <div className={`recruiter-job-card-logo ${logoColorClass(job.company)}`}>
                          {job.company?.charAt(0) || "J"}
                        </div>
                        <div className="recruiter-job-card-body">
                          <div className="recruiter-job-card-title">{job.role}</div>
                          <div className="recruiter-job-card-meta">
                            <span>{job.location || "Remote"}</span>
                            <span>·</span>
                            <span>{job.type}</span>
                            <span>·</span>
                            <strong>{job.applicantCount || 0} applicant{(job.applicantCount || 0) === 1 ? "" : "s"}</strong>
                          </div>
                        </div>
                        <div className="recruiter-job-card-actions">
                          <span className={`job-status-badge ${job.status.toLowerCase()}`}>
                            {job.status}
                          </span>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/recruiter/jobs/${job._id}/applicants`)}
                          >
                            Applicants
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column: Recent Applicants ── */}
            <div className="dash-col">
              <div className="section-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Applicants</h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Latest student submissions</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate("/recruiter/applicants")}
                  >
                    View Pipeline ({applicants.length}) →
                  </button>
                </div>

                {applicants.length === 0 ? (
                  <div className="empty-state" style={{ padding: "32px 16px" }}>
                    <div className="empty-state-icon">👥</div>
                    <h4>No applicants yet</h4>
                    <p>Once students apply to your Open jobs, their applications will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {applicants.slice(0, 4).map((app) => (
                      <div className="applicant-card" key={app._id}>
                        <div className="applicant-avatar">
                          {app.student?.name ? app.student.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div className="applicant-card-body">
                          <div className="applicant-name">{app.student?.name || "Student"}</div>
                          <div className="applicant-sub">
                            Applied for <strong>{app.role || app.recruiterJobRef?.role || "Job"}</strong>
                          </div>
                          <div className="recruiter-job-card-meta">
                            {app.student?.branch && <span>{app.student.branch}</span>}
                            {app.student?.cgpa && <span>· CGPA {app.student.cgpa}</span>}
                          </div>
                        </div>
                        <div className="applicant-card-right">
                          <span className={`status-badge ${app.status.toLowerCase().replace(/\s+/g, "-")}`}>
                            {app.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </RecruiterLayout>
  );
}
