const mongoose = require("mongoose");

// All valid application statuses — shared so routes import this directly
// rather than re-declaring the list and risking drift.
const APPLICATION_STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Selected",
  "Rejected",
];

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    // For static jobs: "1"–"6" (short string).
    // For DB jobs: MongoDB ObjectId.toString() (24-char hex).
    // The two namespaces never collide.
    jobId: {
      type: String,
      required: true,
    },

    company: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      default: "",
    },

    salary: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: "Applied",
    },

    // ── Recruiter portal extension (additive — null for static-job applications) ──
    // Soft reference to the Job document so recruiter queries can filter by job
    // without scanning every application document.
    // Existing documents that pre-date this field will have recruiterJobRef: null;
    // this is safe because null is excluded from any { recruiterJobRef: <id> } query.
    recruiterJobRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
      index: true,          // sparse-style: null values are common, index still helps
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: duplicate-application guard query pattern
// (student + jobId uniqueness is enforced in the route, not the schema,
//  to produce a human-readable error rather than a Mongoose duplicate key error)
applicationSchema.index({ student: 1, jobId: 1 });

// Export statuses so recruiterJobRoutes can validate transitions without drift
applicationSchema.statics.APPLICATION_STATUSES = APPLICATION_STATUSES;

module.exports = mongoose.model("Application", applicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;