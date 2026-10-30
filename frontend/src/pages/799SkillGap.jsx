import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import Layout from "../components/799Layout";

import { logoColorClass } from "../components/logoColor";



const BASE = "http://localhost:5000";



/* ── Inline SVG icons ─────────────────────────────────────── */

const Icon = {

  Target: () => (

    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>

    </svg>

  ),

  CheckCircle: () => (

    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>

    </svg>

  ),

  AlertCircle: () => (

    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>

    </svg>

  ),

  BookOpen: () => (

    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>

    </svg>

  ),

  Hammer: () => (

    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

      <path d="M15.828 3.172a4 4 0 0 1 5.657 5.656l-9.9 9.9a4 4 0 0 1-2.829 1.172H6v-2.757a4 4 0 0 1 1.172-2.829l8.656-8.142z"/><path d="M2 22l4-4"/>

    </svg>

  ),

  ArrowRight: () => (

    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>

    </svg>

  ),

  ExternalLink: () => (

    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>

      <polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>

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

  Sparkle: () => (

    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">

      <path d="M12 2l2.4 7.6H22l-6.4 4.6 2.4 7.8L12 17.4 6 22l2.4-7.8L2 9.6h7.6z"/>

    </svg>

  ),

  Info: () => (

    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>

    </svg>

  ),

};



/* ── Group config ─────────────────────────────────────────── */

const GROUP_CONFIG = {

  "Foundations":        { color: "var(--info)",    bg: "var(--info-bg)",    border: "var(--info-border)"    },

  "Core job skills":    { color: "var(--teal)",     bg: "var(--teal-light)", border: "var(--teal-border)"    },

  "Infrastructure & ops":{ color: "var(--warning)", bg: "var(--warning-bg)", border: "var(--warning-border)" },

};

const defaultGroupConfig = { color: "var(--teal)", bg: "var(--teal-light)", border: "var(--teal-border)" };



export default function SkillGap() {

  const navigate = useNavigate();



  /* ── Auth guard ── */

  const student = (() => {
    try {
      return JSON.parse(localStorage.getItem("student") || "null");
    } catch {
      return null;
    }
  })();
  const studentId = student?._id || student?.id || "";
  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    if (!studentId) navigate("/login");
  }, [studentId, navigate]);

  /* ── State ── */

  const [jobs,           setJobs]           = useState([]);   // all available jobs

  const [jobsLoading,    setJobsLoading]     = useState(true);

  const [jobsError,      setJobsError]       = useState("");

  const [selectedJobId,  setSelectedJobId]   = useState("");

  const [analysis,       setAnalysis]        = useState(null); // full API response

  const [analysisLoading,setAnalysisLoading] = useState(false);

  const [analysisError,  setAnalysisError]   = useState("");



  /* ── Fetch all available jobs for the selector ── */
  useEffect(() => {
    if (!studentId) {
      setJobsLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    const fetchJobs = async () => {
      setJobsLoading(true);
      setJobsError("");

      try {
        const res = await fetch(`${BASE}/api/jobs/match/${studentId}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load jobs.");
        }

        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      } catch (error) {
        if (error.name === "AbortError") return;
        setJobsError(error.message || "Cannot connect to the server.");
      } finally {
        if (!controller.signal.aborted) {
          setJobsLoading(false);
        }
      }
    };

    fetchJobs();
    return () => controller.abort();
  }, [studentId]);

  /* ── Fetch skill-gap analysis when a job is selected ── */

  const fetchAnalysis = async (jobId) => {

    if (!jobId) return;

    setAnalysisLoading(true);

    setAnalysisError("");

    setAnalysis(null);

    try {

      const res  = await fetch(`${BASE}/api/skill-gap/${jobId}`, {

        headers: { Authorization: `Bearer ${token}` },

      });

      const data = await res.json();

      if (res.ok) {

        setAnalysis(data);

      } else {

        setAnalysisError(data.message || "Failed to load analysis.");

      }

    } catch {

      setAnalysisError("Cannot connect to the server.");

    } finally {

      setAnalysisLoading(false);

    }

  };



  const handleJobChange = (e) => {

    const id = e.target.value;

    setSelectedJobId(id);

    setAnalysis(null);

    setAnalysisError("");

    if (id) fetchAnalysis(id);

  };



  /* ── Roadmap grouped by category ── */

  const roadmapByGroup = (roadmap = []) => {

    const groups = {};

    roadmap.forEach((item) => {

      if (!groups[item.group]) groups[item.group] = [];

      groups[item.group].push(item);

    });

    return groups;

  };



  if (!student) return null;



  /* ── Coverage display helpers ── */

  const coverageColor = (pct) => {

    if (pct === null) return "var(--text-muted)";

    if (pct >= 70) return "var(--success)";

    if (pct >= 40) return "var(--warning)";

    return "var(--error)";

  };

  const coverageLabel = (pct) => {

    if (pct === null) return "N/A";

    if (pct >= 70) return "Strong match";

    if (pct >= 40) return "Partial match";

    return "Skill gap";

  };



  const selectedJob = jobs.find(j => String(j.id) === selectedJobId);



  return (

    <Layout pageTitle="Skill Gap Analysis">

      <div className="page-container">



        {/* ── Page header ── */}

        <div className="page-header">

          <p className="page-label">AI Career Tools</p>

          <h1>Skill Gap Analysis</h1>

          <p>

            Select a job to compare its required skills against your profile,

            see exactly what you&apos;re missing, and get a personalised learning roadmap.

          </p>

        </div>



        {/* ── Job selector card ── */}

        <div className="card card-pad sg-selector-card">

          <div className="sg-selector-header">

            <div>

              <p className="page-label" style={{ marginBottom: 4 }}>Step 1</p>

              <h2 className="section-title">Choose a Job to Analyse</h2>

            </div>

            <span className="ai-badge" style={{ alignSelf: "flex-start" }}>

              <Icon.Sparkle /> AI Matched

            </span>

          </div>



          {jobsLoading ? (

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0" }}>

              <div className="loading-spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />

              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Loading available jobs…</span>

            </div>

          ) : jobsError ? (

            <div className="alert alert-error" style={{ marginTop: 12 }}>

              <Icon.AlertCircle />{jobsError}

            </div>

          ) : (

            <div style={{ marginTop: 14 }}>

              <label className="form-label" htmlFor="job-select">Select a job opening</label>

              <select

                id="job-select"

                className="form-input form-select sg-job-select"

                value={selectedJobId}

                onChange={handleJobChange}

                aria-label="Select a job for skill-gap analysis"

              >

                <option value="">— Choose a job —</option>

                {jobs.map((job) => (

                  <option key={job.id} value={String(job.id)}>

                    {job.role} — {job.company}

                    {job.match > 0 ? ` (${job.match}% match)` : ""}

                  </option>

                ))}

              </select>

              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 7 }}>

                {jobs.length} open {jobs.length === 1 ? "position" : "positions"} available

              </p>

            </div>

          )}

        </div>



        {/* ── Selected job summary ── */}

        {selectedJob && !analysisLoading && (

          <div className="card card-pad sg-job-summary">

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

              <div className={`company-logo ${logoColorClass(selectedJob.company)}`}>

                {selectedJob.company.charAt(0)}

              </div>

              <div style={{ flex: 1, minWidth: 0 }}>

                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4 }}>

                  {selectedJob.role}

                </div>

                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--teal)", marginBottom: 6 }}>

                  {selectedJob.company}

                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>

                  {selectedJob.location && <span><Icon.MapPin /> {selectedJob.location}</span>}

                  {selectedJob.type     && <span><Icon.Briefcase /> {selectedJob.type}</span>}

                  {selectedJob.salary   && <span>💰 {selectedJob.salary}</span>}

                </div>

              </div>

              <button

                className="btn btn-outline btn-sm"

                onClick={() => navigate(`/jobs/${selectedJob.id}`)}

                style={{ flexShrink: 0 }}

              >

                View Details <Icon.ExternalLink />

              </button>

            </div>

          </div>

        )}



        {/* ── Loading analysis ── */}

        {analysisLoading && (

          <div className="card card-pad" style={{ textAlign: "center", padding: 40 }}>

            <div className="loading-spinner" style={{ margin: "0 auto 14px" }} />

            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Analysing your skill profile…</p>

          </div>

        )}



        {/* ── Analysis error ── */}

        {analysisError && !analysisLoading && (

          <div className="alert alert-error" style={{ marginTop: 4 }}>

            <Icon.AlertCircle /> {analysisError}

            <button

              className="btn btn-ghost btn-sm"

              style={{ marginLeft: "auto" }}

              onClick={() => fetchAnalysis(selectedJobId)}

            >

              Retry

            </button>

          </div>

        )}



        {/* ── Analysis results ── */}

        {analysis && !analysisLoading && (

          <>

            {/* Coverage + summary KPIs */}

            <div className="sg-kpi-row">



              {/* Coverage indicator */}

              <div className="card card-pad sg-coverage-card">

                <p className="page-label" style={{ marginBottom: 6 }}>Skill Coverage</p>

                {analysis.analysis.coverage === null ? (

                  <div>

                    <div className="sg-coverage-number" style={{ color: "var(--text-muted)" }}>N/A</div>

                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>

                      No required skills specified for this role.

                    </p>

                  </div>

                ) : (

                  <div>

                    <div

                      className="sg-coverage-number"

                      style={{ color: coverageColor(analysis.analysis.coverage) }}

                    >

                      {analysis.analysis.coverage}%

                    </div>

                    <div

                      className="sg-coverage-label"

                      style={{ color: coverageColor(analysis.analysis.coverage) }}

                    >

                      {coverageLabel(analysis.analysis.coverage)}

                    </div>

                    <div className="progress-bar sg-coverage-bar" role="progressbar"

                      aria-valuenow={analysis.analysis.coverage} aria-valuemin={0} aria-valuemax={100}>

                      <div

                        className="progress-bar-fill"

                        style={{

                          width: `${analysis.analysis.coverage}%`,

                          background: coverageColor(analysis.analysis.coverage),

                        }}

                      />

                    </div>

                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>

                      {analysis.analysis.totalMatched} of {analysis.analysis.totalRequired} required skills matched

                    </p>

                  </div>

                )}

              </div>



              {/* Stats row */}

              <div className="sg-stats-col">

                <div className="card card-pad sg-stat-card">

                  <div className={`kpi-icon kpi-icon-green`} style={{ width: 38, height: 38, marginBottom: 10, fontSize: 16 }}>

                    <Icon.CheckCircle />

                  </div>

                  <div className="kpi-value" style={{ fontSize: 28 }}>{analysis.analysis.totalMatched}</div>

                  <div className="kpi-label">Skills matched</div>

                </div>

                <div className="card card-pad sg-stat-card">

                  <div className={`kpi-icon kpi-icon-amber`} style={{ width: 38, height: 38, marginBottom: 10, fontSize: 16 }}>

                    <Icon.AlertCircle />

                  </div>

                  <div className="kpi-value" style={{ fontSize: 28 }}>{analysis.analysis.missingSkills.length}</div>

                  <div className="kpi-label">Skills to learn</div>

                </div>

                <div className="card card-pad sg-stat-card">

                  <div className={`kpi-icon kpi-icon-blue`} style={{ width: 38, height: 38, marginBottom: 10, fontSize: 16 }}>

                    <Icon.Target />

                  </div>

                  <div className="kpi-value" style={{ fontSize: 28 }}>{analysis.analysis.totalRequired}</div>

                  <div className="kpi-label">Required skills</div>

                </div>

              </div>



            </div>



            {/* Formula disclaimer */}

            <div className="alert alert-info sg-disclaimer" style={{ marginTop: 0, marginBottom: 20 }}>

              <Icon.Info />

              <span>

                <strong>Skill coverage</strong> = matched skills ÷ total required skills × 100.

                This is a skills comparison metric, not a placement probability.

                Based on your saved profile skills.

              </span>

            </div>



            {/* Matched skills */}

            {analysis.analysis.matchedSkills.length > 0 && (

              <div className="card card-pad sg-skills-card">

                <div className="sg-skills-header">

                  <span className="nav-icon" style={{ color: "var(--success)" }}>

                    <Icon.CheckCircle />

                  </span>

                  <div>

                    <p className="page-label" style={{ marginBottom: 3 }}>Your Strengths</p>

                    <h2 className="section-title">Skills You Already Have</h2>

                  </div>

                </div>

                <div className="skills-grid" style={{ marginTop: 14 }}>

                  {analysis.analysis.matchedSkills.map((skill, i) => (

                    <span key={i} className="skill-matched">✓ {skill}</span>

                  ))}

                </div>

              </div>

            )}



            {/* Missing skills */}

            {analysis.analysis.missingSkills.length > 0 ? (

              <div className="card card-pad sg-skills-card">

                <div className="sg-skills-header">

                  <span className="nav-icon" style={{ color: "var(--warning)" }}>

                    <Icon.AlertCircle />

                  </span>

                  <div>

                    <p className="page-label" style={{ marginBottom: 3 }}>Skill Gap</p>

                    <h2 className="section-title">Skills You Need to Learn</h2>

                  </div>

                </div>

                <div className="skills-grid" style={{ marginTop: 14 }}>

                  {analysis.analysis.missingSkills.map((skill, i) => (

                    <span key={i} className="skill-missing">○ {skill}</span>

                  ))}

                </div>

              </div>

            ) : analysis.analysis.totalRequired > 0 ? (

              <div className="empty-state" style={{ marginBottom: 20, borderStyle: "solid", borderColor: "var(--success-border)", background: "var(--success-bg)" }}>

                <div className="empty-state-icon" style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)" }}>✓</div>

                <h3 style={{ color: "var(--success)" }}>All required skills matched!</h3>

                <p>You already have every skill required for this role.</p>

              </div>

            ) : null}



            {/* Learning roadmap */}

            {analysis.roadmap && analysis.roadmap.length > 0 && (

              <div className="sg-roadmap-section">

                <div style={{ marginBottom: 18 }}>

                  <p className="page-label" style={{ marginBottom: 4 }}>Learning Roadmap</p>

                  <h2 className="section-title">Prioritised Skills to Learn</h2>

                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>

                    Skills are ordered by their position in the job&apos;s requirements.

                    Recommendations are generated from your missing skills — no external AI or paid services.

                  </p>

                </div>



                {Object.entries(roadmapByGroup(analysis.roadmap)).map(([group, items]) => {

                  const cfg = GROUP_CONFIG[group] || defaultGroupConfig;

                  return (

                    <div key={group} className="sg-roadmap-group">

                      <div className="sg-group-label" style={{ color: cfg.color, borderColor: cfg.border }}>

                        {group}

                      </div>

                      <div className="sg-roadmap-cards">

                        {items.map((item, i) => (

                          <div key={i} className="sg-roadmap-card card">

                            <div className="sg-roadmap-card-top">

                              <div

                                className="sg-priority-badge"

                                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}

                              >

                                #{item.priority}

                              </div>

                              <h3 className="sg-roadmap-skill">{item.skill}</h3>

                            </div>



                            <div className="sg-roadmap-row">

                              <Icon.Info />

                              <span className="sg-roadmap-label">Why it matters:</span>

                              <span className="sg-roadmap-value">{item.relevance}</span>

                            </div>



                            <div className="sg-roadmap-row">

                              <Icon.Hammer />

                              <span className="sg-roadmap-label">Practice project:</span>

                              <span className="sg-roadmap-value">{item.project}</span>

                            </div>



                            <div className="sg-roadmap-row sg-next-step">

                              <Icon.ArrowRight />

                              <span className="sg-roadmap-label">Next step:</span>

                              <span className="sg-roadmap-value">{item.nextStep}</span>

                            </div>

                          </div>

                        ))}

                      </div>

                    </div>

                  );

                })}

              </div>

            )}



            {/* No-skills-missing && no required skills */}

            {analysis.analysis.totalRequired === 0 && (

              <div className="empty-state" style={{ marginBottom: 20 }}>

                <div className="empty-state-icon">📋</div>

                <h3>No required skills specified</h3>

                <p>This job listing does not list specific required skills. View the full job details for more information.</p>

              </div>

            )}



            {/* Student has no skills saved */}

            {student.skills && student.skills.length === 0 && (

              <div className="alert alert-info" style={{ marginBottom: 20 }}>

                <Icon.Info />

                <span>

                  Your profile has no saved skills. Upload your resume on the{" "}

                  <button

                    className="btn btn-ghost btn-sm"

                    style={{ padding: "2px 6px", fontSize: 13, display: "inline" }}

                    onClick={() => navigate("/resume")}

                  >

                    Resume AI page

                  </button>

                  {" "}to auto-detect your skills, then revisit this analysis.

                </span>

              </div>

            )}



            {/* CTA */}

            <div className="sg-cta-row">

              <button

                className="btn btn-primary"

                onClick={() => navigate(`/jobs/${selectedJob?.id}`)}

              >

                View Full Job Details <Icon.ExternalLink />

              </button>

              <button

                className="btn btn-ghost"

                onClick={() => navigate("/jobs")}

              >

                Browse All Jobs <Icon.ArrowRight />

              </button>

            </div>

          </>

        )}



        {/* ── Empty state: no job selected yet ── */}

        {!selectedJobId && !jobsLoading && !jobsError && (

          <div className="empty-state sg-empty">

            <div className="empty-state-icon">

              <Icon.Target />

            </div>

            <h3>Select a job above to begin</h3>

            <p>

              Choose any open position from the dropdown to see your skill coverage,

              a gap analysis, and a prioritised learning roadmap.

            </p>

          </div>

        )}



      </div>

    </Layout>

  );

}
