"use strict";
/**
 * routes/skillGapRoutes.js
 *
 * GET /api/skill-gap/:jobId
 *
 * Returns a detailed skill-gap analysis for the authenticated student
 * against a specific job (static or Open DB recruiter job).
 *
 * ── AUTHENTICATION ────────────────────────────────────────────────────────────
 * Requires a valid student JWT:  Authorization: Bearer <token>
 * Student identity is derived from req.user.id (decoded from the token).
 * The student ID is NEVER read from the URL, query string, or request body,
 * so one student cannot obtain another student's analysis.
 *
 * ── JOB VISIBILITY ────────────────────────────────────────────────────────────
 * Static jobs ("1"–"6") are always available.
 * DB recruiter jobs are only returned if status === "Open".
 * Draft and Closed jobs return 404.
 *
 * ── RESPONSE SHAPE ────────────────────────────────────────────────────────────
 * {
 *   student:  { name, skillCount },
 *   job:      { id, role, company, location, type, salary, skills, description, requirements },
 *   analysis: { matchedSkills, missingSkills, coverage, totalRequired },
 *   roadmap:  [{ skill, priority, group, relevance, project, nextStep }]
 * }
 *
 * coverage is null (not 0) when totalRequired === 0, preventing division-by-zero
 * and misleading 100% display.
 *
 * ── ROADMAP GENERATION ────────────────────────────────────────────────────────
 * Fully deterministic — no external AI, no API keys, no fabricated URLs.
 * Each missing skill is classified into a group, given a priority number,
 * a relevance note, a concrete project exercise, and a plain learning directive.
 */

const express   = require("express");
const mongoose  = require("mongoose");
const Student   = require("../models/Student");
const Job       = require("../models/Job");
const { verifyToken, requireRole } = require("../middleware/auth");
const { STATIC_JOBS, skillMatches, applyMatchScores, normaliseDbJob } = require("../utils/skillMatch");

const router = express.Router();

// All skill-gap routes require a valid student JWT
router.use(verifyToken, requireRole("student"));

// ============================================================
// ROADMAP DATA
// Deterministic per-skill recommendations.
// Keys are canonical lowercase skill names.
// Each entry covers the three most common misspellings / aliases
// via the SKILL_SYNONYMS map in skillMatch.js — no extra work needed here.
// ============================================================

// Skill category classification
const SKILL_GROUPS = {
  // Foundations
  "javascript": "Foundations", "html": "Foundations", "css": "Foundations",
  "python": "Foundations", "java": "Foundations", "sql": "Foundations",
  "git": "Foundations", "github": "Foundations", "dsa": "Foundations",
  "c": "Foundations", "c++": "Foundations",
  // Core job skills
  "react": "Core job skills", "node.js": "Core job skills", "express": "Core job skills",
  "mongodb": "Core job skills", "typescript": "Core job skills",
  "machine learning": "Core job skills", "tensorflow": "Core job skills",
  "pandas": "Core job skills", "numpy": "Core job skills",
  "scikit-learn": "Core job skills", "rest api": "Core job skills",
  "django": "Core job skills", "flask": "Core job skills",
  "spring boot": "Core job skills", "next.js": "Core job skills",
  "vue.js": "Core job skills", "angular": "Core job skills",
  "graphql": "Core job skills", "postgresql": "Core job skills",
  "mysql": "Core job skills", "data science": "Core job skills",
  // Infrastructure & ops
  "aws": "Infrastructure & ops", "docker": "Infrastructure & ops",
  "redis": "Infrastructure & ops", "kubernetes": "Infrastructure & ops",
  "kotlin": "Infrastructure & ops", "swift": "Infrastructure & ops",
};

