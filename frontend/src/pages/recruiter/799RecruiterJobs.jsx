import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import RecruiterLayout from "../../components/799RecruiterLayout";
import { getToken, listOwnJobs, updateJobStatus, deleteJob } from "../../components/recruiterApi";
import { logoColorClass } from "../../components/logoColor";

export default function RecruiterJobs() {
  const navigate = useNavigate();

  const [jobs, setJobs]         = useState([]);
  const [filter, setFilter]     = useState("All");
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [actionId, setActionId] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      navigate("/recruiter/login");
      return;
    }

    let isMounted = true;
    listOwnJobs().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setFeedback({ text: error, type: "error" });
      } else if (data?.jobs) {
        setJobs(data.jobs);
      }
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, [navigate, refreshIndex]);

  const refreshJobs = useCallback(() => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  const handleStatusChange = async (jobId, newStatus) => {
    setActionId(jobId);
    setFeedback({ text: "", type: "" });
    const { error, data } = await updateJobStatus(jobId, newStatus);
    setActionId(null);

    if (error) {
      setFeedback({ text: error, type: "error" });
    } else {
      setFeedback({ text: data?.message || `Job status updated to ${newStatus}.`, type: "success" });
      refreshJobs();
    }
  };

  const handleDelete = async (jobId, role) => {
    if (!window.confirm(`Archive "${role}"? The job will be archived and all candidate application records and history will be preserved.`)) {
      return;
    }
    setActionId(jobId);
    setFeedback({ text: "", type: "" });
    const { error, data } = await deleteJob(jobId);
    setActionId(null);

    if (error) {
      setFeedback({ text: error, type: "error" });
    } else {
      setFeedback({ text: data?.message || "Job deleted successfully.", type: "success" });
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesFilter = filter === "All" || job.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      job.role.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      (job.location && job.location.toLowerCase().includes(q)) ||
      (job.skills && job.skills.some((s) => s.toLowerCase().includes(q)));
    return matchesFilter && matchesSearch;
  });

  return (
    <RecruiterLayout pageTitle="Manage Job Listings">
      <div className="page-container">
        {/* ── Page Header ── */}
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="page-label">Job Management</p>
            <h1>Manage Job Postings</h1>
            <p>Publish, edit, monitor applicants, and manage lifecycle for your job listings.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/recruiter/jobs/new")}
          >
            + Post a New Job
          </button>
        </div>

        {feedback.text && (
          <div className={`alert alert-${feedback.type === "success" ? "success" : "error"}`} style={{ marginBottom: 20 }}>
            {feedback.text}
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="recruiter-filter-bar">
          <input
            className="form-input"
            type="text"
            placeholder="Search by role, skill, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["All", "Open", "Draft", "Closed"].map((status) => (
              <button
                key={status}
                className={`btn btn-sm ${filter === status ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setFilter(status)}
              >
                {status} ({status === "All" ? jobs.length : jobs.filter((j) => j.status === status).length})
              </button>
            ))}
          </div>
        </div>

        {/* ── Jobs List ── */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div className="loading-spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No jobs found</h3>
            <p>
              {search || filter !== "All"
                ? "No job postings matched your current search and filter criteria."
                : "You haven't posted any jobs yet. Create your first opening today!"}
            </p>
            {search || filter !== "All" ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setSearch(""); setFilter("All"); }}
              >
                Clear Filters
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/recruiter/jobs/new")}
              >
                Post a Job Now →
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredJobs.map((job) => (
              <div className="recruiter-job-card" key={job._id}>
                {/* Logo */}
                <div className={`recruiter-job-card-logo ${logoColorClass(job.company)}`}>
                  {job.company?.charAt(0) || "J"}
                </div>

                {/* Body */}
                <div className="recruiter-job-card-body">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div className="recruiter-job-card-title">{job.role}</div>
                    <span className={`job-status-badge ${job.status.toLowerCase()}`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="recruiter-job-card-meta">
                    <span>{job.company}</span>
                    <span>·</span>
                    <span>{job.location || "Remote"}</span>
                    <span>·</span>
                    <span>{job.type}</span>
                    {job.salary && (
                      <>
                        <span>·</span>
                        <span>{job.salary}</span>
                      </>
                    )}
                    <span>·</span>
                    <strong style={{ color: "var(--teal)" }}>
                      {job.applicantCount || 0} applicant{(job.applicantCount || 0) === 1 ? "" : "s"}
                    </strong>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {job.skills.map((s) => (
                        <span className="skill-chip" key={s} style={{ fontSize: 11, padding: "2px 8px" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="recruiter-job-card-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/recruiter/jobs/${job._id}/applicants`)}
                    title="View candidate applications"
                  >
                    Applicants ({job.applicantCount || 0})
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/recruiter/jobs/${job._id}/edit`)}
                    title="Edit listing details"
                  >
                    Edit
                  </button>

                  {/* Status toggle button */}
                  {job.status === "Draft" && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStatusChange(job._id, "Open")}
                      disabled={actionId === job._id}
                    >
                      Publish
                    </button>
                  )}

                  {job.status === "Open" && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleStatusChange(job._id, "Closed")}
                      disabled={actionId === job._id}
                      style={{ color: "var(--error)" }}
                    >
                      Close Job
                    </button>
                  )}

                  {job.status === "Closed" && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStatusChange(job._id, "Open")}
                      disabled={actionId === job._id}
                    >
                      Reopen
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(job._id, job.role)}
                    disabled={actionId === job._id}
                    title="Delete job listing"
                    style={{ color: "var(--error)", padding: "4px 8px" }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RecruiterLayout>
  );
}
