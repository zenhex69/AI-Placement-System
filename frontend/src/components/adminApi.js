/**
 * adminApi.js
 *
 * Centralised API helper for the admin portal. Mirrors recruiterApi.js.
 *
 * localStorage keys (kept separate from student/recruiter so roles cannot
 * cross-access each other's pages on the client side; the backend also
 * enforces the "admin" role via requireRole on every protected route):
 *   "adminToken" — JWT string (written by AdminLogin)
 *   "admin"      — JSON object with admin profile { _id, name, email }
 *
 * Every authenticated call attaches:
 *   Authorization: Bearer <adminToken>
 *
 * Every function returns { data, error, status } for uniform error handling.
 */

const BASE = "http://localhost:5000";

/* ── Token / profile helpers ───────────────────────────────────── */

export function getToken() {
  return localStorage.getItem("adminToken") || "";
}

export function getAdmin() {
  try { return JSON.parse(localStorage.getItem("admin") || "null"); }
  catch { return null; }
}

export function saveAuth(token, admin) {
  localStorage.setItem("adminToken", token);
  localStorage.setItem("admin", JSON.stringify(admin));
}

export function clearAuth() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("admin");
}

/* ── Core fetch wrapper ─────────────────────────────────────────── */

async function api(method, path, body = null, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = `Bearer ${getToken()}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { data: null, error: data.message || `HTTP ${res.status}`, status: res.status };
    }
    return { data, error: null, status: res.status };
  } catch {
    return { data: null, error: "Cannot connect to the server.", status: 0 };
  }
}

/* ── Auth + dashboard endpoints ────────────────────────────────── */

// POST /api/admin/login  (public)
export const adminLogin = (body) =>
  api("POST", "/api/admin/login", body);

// GET /api/admin/stats  (admin-authenticated)
// Returns platform-wide metrics: students, recruiters, jobs,
// applications, and computed placement predictions.
export const getStats = () =>
  api("GET", "/api/admin/stats", null, true);