// Per-skill project ideas and learning directives
const SKILL_DETAILS = {
  "javascript":       { project: "Build a to-do app or quiz game using only vanilla JS (no frameworks).", nextStep: "Study: variables, functions, promises, async/await, DOM manipulation." },
  "react":            { project: "Build a job-listing UI with search filtering using React hooks.", nextStep: "Study: JSX, useState, useEffect, component props, React Router basics." },
  "node.js":          { project: "Build a REST API with Express that performs CRUD on a JSON file.", nextStep: "Study: Node modules, npm, file system, HTTP module, async patterns." },
  "express":          { project: "Create a REST API with Express including routes, middleware and error handling.", nextStep: "Study: routing, middleware chain, request/response objects, error-handling middleware." },
  "mongodb":          { project: "Build a student profile CRUD API storing data in MongoDB Atlas.", nextStep: "Study: collections, documents, BSON types, Mongoose schemas, find/update/delete." },
  "python":           { project: "Write a Python script that reads a CSV, cleans the data, and outputs summary stats.", nextStep: "Study: data types, control flow, functions, file I/O, pip packages." },
  "java":             { project: "Implement a linked list and binary search tree in Java with unit tests.", nextStep: "Study: OOP principles, classes/interfaces, generics, collections, exceptions." },
  "sql":              { project: "Design a schema for a library system and write queries with JOINs, GROUP BY, subqueries.", nextStep: "Study: SELECT, JOIN, aggregation, indexes, normalisation (1NF–3NF)." },
  "machine learning": { project: "Train a logistic regression model on a public dataset (Iris or Titanic) and evaluate accuracy.", nextStep: "Study: supervised vs unsupervised learning, train/test split, evaluation metrics, overfitting." },
  "tensorflow":       { project: "Build and train a simple neural network on MNIST digits using TensorFlow/Keras.", nextStep: "Study: tensors, layers, activation functions, loss functions, optimisers, model.fit()." },
  "pandas":           { project: "Load a CSV dataset, clean nulls, compute statistics, and produce a pivot table.", nextStep: "Study: DataFrame, Series, read_csv, groupby, merge, fillna, apply." },
  "numpy":            { project: "Implement matrix multiplication and gradient descent from scratch using NumPy arrays.", nextStep: "Study: ndarray, broadcasting, indexing, vectorised operations, random module." },
  "scikit-learn":     { project: "Build a classification pipeline with preprocessing, model training, cross-validation and accuracy report.", nextStep: "Study: Pipeline, StandardScaler, train_test_split, GridSearchCV, classification_report." },
  "typescript":       { project: "Migrate an existing JavaScript module to TypeScript with strict typing enabled.", nextStep: "Study: type annotations, interfaces, generics, union types, tsconfig options." },
  "html":             { project: "Build a fully semantic, accessible personal portfolio page using only HTML.", nextStep: "Study: semantic elements, forms, accessibility attributes (alt, aria-label, role)." },
  "css":              { project: "Recreate a UI mockup using CSS Grid and Flexbox, with responsive breakpoints.", nextStep: "Study: box model, flexbox, grid, media queries, CSS custom properties." },
  "git":              { project: "Practise branching, merging, rebasing, and resolving merge conflicts in a local repo.", nextStep: "Study: commit, branch, merge, rebase, reset, stash, .gitignore." },
  "github":           { project: "Create a GitHub repo, open a pull request, request a review, and merge it.", nextStep: "Study: remote, push, pull, clone, fork, pull requests, GitHub Actions basics." },
  "dsa":              { project: "Solve 10 medium-difficulty problems on arrays, trees, and graphs using your chosen language.", nextStep: "Study: arrays, linked lists, stacks, queues, trees, graphs, sorting, Big-O notation." },
  "rest api":         { project: "Design and document a RESTful API for a blog platform using OpenAPI/Swagger.", nextStep: "Study: HTTP verbs, status codes, resource naming, versioning, authentication patterns." },
  "django":           { project: "Build a blog application with user authentication using Django and Django REST Framework.", nextStep: "Study: models, views, URLs, templates, ORM queries, migrations." },
  "flask":            { project: "Create a REST API with Flask, SQLAlchemy, and JWT authentication.", nextStep: "Study: routes, request context, blueprints, SQLAlchemy models, marshmallow serialisation." },
  "next.js":          { project: "Build a server-side-rendered portfolio site with dynamic routing and API routes.", nextStep: "Study: pages, getServerSideProps vs getStaticProps, dynamic routes, Image optimisation." },
  "vue.js":           { project: "Build an interactive form wizard with validation using Vue 3 Composition API.", nextStep: "Study: reactive(), ref(), computed, watchers, component lifecycle, Vue Router." },
  "angular":          { project: "Build a product catalogue SPA with Angular services, components, and RxJS observables.", nextStep: "Study: modules, components, services, dependency injection, RxJS basics, HttpClient." },
  "postgresql":       { project: "Create a schema with foreign keys, write window functions, and optimise with indexes.", nextStep: "Study: psql CLI, data types, JOIN types, transactions, EXPLAIN ANALYZE." },
  "mysql":            { project: "Design an e-commerce database schema and practise complex joins and stored procedures.", nextStep: "Study: storage engines, indexes, transactions, EXPLAIN, replication basics." },
  "aws":              { project: "Deploy a Node.js API to AWS EC2 and serve a static frontend from S3 + CloudFront.", nextStep: "Study: IAM, EC2, S3, VPC basics, security groups, Route 53." },
  "docker":           { project: "Containerise a Node.js + MongoDB app using Docker Compose with environment variables.", nextStep: "Study: Dockerfile, images, containers, volumes, networks, docker-compose.yml." },
  "redis":            { project: "Add Redis caching to a REST API to reduce repeated database reads.", nextStep: "Study: key-value store concepts, TTL, pub/sub, Redis CLI, node-redis client." },
  "graphql":          { project: "Build a GraphQL API with Apollo Server for a social-media-style feed.", nextStep: "Study: schema definition language, queries, mutations, resolvers, subscriptions." },
  "spring boot":      { project: "Build a REST CRUD API with Spring Boot, JPA and H2/PostgreSQL.", nextStep: "Study: @RestController, @Entity, JpaRepository, application.properties, Maven." },
  "data science":     { project: "Complete an end-to-end data science project: load data, EDA, model, evaluate, present.", nextStep: "Study: Pandas, NumPy, Matplotlib, Seaborn, Scikit-learn pipeline." },
  "kotlin":           { project: "Rewrite a small Java utility class in Kotlin using data classes and extension functions.", nextStep: "Study: null safety, data classes, coroutines basics, standard library functions." },
  "swift":            { project: "Build a simple iOS to-do list app using SwiftUI and local persistence.", nextStep: "Study: SwiftUI views, state management, navigation, UserDefaults, Codable." },
};

