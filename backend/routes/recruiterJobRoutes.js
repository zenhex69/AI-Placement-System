/**
 * routes/recruiterJobRoutes.js
 *
 * All recruiter-protected job management and applicant management endpoints.
 * Mounted at: /api/recruiter
 *
 * Every route uses:  verifyToken  →  requireRole("recruiter")
 *
 * ── JOB ENDPOINTS ────────────────────────────────────────────────────────────
 * POST   /api/recruiter/jobs                       Create a new job (status: Draft)
 * GET    /api/recruiter/jobs                       List own jobs (optional ?status= filter)
 * GET    /api/recruiter/jobs/:jobId                View one owned job
 * PUT    /api/recruiter/jobs/:jobId                Edit an owned job
 * PATCH  /api/recruiter/jobs/:jobId/status         Publish (Open) / Close / revert to Draft
 *
 * ── APPLICANT ENDPOINTS ──────────────────────────────────────────────────────
 * GET    /api/recruiter/jobs/:jobId/applicants     List applicants for one owned job
 * GET    /api/recruiter/applicants                 All applicants across owned jobs
 * GET    /api/recruiter/jobs/:jobId/applicants/:appId   View one applicant detail
 * PATCH  /api/recruiter/jobs/:jobId/applicants/:appId/status  Update application status
 *
 * ── SECURITY DESIGN ──────────────────────────────────────────────────────────
 * 1. recruiter identity ALWAYS comes from req.user.id (decoded JWT).
 *    It is NEVER read from the request body.
 * 2. Ownership is enforced with: Job.findOne({ _id: jobId, recruiter: req.user.id })
 *    Returns 404 for both "not found" and "wrong owner" — no information leakage.
 * 3. Student data returned to recruiter is field-scoped — no password, no token.
 * 4. Status transitions are validated against the canonical enum.
 */

"use strict";

const express     = require("express");
const mongoose    = require("mongoose");
const Job         = require("../models/Job");
const Application = require("../models/Application");
const Student     = require("../models/Student");
const Recruiter   = require("../models/Recruiter");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Apply auth middleware to every route in this file
router.use(verifyToken, requireRole("recruiter"));

// ─── Shared constants ────────────────────────────────────────────────────────

const { EMPLOYMENT_TYPES, JOB_STATUSES } = Job;
const VALID_STATUSES = Application.APPLICATION_STATUSES;

// Fields the recruiter is allowed to supply when creating or editing a job.
// 'recruiter' is intentionally excluded — it is always set from req.user.id.
// 'company' is intentionally excluded — it is the AUTHENTICATED recruiter's
// company name (authoritative), set from the recruiter's profile, never the body.
const ALLOWED_JOB_FIELDS = [
  "role", "location", "type",
  "salary", "description", "requirements", "skills",
];

/**
 * Return the authenticated recruiter's company name.
 * The company on a job is authoritative: it must come from the recruiter's own
 * profile (req.user.id), never from an arbitrary frontend-supplied value.
 * Returns null if the recruiter record no longer exists.
 */
async function getRecruiterCompany(recruiterId) {
  const r = await Recruiter.findById(recruiterId).select("company");
  return r ? r.company : null;
}

// Student fields returned to recruiters — never includes password or token.
const STUDENT_PUBLIC_FIELDS =
  "name email phone college degree branch cgpa skills projects experience";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate job creation / edit body.
 * Returns an array of error strings (empty = valid).
 */
function validateJobBody(body, isCreate = false) {
  const errors = [];

  if (isCreate || body.role !== undefined) {
    if (!body.role || typeof body.role !== "string" || body.role.trim().length < 2) {
      errors.push("role: must be at least 2 characters");
    }
  }
  // NOTE: 'company' is NOT validated from the body — it is always derived from
  // the authenticated recruiter's profile (see getRecruiterCompany).
  if (body.type !== undefined && !EMPLOYMENT_TYPES.includes(body.type)) {
    errors.push(`type: must be one of ${EMPLOYMENT_TYPES.join(", ")}`);
  }
  if (body.skills !== undefined && !Array.isArray(body.skills)) {
    errors.push("skills: must be an array of strings");
  }
  if (body.requirements !== undefined && !Array.isArray(body.requirements)) {
    errors.push("requirements: must be an array of strings");
  }
  if (body.description !== undefined && typeof body.description === "string"
      && body.description.length > 5000) {
    errors.push("description: must be at most 5000 characters");
  }
  return errors;
}

/**
 * Return a job owned by req.user.id or send 404.
 * Using the same 404 for "not found" and "not yours" prevents ID enumeration.
 */
async function findOwnedJob(req, res, jobId) {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    res.status(404).json({ message: "Job not found." });
    return null;
  }
  const job = await Job.findOne({ _id: jobId, recruiter: req.user.id });
  if (!job) {
    res.status(404).json({ message: "Job not found." });
    return null;
  }
  return job;
}

