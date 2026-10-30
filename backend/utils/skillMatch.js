"use strict";
/**
 * utils/skillMatch.js
 *
 * Shared skill-matching utilities used by jobRoutes.js and skillGapRoutes.js.
 *
 * Extracted from jobRoutes.js to avoid duplication.
 * The logic is identical to what was previously inline in jobRoutes.js;
 * jobRoutes.js now imports from here, preserving existing behaviour exactly.
 *
 * Exports:
 *   SKILL_SYNONYMS   — canonical synonym map (22 entries)
 *   STATIC_JOBS      — the six hardcoded student-facing jobs
 *   skillMatches(studentSkill, jobSkill)  → boolean
 *   applyMatchScores(jobs, studentSkills) → annotated jobs array
 *   normaliseDbJob(doc)                  → flat job object
 */

// ============================================================
// NLP SKILL SYNONYM MAP
//
// Each key is a canonical skill name (lowercase).
// Values are unambiguous aliases — alternate spellings,
// abbreviations, or common shorthand for the same skill.
//
// Deliberately conservative:
//   SQL, MySQL, PostgreSQL are NOT equivalent.
//   AWS is NOT equated with other cloud platforms.
//   Docker is NOT equated with Kubernetes.
// ============================================================
const SKILL_SYNONYMS = {
  "javascript":       ["js", "es6", "es2015", "ecmascript", "vanilla js", "vanilla javascript"],
  "react":            ["reactjs", "react.js", "react js"],
  "node.js":          ["node", "nodejs", "node js"],
  "express":          ["express.js", "expressjs", "express js"],
  "typescript":       ["ts"],
  "machine learning": ["ml", "machine-learning", "machinelearning"],
  "mongodb":          ["mongo"],
  "tensorflow":       ["tf", "tensor flow", "tensor-flow"],
  "html":             ["html5"],
  "css":              ["css3"],
  "dsa":              [
    "data structures",
    "data structures and algorithms",
    "data structures & algorithms",
    "algorithms",
  ],
  "pandas":           ["pandas library", "pd"],
  "numpy":            ["np", "numerical python"],
  "scikit-learn":     ["sklearn", "scikit learn"],
  "python":           ["py"],
  "aws":              ["amazon web services", "amazon aws"],
  "docker":           ["docker container", "dockerize"],
  "postgresql":       ["postgres"],
  "next.js":          ["nextjs", "next js"],
  "vue.js":           ["vue", "vuejs"],
  "angular":          ["angularjs", "angular js"],
  "redis":            ["redis cache", "redis db"],
  "graphql":          ["gql", "graph ql"],
  "kotlin":           [],
  "swift":            [],
};

// ============================================================
// skillMatches(studentSkill, jobSkill)
//
// Three-step synonym-aware comparison (unchanged from original):
//   1. Exact match (case-insensitive)
//   2. Containment — one string contains the other
//   3. Synonym lookup in both directions
// ============================================================
function skillMatches(studentSkill, jobSkill) {
  const s = studentSkill.toLowerCase().trim();
  const j = jobSkill.toLowerCase().trim();
  if (s === j) return true;
  if (s.includes(j) || j.includes(s)) return true;
  const jobSynonyms     = SKILL_SYNONYMS[j] || [];
  if (jobSynonyms.includes(s)) return true;
  const studentSynonyms = SKILL_SYNONYMS[s] || [];
  if (studentSynonyms.includes(j)) return true;
  return false;
}

