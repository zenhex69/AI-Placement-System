import "./799App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

import Register      from "./pages/799Register";
import Login         from "./pages/799Login";
import Dashboard     from "./pages/799Dashboard";
import Jobs          from "./pages/799Jobs";
import JobDetails    from "./pages/799JobDetails";
import Applications  from "./pages/799Applications";
import ResumeAnalysis from "./pages/799ResumeAnalysis";
import SkillGap      from "./pages/799SkillGap";

// Recruiter Portal pages
import RecruiterLogin      from "./pages/recruiter/799RecruiterLogin";
import RecruiterRegister   from "./pages/recruiter/799RecruiterRegister";
import RecruiterDashboard  from "./pages/recruiter/799RecruiterDashboard";
import RecruiterJobs       from "./pages/recruiter/799RecruiterJobs";
import RecruiterJobForm    from "./pages/recruiter/799RecruiterJobForm";
import RecruiterApplicants from "./pages/recruiter/799RecruiterApplicants";
import RecruiterProfile    from "./pages/recruiter/799RecruiterProfile";

// Admin Portal pages
import AdminLogin     from "./pages/admin/799AdminLogin";
import AdminDashboard from "./pages/admin/799AdminDashboard";

/* ─────────────────────────────────────────────────────────────
   Landing / Home page  (public, no sidebar)
───────────────────────────────────────────────────────────── */
function Home() {
  const navigate = useNavigate();

  return (
    <div className="app">

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="logo"><span>Career</span>AI</div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="nav-buttons">
          <button
            className="login-btn"
            style={{ borderColor: "rgba(217,119,6,0.35)", color: "#D97706" }}
            onClick={() => navigate("/recruiter/login")}
          >
            Recruiter Portal
          </button>
          <button className="login-btn"    onClick={() => navigate("/login")}>Login</button>
          <button className="register-btn" onClick={() => navigate("/register")}>Get Started</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero" id="home">

        <div className="hero-content">
          <div className="badge">✦ AI-Powered Career Platform</div>

          <h1>
            Build Your Career.<br />
            <span>Find Your Future.</span>
          </h1>

          <p>
            An intelligent placement management platform that connects students
            with the right opportunities using AI, Machine Learning, and Resume
            Analysis.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => navigate("/register")}>
              Get Started →
            </button>
            <button className="secondary-btn" onClick={() => navigate("/jobs")}>
              Explore Jobs
            </button>
            <button
              className="secondary-btn"
              style={{ borderColor: "rgba(217,119,6,0.4)", color: "#D97706" }}
              onClick={() => navigate("/recruiter/login")}
            >
              For Employers →
            </button>
          </div>

          <div className="stats">
            <div><h3>500+</h3><p>Students</p></div>
            <div><h3>100+</h3><p>Companies</p></div>
            <div><h3>95%</h3><p>Match Accuracy</p></div>
          </div>
        </div>

        {/* ── Hero AI card ── */}
        <div className="hero-card">
          <div className="card-header">
            <div>
              <span className="small-label">AI ANALYSIS</span>
              <h2>Career Insights</h2>
            </div>
            <div className="ai-icon">✦</div>
          </div>

          <div className="prediction">
            <div className="prediction-circle">
              <span>82%</span>
            </div>
            <div>
              <span className="small-label">PLACEMENT CHANCE</span>
              <h3>High Potential</h3>
              <p>Your profile matches current market demand.</p>
            </div>
          </div>

          <div className="skills">
            {["React.js","Node.js","MongoDB","Python","ML"].map(s => (
              <span key={s}>{s}</span>
            ))}
          </div>

          <div className="match">
            <div className="match-top">
              <span>Job Match</span>
              <strong>91%</strong>
            </div>
            <div className="progress">
              <div className="progress-fill" />
            </div>
          </div>
        </div>

      </section>

      {/* ── Features ── */}
      <section className="features" id="features">
        <div className="section-heading">
          <span className="section-label">SMART FEATURES</span>
          <h2>Everything You Need to<span> Get Hired</span></h2>
          <p>
            Powerful tools designed to make your placement journey smarter,
            faster, and more effective.
          </p>
        </div>

        <div className="feature-grid">
          {[
            { icon: "🤖", title: "AI Placement Prediction",  desc: "Predict your placement probability using academic, skill, and experience-based data." },
            { icon: "📄", title: "Resume Analysis",           desc: "Upload your resume and let NLP identify your skills, experience, and strengths." },
            { icon: "🎯", title: "Smart Job Matching",        desc: "Discover jobs that match your skills and qualifications automatically." },
            { icon: "📊", title: "Placement Analytics",       desc: "Track applications, interviews, offers, and placement performance from one dashboard." },
          ].map(({ icon, title, desc }) => (
            <div className="feature-card" key={title}>
              <div className="feature-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta" id="about">
        <div>
          <span className="section-label">START YOUR JOURNEY</span>
          <h2>Your Dream Career<br />Starts <span>Here.</span></h2>
          <p>
            Create your profile, discover opportunities, and let AI help you
            take the next step in your career.
          </p>
          <button className="primary-btn" onClick={() => navigate("/register")}>
            Create Your Profile →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact">
        <div className="footer-logo"><span>Career</span>AI</div>
        <p>AI-Powered Career &amp; Placement Management System</p>
        <p className="copyright">© 2026 CareerAI · Academic Project</p>
      </footer>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   App — router
   All original paths are preserved exactly.
───────────────────────────────────────────────────────────── */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Student routes (unchanged) ── */}
        <Route path="/"             element={<Home />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/jobs"         element={<Jobs />} />
        <Route path="/jobs/:id"     element={<JobDetails />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/resume"       element={<ResumeAnalysis />} />
        <Route path="/skill-gap"    element={<SkillGap />} />

        {/* ── Recruiter routes ── */}
        <Route path="/recruiter/login"                  element={<RecruiterLogin />} />
        <Route path="/recruiter/register"               element={<RecruiterRegister />} />
        <Route path="/recruiter/dashboard"              element={<RecruiterDashboard />} />
        <Route path="/recruiter/jobs"                   element={<RecruiterJobs />} />
        <Route path="/recruiter/jobs/new"               element={<RecruiterJobForm />} />
        <Route path="/recruiter/jobs/:jobId/edit"       element={<RecruiterJobForm />} />
        <Route path="/recruiter/applicants"             element={<RecruiterApplicants />} />
        <Route path="/recruiter/jobs/:jobId/applicants" element={<RecruiterApplicants />} />
        <Route path="/recruiter/profile"                element={<RecruiterProfile />} />

        {/* ── Admin routes ── */}
        <Route path="/admin/login"     element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
