"use strict";
/**
 * routes/adminRoutes.js
 *
 * Admin-only endpoints. Mounted at /api/admin.
 *
 * ── AUTHENTICATION ────────────────────────────────────────────────────────────
 * POST /api/admin/login      — public (admin login)
 * All other routes:  verifyToken → requireRole("admin")
 *
 * Admin identity always comes from req.user.id (decoded JWT).
 * Never read from request body or query string.
 *
 * ── ENDPOINT SUMMARY ─────────────────────────────────────────────────────────
 * POST  /api/admin/login
 * GET   /api/admin/stats
 * GET   /api/admin/students              ?page &limit &search
 * GET   /api/admin/students/:id
 * PATCH /api/admin/students/:id/suspend
 * GET   /api/admin/recruiters            ?page &limit &search
 * GET   /api/admin/recruiters/:id
 * PATCH /api/admin/recruiters/:id/suspend
 * GET   /api/admin/jobs                  ?page &limit &status &search
 * GET   /api/admin/jobs/:id
 * PATCH /api/admin/jobs/:id/status
 * GET   /api/admin/applications          ?page &limit &status &search
 *
 * ── SECURITY ─────────────────────────────────────────────────────────────────
 * - Passwords are NEVER returned in any response.
 * - Student resume paths are NOT returned in list views.
 * - Admin cannot create jobs or update application statuses — those remain
 *   recruiter-owned actions with recruiter ownership enforcement.
 * - Pagination defaults: page=1, limit=20, max limit=100.
 */

require("dotenv").config();

const express   = require("express");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const mongoose  = require("mongoose");
const crypto    = require("crypto");   // Node built-in — used for the JWT jti claim

const Admin       = require("../models/Admin");
const Student     = require("../models/Student");
const Recruiter   = require("../models/Recruiter");
const Job         = require("../models/Job");
const Application = require("../models/Application");
const { verifyToken, requireRole } = require("../middleware/auth");
// Reuse the trained placement-prediction model (single source of truth) for
// the admin predictions aggregate. Loaded once at startup; cached on re-require.
const { predictPlacement, MODEL_INFO } = require("./predictionRoutes");

const router = express.Router();

// ── Static job count (in-memory constant — these are never in MongoDB) ────────
const STATIC_JOB_COUNT = 6;

// ── Safe field selectors ──────────────────────────────────────────────────────
// Never include password in any response.
const STUDENT_SAFE_FIELDS   = "-password -resume";   // resume excluded from list views
const RECRUITER_SAFE_FIELDS = "-password";

// ── Pagination helper ─────────────────────────────────────────────────────────
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

// ── Strip password helper ─────────────────────────────────────────────────────
function safe(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.password;
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/login  (public — no auth middleware)
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
    // Generic message — no enumeration
    const invalid = () => res.status(401).json({ message: "Invalid email or password." });
    if (!admin) return invalid();

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return invalid();

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("FATAL: JWT_SECRET missing.");
      return res.status(500).json({ message: "Server configuration error." });
    }

    // role: "admin" is hard-coded here — NEVER sourced from DB or request body
    // jti: a unique-per-issued-token id so two logins (even in the same second)
    // never produce an identical JWT. verifyToken only reads id/email/role, so
    // adding jti does not change authentication or authorization behavior.
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: "admin", jti: crypto.randomUUID() },
      secret,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Admin login successful.",
      token,
      admin: { _id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error("Admin login error:", err.message);
    return res.status(500).json({ message: "Login failed.", error: err.message });
  }
});

