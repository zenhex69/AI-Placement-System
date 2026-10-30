/**
 * AdminLayout.jsx
 *
 * Sidebar shell for admin-facing pages. Mirrors the structure of
 * RecruiterLayout.jsx (student/portal shells) but:
 *  - reads "adminToken" / "admin" localStorage keys (written by AdminLogin)
 *  - shows admin-specific nav items
 *  - removes "adminToken" and "admin" on logout → /admin/login
 *  - shows the admin's name + "Administrator" role in the sidebar footer
 *
 * Uses the same CSS classes (.app-shell, .sidebar, .nav-item, .topbar …)
 * defined in App.css. The only new classes are .admin-avatar and
 * .admin-topbar-badge (a violet accent, distinct from student teal and
 * recruiter amber), added at the bottom of App.css.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/* ── Inline SVG icons (consistent with the other layouts) ─────── */
const Icon = {
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Shield: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
};

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: Icon.Dashboard },
];

export default function AdminLayout({ children, pageTitle }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const prevPath  = useRef(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Read admin from localStorage — same pattern as the other layouts */
  const admin = (() => {
    try { return JSON.parse(localStorage.getItem("admin") || "null"); }
    catch { return null; }
  })();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      setSidebarOpen(false);
    }
  });

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/admin/login");
  };

  const initials = admin?.name
    ? admin.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "A";

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
            onClick={() => navigate("/admin/dashboard")}
            style={{ cursor: "pointer" }}
          >
            <span>Career</span>AI
          </span>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Admin Portal</p>

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
          {admin && (
            <div className="sidebar-user-card">
              <div className="sidebar-avatar admin-avatar">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{admin.name}</div>
                <div className="sidebar-user-role" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon.Shield />
                  Administrator
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
            <span className="topbar-title">{pageTitle || "Admin Portal"}</span>
          </div>

          <div className="topbar-right">
            <span className="topbar-badge admin-topbar-badge">
              <Icon.Shield />
              Admin
            </span>
            {admin && (
              <div
                className="profile-avatar admin-avatar"
                style={{ cursor: "default", width: 34, height: 34, fontSize: 13 }}
                title={admin.email}
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
