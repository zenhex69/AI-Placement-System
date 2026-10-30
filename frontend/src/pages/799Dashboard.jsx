import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/799Layout";
import { logoColorClass } from "../components/logoColor";

/* ── SVG icon set ─────────────────────────────────────────────── */
const Icon = {
  Target: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Star: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  ),
  Sparkle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.6H22l-6.4 4.6 2.4 7.8L12 17.4 6 22l2.4-7.8L2 9.6h7.6z"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,18 15,12 9,6"/>
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
};

/* Circumference for donut SVG at r=40 → 2π×40 ≈ 251.3 */
const CIRC = 2 * Math.PI * 40;

/* ── Fallbacks ─────────────────────────────────────────────────── */
const calcPlacement = (s) => {
  let score = 0;
  score += Math.min(Number(s.cgpa || 0) * 4, 40);
  score += Math.min((s.skills || []).length * 5, 25);
  score += Math.min((s.projects || []).length * 5, 20);
  if (s.experience?.trim()) score += 15;
  return Math.min(Math.round(score), 100);
};

const calcProfile = (s) => {
  let score = 0;
  if (s.name)    score += 10;
  if (s.email)   score += 10;
  if (s.college) score += 10;
  if (s.degree)  score += 10;
  if (s.branch)  score += 10;
  if (Number(s.cgpa) > 0) score += 10;
  score += Math.min((s.skills || []).length * 5, 20);
  if (s.experience?.trim()) score += 10;
  if ((s.projects || []).length > 0) score += 10;
  return Math.min(score, 100);
};

const fallbackLabel = (n) =>
  n >= 70 ? "High Potential" : n >= 45 ? "Good Potential" : "Needs Improvement";

