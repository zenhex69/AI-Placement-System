import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/799AdminLayout";
import { getToken, getAdmin, getStats } from "../../components/adminApi";

/* Canonical ordering + badge class for application statuses
   (classes already exist in App.css, same ones the recruiter UI uses) */
const APP_STATUSES = [
  { key: "Applied",        cls: "applied" },
  { key: "Under Review",   cls: "under-review" },
  { key: "Shortlisted",    cls: "shortlisted" },
  { key: "Interview",      cls: "interview" },
  { key: "Selected",       cls: "selected" },
  { key: "Rejected",       cls: "rejected" },
];

const JOB_STATUSES = ["Draft", "Open", "Closed", "Archived"];

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const admin = getAdmin();

  useEffect(() => {
    // Protect the route — admin token only. A student's "token" or a
    // recruiter's "recruiterToken" will NOT satisfy this check, and the
    // backend additionally enforces role "admin" via requireRole.
    if (!getToken()) {
      navigate("/admin/login");
      return;
    }

    const loadStats = async () => {
      setLoading(true);
      setError("");
      const { data, error } = await getStats();
      if (error || !data) {
        setError(error || "Failed to load statistics.");
      } else {
        setStats(data);
      }
      setLoading(false);
    };

    loadStats();
  }, [navigate]);

  return (
    <AdminLayout pageTitle="Admin Dashboard">
      <div className="page-container">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <p className="page-label">Platform Overview</p>
            <h1>Welcome, {admin?.name || "Administrator"}</h1>
            <p>Monitor the entire CareerAI platform — students, recruiters, jobs, applications, and AI placement predictions.</p>
          </div>
        </div>

        {error ? (
          /* ── Error state ── */
          <div className="section-card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div className="empty-state-icon">⚠️</div>
            <h4 style={{ fontSize: 17, marginBottom: 8 }}>Couldn’t load statistics</h4>
            <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>{error}</p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setError("");
                setLoading(true);
                getStats().then(({ data, error }) => {
                  if (error) setError(error || "Failed to load statistics.");
                  else setStats(data);
                  setLoading(false);
                });
              }}
            >
              Retry →
            </button>
          </div>
        ) : loading ? (
          /* ── Loading state ── */
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div className="loading-spinner" style={{ margin: "0 auto" }} />
            <p style={{ marginTop: 16, color: "var(--text-secondary)", fontSize: 14 }}>
              Loading platform statistics…
            </p>
          </div>
        ) : stats ? (
          <>
            {/* ── KPI Row ── */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon kpi-icon-blue">🎓</div>
                <div className="kpi-label">Total Students</div>
                <div className="kpi-value">{stats.students?.total ?? 0}</div>
                <div className="kpi-trend" style={{ color: "var(--teal)" }}>
                  {stats.students?.active ?? 0} active · {stats.students?.suspended ?? 0} suspended
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-icon-amber">🏢</div>
                <div className="kpi-label">Total Recruiters</div>
                <div className="kpi-value">{stats.recruiters?.total ?? 0}</div>
                <div className="kpi-trend" style={{ color: "#D97706" }}>
                  {stats.recruiters?.active ?? 0} active · {stats.recruiters?.suspended ?? 0} suspended
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-icon-green">💼</div>
                <div className="kpi-label">Total Jobs</div>
                <div className="kpi-value">{stats.jobs?.totalDb ?? 0}</div>
                <div className="kpi-trend">
                  {stats.jobs?.byStatus?.Open ?? 0} open · {stats.jobs?.staticJobsCount ?? 0} built-in listings
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-icon-teal">📄</div>
                <div className="kpi-label">Total Applications</div>
                <div className="kpi-value">{stats.applications?.total ?? 0}</div>
                <div className="kpi-trend">
                  {stats.applications?.byStatus?.Selected ?? 0} selected · {stats.applications?.byStatus?.Rejected ?? 0} rejected
                </div>
              </div>
            </div>

            {/* ── Two-column breakdown ── */}
            <div className="dashboard-grid">
              {/* Left: Applications by Status */}
              <div className="dash-col">
                <div className="section-card">
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Applications by Status</h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      Current pipeline across all recruiter jobs
                    </p>
                  </div>

                  {(stats.applications?.total ?? 0) === 0 ? (
                    <div className="empty-state" style={{ padding: "32px 16px" }}>
                      <div className="empty-state-icon">📭</div>
                      <h4>No applications yet</h4>
                      <p>Applications will appear here once students start applying to jobs.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {APP_STATUSES.map(({ key, cls }) => {
                        const count = stats.applications?.byStatus?.[key] ?? 0;
                        const pct = stats.applications.total
                          ? Math.round((count / stats.applications.total) * 100)
                          : 0;
                        return (
                          <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span className={`status-badge ${cls}`} style={{ minWidth: 110, justifyContent: "center" }}>
                              {key}
                            </span>
                            <div style={{ flex: 1, height: 8, borderRadius: 8, background: "var(--bg-alt)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: "var(--teal)", borderRadius: 8 }} />
                            </div>
                            <strong style={{ minWidth: 64, textAlign: "right" }}>{count} · {pct}%</strong>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {stats.applications?.selectionNote && (stats.applications?.total ?? 0) > 0 && (
                    <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-secondary)" }}>
                      ℹ️ {stats.applications.selectionNote}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Placement Predictions */}
              <div className="dash-col">
                <div className="section-card">
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Placement Predictions</h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      AI model output across {stats.predictions?.totalEvaluated ?? 0} student profile{(stats.predictions?.totalEvaluated ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>

                  {stats.predictions?.error ? (
                    <div className="empty-state" style={{ padding: "32px 16px" }}>
                      <div className="empty-state-icon">⚠️</div>
                      <h4>Prediction data unavailable</h4>
                      <p>{stats.predictions.error}</p>
                    </div>
                  ) : (stats.predictions?.totalEvaluated ?? 0) === 0 ? (
                    <div className="empty-state" style={{ padding: "32px 16px" }}>
                      <div className="empty-state-icon">🎯</div>
                      <h4>No students to evaluate yet</h4>
                      <p>Prediction statistics will appear once students register with profile data.</p>
                    </div>
                  ) : (
                    <>
                      {/* Average chance highlight */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18 }}>
                        <span style={{ fontSize: 34, fontWeight: 800, color: "#7C3AED" }}>
                          {stats.predictions?.averageChance ?? 0}%
                        </span>
                        <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>average placement chance</span>
                      </div>

                      {/* Distribution */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <PredBar
                          label="High Potential"
                          count={stats.predictions?.byLabel?.highPotential ?? 0}
                          total={stats.predictions?.totalEvaluated ?? 0}
                          color="#16a34a"
                        />
                        <PredBar
                          label="Good Potential"
                          count={stats.predictions?.byLabel?.goodPotential ?? 0}
                          total={stats.predictions?.totalEvaluated ?? 0}
                          color="#D97706"
                        />
                        <PredBar
                          label="Needs Improvement"
                          count={stats.predictions?.byLabel?.needsImprovement ?? 0}
                          total={stats.predictions?.totalEvaluated ?? 0}
                          color="#DC2626"
                        />
                      </div>

                      {stats.predictions?.modelInfo && (
                        <p style={{ marginTop: 18, fontSize: 12, color: "var(--text-secondary)" }}>
                          ℹ️ {stats.predictions.modelInfo}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Jobs by Status (full width) ── */}
            <div className="section-card" style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>Jobs by Status</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Recruiter-created database jobs · {stats.jobs?.staticJobsCount ?? 0} additional built-in listings are not in the database
                  </p>
                </div>
              </div>

              {(stats.jobs?.totalDb ?? 0) === 0 ? (
                <div className="empty-state" style={{ padding: "32px 16px" }}>
                  <div className="empty-state-icon">💼</div>
                  <h4>No recruiter jobs yet</h4>
                  <p>Jobs posted by recruiters will appear here once created.</p>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {JOB_STATUSES.map((status) => {
                    const count = stats.jobs?.byStatus?.[status] ?? 0;
                    return (
                      <div
                        key={status}
                        style={{ flex: "1 1 140px", padding: "16px 18px", borderRadius: 12, background: "var(--bg-alt)", border: "1px solid var(--border)" }}
                      >
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>{status}</div>
                        <div style={{ fontSize: 26, fontWeight: 800 }}>{count}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}

/* Small distribution bar for placement prediction labels */
function PredBar({ label, count, total, color }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span>{label}</span>
        <strong>{count} · {pct}%</strong>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: "var(--bg-alt)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 8, transition: "width .3s" }} />
      </div>
    </div>
  );
}
