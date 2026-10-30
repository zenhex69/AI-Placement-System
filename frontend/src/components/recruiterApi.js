/**
 * recruiterApi.js
 *
 * Centralised API helper for all recruiter-portal fetch calls.
 *
 * localStorage keys:
 *   "recruiterToken"  — JWT string (written by RecruiterLogin)
 *   "recruiter"       — JSON object with recruiter profile (written by RecruiterLogin)
 *
 * All authenticated calls attach:
 *   Authorization: Bearer <recruiterToken>
 *
 * Every function returns { data, error, status } so callers can handle
 * errors uniformly without try/catch repetition in every component.
 */

const BASE = "http://localhost:5000";

/* ── Token helpers ────────────────────────────────────────────── */

export function getToken() {
  return localStorage.getItem("recruiterToken") || "";
}

export function getRecruiter() {
  try { return JSON.parse(localStorage.getItem("recruiter") || "null"); }
  catch { return null; }
}

export function saveAuth(token, recruiter) {
  localStorage.setItem("recruiterToken", token);
  localStorage.setItem("recruiter", JSON.stringify(recruiter));
}

export function clearAuth() {
  localStorage.removeItem("recruiterToken");
  localStorage.removeItem("recruiter");
}

/* ── Core fetch wrapper ───────────────────────────────────────── */

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

/* ── Auth endpoints ───────────────────────────────────────────── */

export const recruiterRegister = (body) =>
  api("POST", "/api/recruiters/register", body);

export const recruiterLogin = (body) =>
  api("POST", "/api/recruiters/login", body);

export const recruiterMe = () =>
  api("GET", "/api/recruiters/me", null, true);

// Update the authenticated recruiter's own profile (name, company, phone).
// Email, password, role, and suspension status are not editable here.
export const updateRecruiterProfile = (body) =>
  api("PUT", "/api/recruiters/me", body, true);

/* ── Job endpoints ────────────────────────────────────────────── */

export const createJob = (body) =>
  api("POST", "/api/recruiter/jobs", body, true);

export const listOwnJobs = (status = "") => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return api("GET", `/api/recruiter/jobs${qs}`, null, true);
};

export const getOwnJob = (jobId) =>
  api("GET", `/api/recruiter/jobs/${jobId}`, null, true);

export const updateJob = (jobId, body) =>
  api("PUT", `/api/recruiter/jobs/${jobId}`, body, true);

export const updateJobStatus = (jobId, status) =>
  api("PATCH", `/api/recruiter/jobs/${jobId}/status`, { status }, true);

export const deleteJob = (jobId) =>
  api("DELETE", `/api/recruiter/jobs/${jobId}`, null, true);

/* ── Applicant endpoints ──────────────────────────────────────── */

export const listAllApplicants = () =>
  api("GET", "/api/recruiter/applicants", null, true);

export const listJobApplicants = (jobId) =>
  api("GET", `/api/recruiter/jobs/${jobId}/applicants`, null, true);

export const getApplicantDetail = (jobId, appId) =>
  api("GET", `/api/recruiter/jobs/${jobId}/applicants/${appId}`, null, true);

export const updateApplicationStatus = (jobId, appId, status) =>
  api("PATCH", `/api/recruiter/jobs/${jobId}/applicants/${appId}/status`, { status }, true);