export default function Dashboard() {
  const navigate = useNavigate();

  const [student,            setStudent]            = useState(null);
  const [placementScore,     setPlacementScore]     = useState(0);
  const [potentialLabel,     setPotentialLabel]     = useState("Loading…");
  const [predictionBreakdown,setPredictionBreakdown]= useState(null);
  const [modelInfo,          setModelInfo]          = useState("");
  const [profileScore,       setProfileScore]       = useState(0);
  const [applicationCount,   setApplicationCount]   = useState(0);
  const [jobMatchCount,      setJobMatchCount]      = useState(0);
  const [recommendedJobs,    setRecommendedJobs]    = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("student");
    if (!saved) { navigate("/login"); return; }
    const local = JSON.parse(saved);
    const id    = local._id;

    /* 1 — fresh profile */
    const fetchStudent = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/students/${id}`);
        if (res.ok) {
          const { student: fresh } = await res.json();
          localStorage.setItem("student", JSON.stringify(fresh));
          setStudent(fresh);
          setProfileScore(calcProfile(fresh));
        } else {
          setStudent(local);
          setProfileScore(calcProfile(local));
        }
      } catch {
        setStudent(local);
        setProfileScore(calcProfile(local));
      }
    };

    /* 2 — ML prediction */
    const fetchPrediction = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/predict/${id}`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setPlacementScore(data.placementChance);
          setPotentialLabel(data.label);
          if (data.breakdown) setPredictionBreakdown(data.breakdown);
          if (data.modelInfo)  setModelInfo(data.modelInfo);
        } else {
          const fb = calcPlacement(local);
          setPlacementScore(fb);
          setPotentialLabel(fallbackLabel(fb));
        }
      } catch {
        const fb = calcPlacement(local);
        setPlacementScore(fb);
        setPotentialLabel(fallbackLabel(fb));
      }
    };

    /* 3 — application count */
    const fetchApps = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/applications/student/${id}`);
        if (res.ok) { const d = await res.json(); setApplicationCount(d.length); }
      } catch { /* non-critical */ }
    };

    /* 4 — job matches */
    const fetchJobs = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/jobs/match/${id}`);
        if (res.ok) {
          const { jobs } = await res.json();
          setJobMatchCount(jobs.filter(j => j.match > 0).length);
          setRecommendedJobs(jobs.slice(0, 4));
        }
      } catch { /* non-critical */ }
    };

    fetchStudent();
    fetchPrediction();
    fetchApps();
    fetchJobs();
  }, [navigate]);

  if (!student) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const initials = student.name
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const donutOffset = CIRC - (CIRC * placementScore) / 100;

  const kpiCards = [
    {
      icon: <Icon.Target />,
      iconClass: "kpi-icon-teal",
      label: "Placement Chance",
      value: `${placementScore}%`,
    },
    {
      icon: <Icon.Briefcase />,
      iconClass: "kpi-icon-blue",
      label: "Job Matches",
      value: jobMatchCount,
    },
    {
      icon: <Icon.FileText />,
      iconClass: "kpi-icon-green",
      label: "Applications",
      value: applicationCount,
    },
    {
      icon: <Icon.Star />,
      iconClass: "kpi-icon-amber",
      label: "Profile Score",
      value: `${profileScore}%`,
    },
  ];

  return (
    <Layout pageTitle="Dashboard">
      <div className="page-container">

        {/* ── Page header ── */}
        <div className="page-header">
          <p className="page-label">Student Dashboard</p>
          <h1>Welcome back, {student.name.split(" ")[0]} 👋</h1>
          <p>Here's your AI-powered career overview.</p>
        </div>

        {/* ── KPI cards ── */}
        <div className="kpi-grid">
          {kpiCards.map(({ icon, iconClass, label, value }) => (
            <div className="kpi-card" key={label}>
              <div className={`kpi-icon ${iconClass}`}>{icon}</div>
              <div className="kpi-info">
                <div className="kpi-label">{label}</div>
                <div className="kpi-value">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Two-column grid ── */}
        <div className="dashboard-grid">

          {/* Profile card */}
          <div className="card card-pad">
            <div className="profile-card-header">
              <div>
                <p className="page-label" style={{ marginBottom: 4 }}>Your Profile</p>
                <h2 className="section-title">Student Information</h2>
              </div>
              <div className="profile-avatar" style={{ width: 46, height: 46, fontSize: 18 }}>
                {initials}
              </div>
            </div>
            <div className="profile-info-grid">
              {[
                ["Name",    student.name],
                ["Email",   student.email],
                ["College", student.college  || "Not added"],
                ["Degree",  student.degree   || "Not added"],
                ["Branch",  student.branch   || "Not added"],
                ["CGPA",    student.cgpa     || "Not added"],
              ].map(([label, val]) => (
                <div className="profile-info-item" key={label}>
                  <span>{label}</span>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* ML Prediction card */}
          <div className="card card-pad">
            <div className="profile-card-header">
              <div>
                <p className="page-label" style={{ marginBottom: 4 }}>ML Prediction</p>
                <h2 className="section-title">Placement Prediction</h2>
              </div>
              <div
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "var(--teal-light)", border: "1px solid var(--teal-border)",
                  display: "grid", placeItems: "center", color: "var(--teal)",
                }}
              >
                <Icon.Sparkle />
              </div>
            </div>

            {/* Donut + label */}
            <div className="prediction-display">
              <div className="prediction-donut">
                <svg viewBox="0 0 96 96">
                  <circle className="donut-track" cx="48" cy="48" r="40"
                    strokeDasharray={CIRC} strokeDashoffset="0" />
                  <circle className="donut-fill" cx="48" cy="48" r="40"
                    strokeDasharray={CIRC}
                    strokeDashoffset={donutOffset} />
                </svg>
                <div className="prediction-donut-label">
                  <span>{placementScore}%</span>
                  <small>chance</small>
                </div>
              </div>
              <div className="prediction-info">
                <h3>{potentialLabel}</h3>
                <p>
                  {modelInfo ||
                    "Logistic Regression model trained on synthetic student profiles."}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="progress-bar" style={{ marginBottom: 10 }}>
              <div className="progress-bar-fill" style={{ width: `${placementScore}%` }} />
            </div>

            {/* Demo disclaimer */}
            <div className="prediction-note">
              <Icon.Info />
              <span>
                Demo prediction based on synthetic training data. Not a guarantee of actual placement.
              </span>
            </div>

            {/* Breakdown */}
            {predictionBreakdown && (
              <div className="prediction-breakdown">
                <p className="breakdown-heading">Score Breakdown</p>

                {[
                  { label: "CGPA",       val: predictionBreakdown.cgpa,       max: 40 },
                  { label: "Skills",     val: predictionBreakdown.skills,     max: 25 },
                  { label: "Experience", val: predictionBreakdown.experience, max: 15 },
                  { label: "Projects",   val: predictionBreakdown.projects,   max: 10 },
                ].map(({ label, val, max }) => (
                  <div className="breakdown-row" key={label}>
                    <span className="breakdown-label">{label}</span>
                    <div className="breakdown-track">
                      <div
                        className="breakdown-fill"
                        style={{ width: `${Math.round((val / max) * 100)}%` }}
                      />
                    </div>
                    <span className="breakdown-value">{val} / {max}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Skills ── */}
        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <p className="page-label" style={{ marginBottom: 4 }}>Skills</p>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Your Technical Skills</h2>
          <div className="skills-grid">
            {student.skills && student.skills.length > 0 ? (
              student.skills.map((skill, i) => (
                <span className="skill-chip" key={i}>{skill}</span>
              ))
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                No skills added yet. Upload your resume to auto-detect skills.
              </p>
            )}
          </div>
        </div>

        {/* ── Recommended jobs ── */}
        <div className="card card-pad">
          <div
            style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 16,
            }}
          >
            <div>
              <p className="page-label" style={{ marginBottom: 4 }}>AI Recommendations</p>
              <h2 className="section-title">Recommended Jobs</h2>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/jobs")}
            >
              View all <Icon.ChevronRight />
            </button>
          </div>

          {recommendedJobs.length > 0 ? (
            <div className="job-recommendation-list">
              {recommendedJobs.map((job) => (
                <div
                  className="job-rec-item"
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div className="job-rec-left">
                    <div className={`job-rec-logo ${logoColorClass(job.company)}`}>
                      {job.company.charAt(0)}
                    </div>
                    <div className="job-rec-info">
                      <h4>{job.role}</h4>
                      <span>{job.company} · {job.location}</span>
                    </div>
                  </div>
                  <span className="job-rec-match">{job.match}% match</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💼</div>
              <h3>No recommendations yet</h3>
              <p>Upload your resume to see AI-matched job recommendations.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/resume")}
              >
                Upload Resume →
              </button>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
