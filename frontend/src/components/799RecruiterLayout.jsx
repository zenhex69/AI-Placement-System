/**
 * RecruiterLayout.jsx
 *
 * Sidebar shell for all recruiter-facing pages.
 * Mirrors the structure of Layout.jsx (student shell) but:
 *  - reads "recruiter" / "recruiterToken" localStorage keys
 *  - shows recruiter-specific nav items
 *  - removes "recruiterToken" and "recruiter" on logout → /recruiter/login
 *  - shows the recruiter's name + company in the sidebar footer
 *
 * Uses the same CSS classes (.app-shell, .sidebar, .nav-item, .topbar …)
 * defined in App.css — no new structural CSS needed for the shell.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/* ── Inline SVG icons (same set as Layout.jsx for consistency) ─── */
const Icon = {
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  PlusCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Menu: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Building: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { label: "Dashboard",       path: "/recruiter/dashboard",  icon: Icon.Dashboard  },
  { label: "Manage Jobs",     path: "/recruiter/jobs",       icon: Icon.Briefcase  },
  { label: "Post a Job",      path: "/recruiter/jobs/new",   icon: Icon.PlusCircle },
  { label: "Applicants",      path: "/recruiter/applicants", icon: Icon.Users      },
  { label: "Company Profile", path: "/recruiter/profile",    icon: Icon.Building   },
];

export default function RecruiterLayout({ children, pageTitle }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const prevPath  = useRef(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Read recruiter from localStorage — same pattern as Layout.jsx */
  const recruiter = (() => {
    try { return JSON.parse(localStorage.getItem("recruiter") || "null"); }
    catch { return null; }
  })();

  /* Close sidebar on route change (mobile) */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      setSidebarOpen(false);
    }
  });

  /* Lock body scroll when sidebar open on mobile */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const handleLogout = () => {
    localStorage.removeItem("recruiterToken");
    localStorage.removeItem("recruiter");
    navigate("/recruiter/login");
  };

  const initials = recruiter?.name
    ? recruiter.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "R";

  /* Active-path check: /recruiter/jobs/new should highlight "Post a Job",
     not "Manage Jobs". Use startsWith carefully. */
  const isActive = (path) => {
    if (path === "/recruiter/jobs") {
      return location.pathname === "/recruiter/jobs";
    }
    return location.pathname === path || location.pathname.startsWith(path + "/") && path !== "/recruiter/jobs";
  };

  return (
    <div className="app-shell">

      {/* ── Mobile overlay ── */}
      <div
        className={`sidebar-overlay${sidebarOpen ? " visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>

        <div className="sidebar-brand">
          <span
            className="sidebar-logo"
            onClick={() => navigate("/recruiter/dashboard")}
            style={{ cursor: "pointer" }}
          >
            <span>Career</span>AI
          </span>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Recruiter Portal</p>

          {NAV_ITEMS.map(({ label, path, icon: NavIcon }) => (
            <button
              key={path}
              className={`nav-item${isActive(path) ? " active" : ""}`}
              onClick={() => navigate(path)}
            >
              <span className="nav-icon"><NavIcon /></span>
              {label}
            </button>
          ))}

          {/* Divider before student-portal link */}
          <div style={{ margin: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.07)" }} />
          <p className="sidebar-section-label">Other</p>
        </nav>

        <div className="sidebar-footer">
          {recruiter && (
            <div className="sidebar-user-card">
              <div className="sidebar-avatar recruiter-avatar">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{recruiter.name}</div>
                <div className="sidebar-user-role" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Building />
                  {recruiter.company || "Recruiter"}
                </div>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon"><Icon.LogOut /></span>
            Sign Out
          </button>
        </div>

      </aside>

      {/* ── Main content ── */}
      <div className="main-content">

        {/* Top bar */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(s => !s)}
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <Icon.X /> : <Icon.Menu />}
            </button>
            <span className="topbar-title">{pageTitle || "Recruiter Portal"}</span>
          </div>

          <div className="topbar-right">
            <span className="topbar-badge recruiter-topbar-badge">
              <Icon.Building />
              Recruiter
            </span>
            {recruiter && (
              <div
                className="profile-avatar recruiter-avatar"
                style={{ cursor: "default", width: 34, height: 34, fontSize: 13 }}
                title={`${recruiter.name} · ${recruiter.company}`}
              >
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        {children}

      </div>
    </div>
  );
}

/* Tiny inline Building icon for the sidebar role line */
function Building() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}