/**
 * Build a safe job update object from allowed fields only.
 * Silently drops any field not in ALLOWED_JOB_FIELDS (e.g. 'recruiter').
 */
function pickJobFields(body) {
  const update = {};
  for (const key of ALLOWED_JOB_FIELDS) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  // Trim string fields
  ["role", "company", "location", "salary", "description"].forEach((k) => {
    if (typeof update[k] === "string") update[k] = update[k].trim();
  });
  return update;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOB ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/recruiter/jobs ─────────────────────────────────────────────────
// Create a new job. Status starts as "Draft" regardless of request body.
router.post("/jobs", async (req, res) => {
  try {
    const errors = validateJobBody(req.body, true);
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    const fields = pickJobFields(req.body);

    // company is authoritative: taken from the authenticated recruiter's profile.
    const company = await getRecruiterCompany(req.user.id);
    if (!company) {
      return res.status(404).json({ message: "Recruiter profile not found." });
    }

    const job = await Job.create({
      ...fields,
      company,                  // authoritative — never from the request body
      recruiter: req.user.id,   // always from JWT — never from body
      status: "Draft",          // always starts as Draft
    });

    return res.status(201).json({
      message: "Job created successfully.",
      job,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed.",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }
    console.error("Create job error:", err.message);
    return res.status(500).json({ message: "Failed to create job.", error: err.message });
  }
});

// ─── GET /api/recruiter/jobs ──────────────────────────────────────────────────
// List own jobs. Optional query param: ?status=Draft|Open|Closed
router.get("/jobs", async (req, res) => {
  try {
    const filter = { recruiter: req.user.id };

    if (req.query.status) {
      if (!JOB_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          message: `Invalid status filter. Must be one of: ${JOB_STATUSES.join(", ")}`,
        });
      }
      filter.status = req.query.status;
    }

    const jobs = await Job.find(filter).sort({ createdAt: -1 });

    // Attach applicant counts so the dashboard can show them without extra requests
    const jobIds = jobs.map((j) => j._id);
    const counts = await Application.aggregate([
      { $match: { recruiterJobRef: { $in: jobIds } } },
      { $group: { _id: "$recruiterJobRef", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = c.count; });

    const jobsWithCounts = jobs.map((j) => ({
      ...j.toObject(),
      applicantCount: countMap[j._id.toString()] || 0,
    }));

    return res.json({ jobs: jobsWithCounts });
  } catch (err) {
    console.error("List jobs error:", err.message);
    return res.status(500).json({ message: "Failed to fetch jobs.", error: err.message });
  }
});

// ─── GET /api/recruiter/jobs/:jobId ───────────────────────────────────────────
// View one owned job.
router.get("/jobs/:jobId", async (req, res) => {
  try {
    const job = await findOwnedJob(req, res, req.params.jobId);
    if (!job) return; // findOwnedJob already sent the response

    const applicantCount = await Application.countDocuments({
      recruiterJobRef: job._id,
    });

    return res.json({ job: { ...job.toObject(), applicantCount } });
  } catch (err) {
    console.error("Get job error:", err.message);
    return res.status(500).json({ message: "Failed to fetch job.", error: err.message });
  }
});

// ─── PUT /api/recruiter/jobs/:jobId ───────────────────────────────────────────
// Edit an owned job. Cannot change recruiter or status via this endpoint.
// Status changes go through PATCH /:jobId/status exclusively.
router.put("/jobs/:jobId", async (req, res) => {
  try {
    const job = await findOwnedJob(req, res, req.params.jobId);
    if (!job) return;

    const errors = validateJobBody(req.body, false);
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    const update = pickJobFields(req.body);
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields provided to update." });
    }

    // company is authoritative: re-synced from the authenticated recruiter's
    // profile on every edit (any frontend-supplied company is ignored).
    const company = await getRecruiterCompany(req.user.id);
    if (!company) {
      return res.status(404).json({ message: "Recruiter profile not found." });
    }
    update.company = company;

    Object.assign(job, update);
    await job.save();

    return res.json({ message: "Job updated successfully.", job });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed.",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }
    console.error("Update job error:", err.message);
    return res.status(500).json({ message: "Failed to update job.", error: err.message });
  }
});

// ─── PATCH /api/recruiter/jobs/:jobId/status ──────────────────────────────────
// Publish (Open), Close, or revert to Draft.
// Closed jobs are soft-deleted — data is preserved and can be reopened.
router.patch("/jobs/:jobId/status", async (req, res) => {
  try {
    const job = await findOwnedJob(req, res, req.params.jobId);
    if (!job) return;

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        message: `status is required. Must be one of: ${JOB_STATUSES.join(", ")}`,
      });
    }
    if (!JOB_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${JOB_STATUSES.join(", ")}`,
      });
    }

    job.status = status;
    await job.save();

    const label =
      status === "Open"     ? "published"  :
      status === "Closed"   ? "closed"     :
      status === "Archived" ? "archived"   : "set to Draft";

    return res.json({ message: `Job ${label} successfully.`, job });
  } catch (err) {
    console.error("Update job status error:", err.message);
    return res.status(500).json({ message: "Failed to update job status.", error: err.message });
  }
});

// ─── DELETE /api/recruiter/jobs/:jobId ────────────────────────────────────────
// Soft-delete / archive an owned job listing.
// Preserves all associated application records and their status history.
router.delete("/jobs/:jobId", async (req, res) => {
  try {
    const job = await findOwnedJob(req, res, req.params.jobId);
    if (!job) return;

    // Archive instead of permanently deleting — preserve all applications & history
    job.status = "Archived";
    await job.save();

    return res.json({
      message: "Job archived successfully. All candidate application records and history have been preserved.",
      jobId: job._id,
      status: job.status,
    });
  } catch (err) {
    console.error("Archive job error:", err.message);
    return res.status(500).json({ message: "Failed to archive job.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPLICANT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/recruiter/jobs/:jobId/applicants ────────────────────────────────
// All applicants for one owned job, with student profile data.
router.get("/jobs/:jobId/applicants", async (req, res) => {
  try {
    const job = await findOwnedJob(req, res, req.params.jobId);
    if (!job) return;

    const applications = await Application
      .find({ recruiterJobRef: job._id })
      .populate("student", STUDENT_PUBLIC_FIELDS)
      .sort({ createdAt: -1 });

    return res.json({
      job: { _id: job._id, role: job.role, company: job.company, status: job.status },
      totalApplicants: applications.length,
      applications,
    });
  } catch (err) {
    console.error("List applicants error:", err.message);
    return res.status(500).json({ message: "Failed to fetch applicants.", error: err.message });
  }
});

// ─── GET /api/recruiter/applicants ────────────────────────────────────────────
// Aggregate view: all applicants across every job owned by this recruiter.
// Useful for the recruiter dashboard summary.
router.get("/applicants", async (req, res) => {
  try {
    // Find all jobs owned by this recruiter
    const ownedJobIds = await Job.find({ recruiter: req.user.id }).distinct("_id");

    if (ownedJobIds.length === 0) {
      return res.json({ totalApplicants: 0, applications: [] });
    }

    const applications = await Application
      .find({ recruiterJobRef: { $in: ownedJobIds } })
      .populate("student", STUDENT_PUBLIC_FIELDS)
      .populate("recruiterJobRef", "role company status")
      .sort({ createdAt: -1 });

    return res.json({
      totalApplicants: applications.length,
      applications,
    });
  } catch (err) {
    console.error("All applicants error:", err.message);
    return res.status(500).json({ message: "Failed to fetch applicants.", error: err.message });
  }
});

// ─── GET /api/recruiter/jobs/:jobId/applicants/:appId ─────────────────────────
// Full detail view of a single application + student profile.
router.get("/jobs/:jobId/applicants/:appId", async (req, res) => {
  try {
    const job = await findOwnedJob(req, res, req.params.jobId);
    if (!job) return;

    if (!mongoose.Types.ObjectId.isValid(req.params.appId)) {
      return res.status(404).json({ message: "Application not found." });
    }

    const application = await Application
      .findOne({ _id: req.params.appId, recruiterJobRef: job._id })
      .populate("student", STUDENT_PUBLIC_FIELDS);

    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    return res.json({ application });
  } catch (err) {
    console.error("Get applicant detail error:", err.message);
    return res.status(500).json({ message: "Failed to fetch application.", error: err.message });
  }
});

// ─── PATCH /api/recruiter/jobs/:jobId/applicants/:appId/status ────────────────
// Update the status of one application.
// Validates: job ownership, valid appId, application belongs to this job,
//            new status is in the allowed enum.
router.patch("/jobs/:jobId/applicants/:appId/status", async (req, res) => {
  try {
    const job = await findOwnedJob(req, res, req.params.jobId);
    if (!job) return;

    if (!mongoose.Types.ObjectId.isValid(req.params.appId)) {
      return res.status(404).json({ message: "Application not found." });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        message: `status is required. Allowed values: ${VALID_STATUSES.join(", ")}`,
      });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status '${status}'. Allowed: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const application = await Application.findOne({
      _id: req.params.appId,
      recruiterJobRef: job._id,
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    const previous = application.status;
    application.status = status;
    await application.save();

    return res.json({
      message:     `Application status updated from '${previous}' to '${status}'.`,
      application: {
        _id:    application._id,
        status: application.status,
        jobId:  application.jobId,
      },
    });
  } catch (err) {
    console.error("Update app status error:", err.message);
    return res.status(500).json({ message: "Failed to update status.", error: err.message });
  }
});

module.exports = router;
