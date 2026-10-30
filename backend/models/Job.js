/**
 * models/Job.js
 *
 * Persistent job listings created by recruiters.
 *
 * ID COMPATIBILITY:
 *   The six hardcoded "static" jobs in jobRoutes.js use short string IDs
 *   "1"–"6".  MongoDB-created jobs use their 24-character ObjectId hex string
 *   (job._id.toString()) as the jobId stored in Application documents.
 *   The two namespaces never collide because a 24-char hex string can never
 *   equal "1"–"6".
 *
 * OWNERSHIP:
 *   Every mutating route checks that the authenticated recruiter's id matches
 *   the 'recruiter' field before proceeding.  The 'recruiter' field is always
 *   set from req.user.id (JWT) — never from the request body.
 *
 * STATUS:
 *   "Draft"    — created but not yet visible to students
 *   "Open"     — published and included in student job-matching
 *   "Closed"   — no longer accepting applications
 *   "Archived" — soft-deleted / archived; historical applications preserved
 */

"use strict";

const mongoose = require("mongoose");

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Internship", "Contract"];
const JOB_STATUSES     = ["Draft", "Open", "Closed", "Archived"];

const jobSchema = new mongoose.Schema(
  {
    // ── Ownership ──────────────────────────────────────────────────────────
    recruiter: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Recruiter",
      required: [true, "Recruiter reference is required"],
      index:    true,
    },

    // ── Core listing fields ────────────────────────────────────────────────
    role: {
      type:      String,
      required:  [true, "Job role/title is required"],
      trim:      true,
      minlength: [2,   "Role must be at least 2 characters"],
      maxlength: [150, "Role must be at most 150 characters"],
    },

    company: {
      type:      String,
      required:  [true, "Company name is required"],
      trim:      true,
      minlength: [2,   "Company name must be at least 2 characters"],
      maxlength: [150, "Company name must be at most 150 characters"],
    },

    location: {
      type:    String,
      default: "",
      trim:    true,
      maxlength: [150, "Location must be at most 150 characters"],
    },

    type: {
      type:    String,
      enum:    {
        values:  EMPLOYMENT_TYPES,
        message: `Employment type must be one of: ${EMPLOYMENT_TYPES.join(", ")}`,
      },
      default: "Full Time",
    },

    salary: {
      type:    String,
      default: "",
      trim:    true,
      maxlength: [100, "Salary description must be at most 100 characters"],
    },

    description: {
      type:    String,
      default: "",
      trim:    true,
      maxlength: [5000, "Description must be at most 5000 characters"],
    },

    // One requirement per array element, e.g. ["3+ years Node.js", "REST API design"]
    requirements: {
      type:    [String],
      default: [],
    },

    // Skill names used by the synonym-aware matching algorithm in jobRoutes.js
    skills: {
      type:    [String],
      default: [],
    },

    // ── Publication control ────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    {
        values:  JOB_STATUSES,
        message: `Status must be one of: ${JOB_STATUSES.join(", ")}`,
      },
      default: "Draft",
      index:   true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Compound index: common recruiter dashboard query pattern
jobSchema.index({ recruiter: 1, status: 1 });

// Expose constants so routes can reference them without re-declaring
jobSchema.statics.EMPLOYMENT_TYPES = EMPLOYMENT_TYPES;
jobSchema.statics.JOB_STATUSES     = JOB_STATUSES;

module.exports = mongoose.model("Job", jobSchema);