// ── All routes below require a valid admin JWT ────────────────────────────────
router.use(verifyToken, requireRole("admin"));

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/stats
// Returns platform-wide metrics in a single call.
// All counts come from MongoDB aggregation — never hardcoded.
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/stats", async (req, res) => {
  try {
    const [
      totalStudents,
      totalRecruiters,
      totalApplications,
      jobStatusCounts,
      appStatusCounts,
      suspendedStudents,
      suspendedRecruiters,
    ] = await Promise.all([
      Student.countDocuments(),
      Recruiter.countDocuments(),
      Application.countDocuments(),
      Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Student.countDocuments({ isSuspended: true }),
      Recruiter.countDocuments({ isSuspended: true }),
    ]);

    // Flatten aggregation results into plain objects
    const jobsByStatus = {};
    jobStatusCounts.forEach(({ _id, count }) => { jobsByStatus[_id] = count; });

    const appsByStatus = {};
    appStatusCounts.forEach(({ _id, count }) => { appsByStatus[_id] = count; });

    // ── Placement predictions (existing student data + the trained model) ──
    // Predictions are computed on demand from student profiles; they are not
    // stored. This reuses the SAME model as POST /api/predict/:studentId.
    let predictions = null;
    try {
      const predStudents = await Student.find({}).select("cgpa skills projects experience");
      let sum = 0;
      const byLabel = { highPotential: 0, goodPotential: 0, needsImprovement: 0 };
      for (const s of predStudents) {
        const p = predictPlacement(s);
        sum += p.placementChance;
        if (p.label === "High Potential") byLabel.highPotential++;
        else if (p.label === "Good Potential") byLabel.goodPotential++;
        else byLabel.needsImprovement++;
      }
      predictions = {
        totalEvaluated: predStudents.length,
        averageChance: predStudents.length ? Math.round(sum / predStudents.length) : 0,
        byLabel,
        modelInfo: MODEL_INFO,
        note: "Computed on demand from student profiles and the trained model. Predictions are not stored.",
      };
    } catch (predErr) {
      console.error("Admin predictions stat error:", predErr.message);
      predictions = { error: "Failed to compute placement predictions." };
    }

    return res.json({
      students: {
        total:     totalStudents,
        suspended: suspendedStudents,
        active:    totalStudents - suspendedStudents,
      },
      recruiters: {
        total:     totalRecruiters,
        suspended: suspendedRecruiters,
        active:    totalRecruiters - suspendedRecruiters,
      },
      jobs: {
        // DB jobs only — static jobs are separate
        totalDb:  (jobStatusCounts.reduce((s, x) => s + x.count, 0)),
        byStatus: {
          Draft:    jobsByStatus["Draft"]    || 0,
          Open:     jobsByStatus["Open"]     || 0,
          Closed:   jobsByStatus["Closed"]   || 0,
          Archived: jobsByStatus["Archived"] || 0,
        },
        staticJobsCount: STATIC_JOB_COUNT,
      },
      applications: {
        total:    totalApplications,
        byStatus: {
          Applied:       appsByStatus["Applied"]       || 0,
          "Under Review":appsByStatus["Under Review"]  || 0,
          Shortlisted:   appsByStatus["Shortlisted"]   || 0,
          Interview:     appsByStatus["Interview"]     || 0,
          Selected:      appsByStatus["Selected"]      || 0,
          Rejected:      appsByStatus["Rejected"]      || 0,
        },
        // "Selected" reflects recruiter-marked status only.
        // It does not confirm offer acceptance or actual employment.
        selectionNote: "Counts applications marked 'Selected' by recruiters. Not a confirmed placement metric.",
      },
      predictions,
    });
  } catch (err) {
    console.error("Admin stats error:", err.message);
    return res.status(500).json({ message: "Failed to fetch statistics.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/students   ?page=1 &limit=20 &search=<name|email|college>
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/students", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search } = req.query;

    const filter = {};
    if (search && search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: re }, { email: re }, { college: re }];
    }

    const [students, total] = await Promise.all([
      Student.find(filter)
        .select(STUDENT_SAFE_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments(filter),
    ]);

    return res.json({
      students,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Admin students error:", err.message);
    return res.status(500).json({ message: "Failed to fetch students.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/students/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/students/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Student not found." });
    }
    const student = await Student.findById(req.params.id).select(STUDENT_SAFE_FIELDS);
    if (!student) return res.status(404).json({ message: "Student not found." });

    // Also fetch this student's application count
    const applicationCount = await Application.countDocuments({ student: student._id });

    return res.json({ student, applicationCount });
  } catch (err) {
    console.error("Admin student detail error:", err.message);
    return res.status(500).json({ message: "Failed to fetch student.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/students/:id/suspend
// Toggles isSuspended. Reversible.
// ═══════════════════════════════════════════════════════════════════════════════
router.patch("/students/:id/suspend", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Student not found." });
    }
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    student.isSuspended = !student.isSuspended;
    await student.save();

    const action = student.isSuspended ? "suspended" : "reactivated";
    return res.json({
      message: `Student account ${action}.`,
      student: { _id: student._id, name: student.name, email: student.email, isSuspended: student.isSuspended },
    });
  } catch (err) {
    console.error("Suspend student error:", err.message);
    return res.status(500).json({ message: "Failed to update student.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/recruiters   ?page &limit &search=<name|email|company>
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/recruiters", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search } = req.query;

    const filter = {};
    if (search && search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: re }, { email: re }, { company: re }];
    }

    const [recruiters, total] = await Promise.all([
      Recruiter.find(filter)
        .select(RECRUITER_SAFE_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Recruiter.countDocuments(filter),
    ]);

    // Attach job count per recruiter
    const ids = recruiters.map(r => r._id);
    const jobCounts = await Job.aggregate([
      { $match: { recruiter: { $in: ids } } },
      { $group: { _id: "$recruiter", count: { $sum: 1 } } },
    ]);
    const jobCountMap = {};
    jobCounts.forEach(({ _id, count }) => { jobCountMap[_id.toString()] = count; });

    const result = recruiters.map(r => ({
      ...r.toObject(),
      jobCount: jobCountMap[r._id.toString()] || 0,
    }));

    return res.json({
      recruiters: result,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Admin recruiters error:", err.message);
    return res.status(500).json({ message: "Failed to fetch recruiters.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/recruiters/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/recruiters/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Recruiter not found." });
    }
    const recruiter = await Recruiter.findById(req.params.id).select(RECRUITER_SAFE_FIELDS);
    if (!recruiter) return res.status(404).json({ message: "Recruiter not found." });

    const [jobs, appCount] = await Promise.all([
      Job.find({ recruiter: recruiter._id })
        .select("role company status createdAt")
        .sort({ createdAt: -1 })
        .limit(10),
      Application.countDocuments({ recruiterJobRef: { $in: await Job.find({ recruiter: recruiter._id }).distinct("_id") } }),
    ]);

    return res.json({ recruiter, recentJobs: jobs, totalApplicationsReceived: appCount });
  } catch (err) {
    console.error("Admin recruiter detail error:", err.message);
    return res.status(500).json({ message: "Failed to fetch recruiter.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/recruiters/:id/suspend
// ═══════════════════════════════════════════════════════════════════════════════
router.patch("/recruiters/:id/suspend", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Recruiter not found." });
    }
    const recruiter = await Recruiter.findById(req.params.id);
    if (!recruiter) return res.status(404).json({ message: "Recruiter not found." });

    recruiter.isSuspended = !recruiter.isSuspended;
    await recruiter.save();

    const action = recruiter.isSuspended ? "suspended" : "reactivated";
    return res.json({
      message: `Recruiter account ${action}.`,
      recruiter: { _id: recruiter._id, name: recruiter.name, email: recruiter.email, company: recruiter.company, isSuspended: recruiter.isSuspended },
    });
  } catch (err) {
    console.error("Suspend recruiter error:", err.message);
    return res.status(500).json({ message: "Failed to update recruiter.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/jobs   ?page &limit &status &search=<role|company>
// Returns recruiter-created DB jobs only.
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/jobs", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, search } = req.query;

    const VALID_STATUSES = ["Draft", "Open", "Closed", "Archived"];
    const filter = {};

    if (status && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }
    if (search && search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ role: re }, { company: re }];
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("recruiter", "name email company")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    // Attach applicant counts
    const jobIds = jobs.map(j => j._id);
    const appCounts = await Application.aggregate([
      { $match: { recruiterJobRef: { $in: jobIds } } },
      { $group: { _id: "$recruiterJobRef", count: { $sum: 1 } } },
    ]);
    const appCountMap = {};
    appCounts.forEach(({ _id, count }) => { appCountMap[_id.toString()] = count; });

    const result = jobs.map(j => {
      const obj = j.toObject();
      // Remove recruiter password if it somehow leaked through populate
      if (obj.recruiter) delete obj.recruiter.password;
      return { ...obj, applicantCount: appCountMap[j._id.toString()] || 0 };
    });

    return res.json({
      jobs: result,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      staticJobsNote: `${STATIC_JOB_COUNT} built-in static jobs are not in the database and are not included here.`,
    });
  } catch (err) {
    console.error("Admin jobs error:", err.message);
    return res.status(500).json({ message: "Failed to fetch jobs.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/jobs/:id
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/jobs/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Job not found." });
    }
    const job = await Job.findById(req.params.id)
      .populate("recruiter", "name email company");
    if (!job) return res.status(404).json({ message: "Job not found." });

    const applicantCount = await Application.countDocuments({ recruiterJobRef: job._id });
    const obj = job.toObject();
    if (obj.recruiter) delete obj.recruiter.password;

    return res.json({ job: { ...obj, applicantCount } });
  } catch (err) {
    console.error("Admin job detail error:", err.message);
    return res.status(500).json({ message: "Failed to fetch job.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/jobs/:id/status
// Admin can close or archive a job. Cannot set to Open or Draft —
// those remain recruiter-controlled actions.
// ═══════════════════════════════════════════════════════════════════════════════
router.patch("/jobs/:id/status", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Job not found." });
    }

    const { status } = req.body;
    const ADMIN_ALLOWED = ["Closed", "Archived"];
    if (!status || !ADMIN_ALLOWED.includes(status)) {
      return res.status(400).json({
        message: `Admin can only set status to: ${ADMIN_ALLOWED.join(", ")}`,
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    const previous = job.status;
    job.status = status;
    await job.save();

    return res.json({
      message: `Job status changed from '${previous}' to '${status}'.`,
      job: { _id: job._id, role: job.role, company: job.company, status: job.status },
    });
  } catch (err) {
    console.error("Admin job status error:", err.message);
    return res.status(500).json({ message: "Failed to update job.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/applications   ?page &limit &status &search=<role|company>
// Read-only. Admin does not update application statuses — recruiter-owned.
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/applications", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, search } = req.query;

    const VALID_APP_STATUSES = ["Applied", "Under Review", "Shortlisted", "Interview", "Selected", "Rejected"];
    const filter = {};

    if (status && VALID_APP_STATUSES.includes(status)) {
      filter.status = status;
    }
    if (search && search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ role: re }, { company: re }];
    }

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate("student", "name email college degree branch cgpa")
        .populate("recruiterJobRef", "role company status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments(filter),
    ]);

    // Strip any passwords that might have been accidentally populated
    const result = applications.map(a => {
      const obj = a.toObject();
      if (obj.student) delete obj.student.password;
      return obj;
    });

    return res.json({
      applications: result,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Admin applications error:", err.message);
    return res.status(500).json({ message: "Failed to fetch applications.", error: err.message });
  }
});

module.exports = router;