// ============================================================
// STATIC JOBS  (the six hardcoded student-facing jobs)
// Copied verbatim from jobRoutes.js; both files now import
// from here so there is a single source of truth.
// ============================================================
const STATIC_JOBS = [
  {
    id: "1",
    company: "TechNova Solutions",
    role: "MERN Stack Developer",
    location: "Ahmedabad / Remote",
    type: "Full Time",
    salary: "₹6 - ₹9 LPA",
    skills: ["React", "Node.js", "MongoDB"],
    description:
      "We are looking for a motivated MERN Stack Developer to build modern and scalable web applications.",
    requirements: [
      "Good knowledge of React.js",
      "Understanding of Node.js and Express",
      "Knowledge of MongoDB",
      "Strong JavaScript fundamentals",
      "Basic understanding of REST APIs",
    ],
  },
  {
    id: "2",
    company: "DataSphere Technologies",
    role: "Data Analyst",
    location: "Bangalore",
    type: "Full Time",
    salary: "₹5 - ₹8 LPA",
    skills: ["Python", "SQL", "Pandas"],
    description:
      "Join our analytics team and work with real-world datasets to generate meaningful business insights.",
    requirements: [
      "Python programming",
      "SQL knowledge",
      "Knowledge of Pandas",
      "Data visualization basics",
      "Analytical thinking",
    ],
  },
  {
    id: "3",
    company: "AI Vision Labs",
    role: "Machine Learning Engineer",
    location: "Hyderabad",
    type: "Full Time",
    salary: "₹7 - ₹12 LPA",
    skills: ["Python", "Machine Learning", "TensorFlow"],
    description:
      "Work on machine learning solutions and AI-powered applications using modern technologies.",
    requirements: [
      "Python programming",
      "Machine Learning fundamentals",
      "Knowledge of TensorFlow",
      "Understanding of data preprocessing",
      "Basic mathematics and statistics",
    ],
  },
  {
    id: "4",
    company: "CloudCore Systems",
    role: "Backend Developer",
    location: "Pune / Remote",
    type: "Full Time",
    salary: "₹6 - ₹10 LPA",
    skills: ["Node.js", "Express", "MongoDB"],
    description:
      "Build secure and scalable backend systems and REST APIs for enterprise applications.",
    requirements: [
      "Node.js",
      "Express.js",
      "MongoDB",
      "REST API development",
      "Git and GitHub",
    ],
  },
  {
    id: "5",
    company: "PixelSoft Technologies",
    role: "Frontend Developer",
    location: "Mumbai",
    type: "Full Time",
    salary: "₹4 - ₹7 LPA",
    skills: ["React", "JavaScript", "CSS"],
    description:
      "Create responsive and interactive user interfaces for modern web applications.",
    requirements: [
      "React.js",
      "JavaScript",
      "HTML and CSS",
      "Responsive design",
      "Git basics",
    ],
  },
  {
    id: "6",
    company: "InnovateX",
    role: "Software Engineer",
    location: "Ahmedabad",
    type: "Full Time",
    salary: "₹5 - ₹9 LPA",
    skills: ["Java", "DSA", "SQL"],
    description:
      "Develop software solutions while working with an experienced engineering team.",
    requirements: [
      "Java programming",
      "Data Structures and Algorithms",
      "SQL",
      "Problem solving",
      "Object Oriented Programming",
    ],
  },
];

// ============================================================
// applyMatchScores(jobs, studentSkills)
//
// Annotates each job with { match, matchedSkills, missingSkills }.
// Unchanged from original jobRoutes.js implementation.
// ============================================================
function applyMatchScores(jobs, studentSkills) {
  return jobs.map((job) => {
    if (!studentSkills || studentSkills.length === 0) {
      return {
        ...job,
        match:         0,
        matchedSkills: [],
        missingSkills: [...(job.skills || [])],
      };
    }

    const matchedSkills = (job.skills || []).filter((jobSkill) =>
      studentSkills.some((s) => skillMatches(s, jobSkill))
    );
    const missingSkills = (job.skills || []).filter((jobSkill) =>
      !studentSkills.some((s) => skillMatches(s, jobSkill))
    );
    const matchPercent =
      job.skills && job.skills.length > 0
        ? Math.round((matchedSkills.length / job.skills.length) * 100)
        : 0;

    return { ...job, match: matchPercent, matchedSkills, missingSkills };
  });
}

// ============================================================
// normaliseDbJob(doc)
//
// Converts a Mongoose Job lean-document to the same flat shape
// as a static job.  id = _id.toString() (24-char hex string).
// ============================================================
function normaliseDbJob(doc) {
  return {
    id:           doc._id.toString(),
    _id:          doc._id,
    company:      doc.company,
    role:         doc.role,
    location:     doc.location   || "",
    type:         doc.type       || "Full Time",
    salary:       doc.salary     || "",
    skills:       doc.skills     || [],
    description:  doc.description  || "",
    requirements: doc.requirements || [],
    status:       doc.status,
    isDbJob:      true,
  };
}

module.exports = { SKILL_SYNONYMS, STATIC_JOBS, skillMatches, applyMatchScores, normaliseDbJob };
