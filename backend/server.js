require("dotenv").config();

// ── Startup config check ──────────────────────────────────────────────────────
// Log whether required env vars are present — never log their values.
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "LOADED ✅" : "MISSING ❌");
console.log("MONGO_URI: ", process.env.MONGO_URI   ? "LOADED ✅" : "MISSING ❌");

const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");

// ── Route modules ─────────────────────────────────────────────────────────────
const studentRoutes      = require("./routes/studentRoutes");
const applicationRoutes  = require("./routes/applicationRoutes");
const resumeRoutes       = require("./routes/resumeRoutes");
const jobRoutes          = require("./routes/jobRoutes");
const predictionRoutes   = require("./routes/predictionRoutes");

// Phase 2 — recruiter portal
const recruiterRoutes    = require("./routes/recruiterRoutes");
const recruiterJobRoutes = require("./routes/recruiterJobRoutes");

// Phase 3 — skill-gap analysis
const skillGapRoutes = require("./routes/skillGapRoutes");

// Phase 4 — admin dashboard
const adminRoutes = require("./routes/adminRoutes");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Student / existing routes (unchanged) ────────────────────────────────────
app.use("/api/students",     studentRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/resume",       resumeRoutes);
app.use("/api/jobs",         jobRoutes);
app.use("/api/predict",      predictionRoutes);

// ── Recruiter routes ──────────────────────────────────────────────────────────
// /api/recruiters  — public auth endpoints (register, login, /me)
// /api/recruiter   — protected job & applicant management
app.use("/api/recruiters", recruiterRoutes);
app.use("/api/recruiter",  recruiterJobRoutes);

// ── Skill-gap analysis (student-authenticated) ────────────────────────────────
app.use("/api/skill-gap", skillGapRoutes);

// ── Admin dashboard (admin-authenticated) ────────────────────────────────────
app.use("/api/admin", adminRoutes);

const Application = require("./models/Application");
const Job         = require("./models/Job");

// ── MongoDB ───────────────────────────────────────────────────────────────────
async function runMigration() {
  try {
    const unlinked = await Application.find({ recruiterJobRef: null });
    let backfilled = 0;
    for (const app of unlinked) {
      if (mongoose.Types.ObjectId.isValid(app.jobId)) {
        const dbJob = await Job.findById(app.jobId);
        if (dbJob) {
          app.recruiterJobRef = dbJob._id;
          await app.save();
          backfilled++;
        }
      }
    }
    if (backfilled > 0) {
      console.log(`✅ Backfilled ${backfilled} existing applications with recruiterJobRef.`);
    }
  } catch (migErr) {
    console.warn("Migration check notice:", migErr.message);
  }
}

async function connectDB() {
  const primaryUri = process.env.MONGO_URI;
  const localUri = "mongodb://127.0.0.1:27017/CareerAI";

  try {
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 2500 });
    console.log("✅ MongoDB connected successfully to primary database");
    await runMigration();
  } catch (err) {
    console.warn("⚠️ Primary MongoDB Atlas connection not reachable (check IP whitelist):", err.message);
    console.log("🔄 Connecting to local MongoDB instance (mongodb://127.0.0.1:27017/CareerAI)...");
    try {
      await mongoose.connect(localUri);
      console.log("✅ Connected successfully to local MongoDB");
      await runMigration();
    } catch (localErr) {
      console.error("❌ Both MongoDB connections failed:", localErr.message);
    }
  }
}

connectDB();

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "AI Placement System Backend is running!" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
