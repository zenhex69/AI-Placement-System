import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/* ── Inline SVG icons — no extra dependency needed ─────────────── */
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
  FileText: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Upload: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
      <polyline points="17,6 23,6 23,12"/>
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
  Sparkle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.6H22l-6.4 4.6 2.4 7.8L12 17.4 6 22l2.4-7.8L2 9.6h7.6z"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { label: "Dashboard",   path: "/dashboard",    icon: Icon.Dashboard  },
  { label: "Browse Jobs", path: "/jobs",         icon: Icon.Briefcase  },
  { label: "Applications",path: "/applications", icon: Icon.FileText   },
  { label: "Resume AI",   path: "/resume",       icon: Icon.Upload     },
  { label: "Skill Gap",   path: "/skill-gap",    icon: Icon.TrendingUp },
];

export default function Layout({ children, pageTitle }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const prevPath  = useRef(location.pathname);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const student = (() => {
    try { return JSON.parse(localStorage.getItem("student") || "null"); }
    catch { return null; }
  })();

  /* Close sidebar on route change (mobile).
     We use a ref to track the previous path so setState is only called
     when the route actually changes, not on every render.
     The effect intentionally has no dep array — the ref guards re-entrancy. */
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
    localStorage.removeItem("token");
    localStorage.removeItem("student");
    navigate("/login");
  };

  const initials = student?.name
    ? student.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "S";

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
            onClick={() => navigate("/dashboard")}
            style={{ cursor: "pointer" }}
          >
            <span>Career</span>AI
          </span>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Main Menu</p>

          {NAV_ITEMS.map(({ label, path, icon: NavIcon }) => (
            <button
              key={path}
              className={`nav-item${location.pathname === path ? " active" : ""}`}
              onClick={() => navigate(path)}
            >
              <span className="nav-icon"><NavIcon /></span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {student && (
            <div className="sidebar-user-card">
              <div className="sidebar-avatar">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{student.name}</div>
                <div className="sidebar-user-role">{student.college || "Student"}</div>
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
            <span className="topbar-title">{pageTitle || "CareerAI"}</span>
          </div>

          <div className="topbar-right">
            <span className="topbar-badge">
              <Icon.Sparkle />
              AI Powered
            </span>
            {student && (
              <div
                className="profile-avatar"
                style={{ cursor: "default", width: 34, height: 34, fontSize: 13 }}
                title={student.name}
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
