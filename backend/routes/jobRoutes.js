"use strict";
/**
 * routes/jobRoutes.js
 *
 * Student-facing job endpoints.  No authentication required (existing behaviour).
 *
 * GET /api/jobs/match/:studentId
 *     Returns all available jobs (static + Open DB) with AI skill-match scores.
 *     Response shape unchanged — every job has id, company, role, skills,
 *     match, matchedSkills, missingSkills.
 *
 * GET /api/jobs/:jobId
 *     Single-job lookup.  Checks static array first, then MongoDB.
 *     Returns 404 for unknown IDs and Draft/Closed DB jobs.
 *     Optionally attaches match scores if ?studentId= is provided.
 *
 * The six hardcoded static jobs are NEVER removed.
 * Their IDs ("1"–"6") never collide with MongoDB ObjectIds.
 *
 * NOTE: SKILL_SYNONYMS, skillMatches, applyMatchScores, normaliseDbJob
 * and STATIC_JOBS are now imported from utils/skillMatch.js so the
 * identical logic can be shared with skillGapRoutes.js without duplication.
 */

const express   = require("express");
const mongoose  = require("mongoose");
const Student   = require("../models/Student");
const Job       = require("../models/Job");
const {
  STATIC_JOBS,
  applyMatchScores,
  normaliseDbJob,
} = require("../utils/skillMatch");

const router = express.Router();

// ============================================================
// GET /api/jobs/match/:studentId
// ============================================================
router.get("/match/:studentId", async (req, res) => {
  try {
    const student       = await Student.findById(req.params.studentId).select("skills");
    const studentSkills = student?.skills || [];

    let dbJobs = [];
    try {
      const dbDocs = await Job.find({ status: "Open" }).lean();
      dbJobs = dbDocs.map(normaliseDbJob);
    } catch (dbErr) {
      console.error("DB job fetch failed, using static jobs only:", dbErr.message);
    }

    const allJobs        = [...STATIC_JOBS, ...dbJobs];
    const jobsWithMatch  = applyMatchScores(allJobs, studentSkills);
    jobsWithMatch.sort((a, b) => b.match - a.match);

    return res.json({ jobs: jobsWithMatch });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to calculate job matches",
      error:   error.message,
    });
  }
});

// ============================================================
// GET /api/jobs/:jobId
// ============================================================
router.get("/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    // 1. Static array first
    const staticJob = STATIC_JOBS.find((j) => j.id === jobId);
    if (staticJob) {
      const { studentId } = req.query;
      if (studentId) {
        const student = await Student.findById(studentId).select("skills").catch(() => null);
        const [scored] = applyMatchScores([staticJob], student?.skills || []);
        return res.json({ job: scored });
      }
      return res.json({
        job: { ...staticJob, match: 0, matchedSkills: [], missingSkills: [...staticJob.skills] },
      });
    }

    // 2. MongoDB
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(404).json({ message: "Job not found." });
    }

    const dbDoc = await Job.findById(jobId).lean();
    if (!dbDoc || dbDoc.status !== "Open") {
      return res.status(404).json({ message: "Job not found." });
    }

    const normalisedJob = normaliseDbJob(dbDoc);
    const { studentId } = req.query;
    if (studentId) {
      const student = await Student.findById(studentId).select("skills").catch(() => null);
      const [scored] = applyMatchScores([normalisedJob], student?.skills || []);
      return res.json({ job: scored });
    }

    return res.json({
      job: { ...normalisedJob, match: 0, matchedSkills: [], missingSkills: [...normalisedJob.skills] },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch job",
      error:   error.message,
    });
  }
});

module.exports = router;