const DEFAULT_DETAIL = (skill) => ({
  project:  `Build a small project that uses ${skill} as a core dependency and commit it to GitHub.`,
  nextStep: `Study the official documentation for ${skill} and complete the beginner tutorial.`,
});

// Priority weight — skills listed first in the job's skills array are higher priority
function getPriority(skill, jobSkills) {
  const idx = jobSkills.findIndex(
    (js) => js.toLowerCase().trim() === skill.toLowerCase().trim()
  );
  return idx >= 0 ? idx + 1 : jobSkills.length + 1;
}

function getGroup(skill) {
  return SKILL_GROUPS[skill.toLowerCase().trim()] || "Core job skills";
}

function getDetail(skill) {
  return SKILL_DETAILS[skill.toLowerCase().trim()] || DEFAULT_DETAIL(skill);
}

// ============================================================
// buildRoadmap(missingSkills, job)
// Returns an array of roadmap items sorted by priority.
// ============================================================
function buildRoadmap(missingSkills, job) {
  return missingSkills
    .map((skill) => {
      const priority = getPriority(skill, job.skills || []);
      const group    = getGroup(skill);
      const detail   = getDetail(skill);
      return {
        skill,
        priority,
        group,
        relevance: `Required for this ${job.role} role at ${job.company}.`,
        project:   detail.project,
        nextStep:  detail.nextStep,
      };
    })
    .sort((a, b) => a.priority - b.priority);
}

// ============================================================
// GET /api/skill-gap/:jobId
// ============================================================
router.get("/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    // ── 1. Resolve student from JWT (never from request params) ──────────────
    const student = await Student.findById(req.user.id).select("name skills");
    if (!student) {
      return res.status(404).json({ message: "Student account not found." });
    }
    const studentSkills = student.skills || [];

    // ── 2. Resolve job ────────────────────────────────────────────────────────
    let job = null;

    // Static job check first (IDs "1"–"6")
    const staticJob = STATIC_JOBS.find((j) => j.id === jobId);
    if (staticJob) {
      job = staticJob;
    } else {
      // DB job — must be a valid ObjectId and status === "Open"
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(404).json({ message: "Job not found." });
      }
      const dbDoc = await Job.findById(jobId).lean();
      if (!dbDoc) {
        return res.status(404).json({ message: "Job not found." });
      }
      if (dbDoc.status !== "Open") {
        // Draft and Closed recruiter jobs are not available for skill-gap analysis
        return res.status(404).json({ message: "Job not found." });
      }
      job = normaliseDbJob(dbDoc);
    }

    // ── 3. Skill comparison ───────────────────────────────────────────────────
    const jobSkills     = job.skills || [];
    const totalRequired = jobSkills.length;

    // Coverage is null (not 0) when there are no required skills — prevents
    // dividing by zero and showing a misleading 100%.
    let matchedSkills, missingSkills, coverage;
    if (totalRequired === 0) {
      matchedSkills = [];
      missingSkills = [];
      coverage      = null;
    } else {
      matchedSkills = jobSkills.filter((jobSkill) =>
        studentSkills.some((s) => skillMatches(s, jobSkill))
      );
      missingSkills = jobSkills.filter((jobSkill) =>
        !studentSkills.some((s) => skillMatches(s, jobSkill))
      );
      coverage = Math.round((matchedSkills.length / totalRequired) * 100);
    }

    // ── 4. Build roadmap ──────────────────────────────────────────────────────
    const roadmap = buildRoadmap(missingSkills, job);

    // ── 5. Send response ──────────────────────────────────────────────────────
    return res.json({
      student: {
        name:       student.name,
        skillCount: studentSkills.length,
      },
      job: {
        id:           job.id,
        role:         job.role,
        company:      job.company,
        location:     job.location     || "",
        type:         job.type         || "",
        salary:       job.salary       || "",
        skills:       jobSkills,
        description:  job.description  || "",
        requirements: job.requirements || [],
      },
      analysis: {
        matchedSkills,
        missingSkills,
        coverage,          // null when totalRequired === 0
        totalRequired,
        totalMatched:      matchedSkills.length,
      },
      roadmap,
    });
  } catch (err) {
    console.error("Skill-gap error:", err.message);
    return res.status(500).json({
      message: "Failed to generate skill-gap analysis.",
      error:   err.message,
    });
  }
});

module.exports = router;
