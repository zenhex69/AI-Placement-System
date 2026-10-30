/**
 * predictionRoutes.js
 *
 * ML-based Placement Prediction using Logistic Regression.
 *
 * IMPORTANT — DATA DISCLAIMER:
 * The training dataset below is SYNTHETIC, created for academic/demo purposes only.
 * It is NOT based on real placement outcomes from any institution.
 * The resulting predictions are illustrative and should NOT be treated as
 * scientifically validated placement probabilities.
 *
 * Architecture:
 *  - Training happens ONCE at module load (server startup), ~2ms.
 *  - Prediction happens per API call using the trained weights.
 *  - The student profile is fetched from MongoDB — the frontend only supplies the studentId.
 *
 * Endpoint: POST /api/predict/:studentId
 */

const express = require("express");
const Student = require("../models/Student");

const router = express.Router();

// ============================================================
// SECTION 1: SYNTHETIC TRAINING DATASET
// ============================================================
//
// Each record represents one synthetic student profile.
// Fields:
//   cgpa        — on a 10-point scale (0–10)
//   skillCount  — number of technical skills
//   hasExp      — 1 if the student has any work/internship experience, 0 otherwise
//   projectCount— number of projects listed
//   hasTechSkill— 1 if the student has at least one in-demand tech skill
//   placed      — 1 = placed, 0 = not placed (SYNTHETIC label)
//
// Dataset is intentionally varied to prevent the model from
// relying on a single feature.
//
const TRAINING_DATA = [
  // Strong all-round profiles → placed
  { cgpa: 9.2, skillCount: 6, hasExp: 1, projectCount: 4, hasTechSkill: 1, placed: 1 },
  { cgpa: 8.8, skillCount: 5, hasExp: 1, projectCount: 3, hasTechSkill: 1, placed: 1 },
  { cgpa: 8.5, skillCount: 7, hasExp: 1, projectCount: 4, hasTechSkill: 1, placed: 1 },
  { cgpa: 9.0, skillCount: 4, hasExp: 0, projectCount: 3, hasTechSkill: 1, placed: 1 },
  { cgpa: 8.2, skillCount: 6, hasExp: 1, projectCount: 5, hasTechSkill: 1, placed: 1 },
  { cgpa: 7.8, skillCount: 5, hasExp: 1, projectCount: 3, hasTechSkill: 1, placed: 1 },
  { cgpa: 8.0, skillCount: 8, hasExp: 0, projectCount: 4, hasTechSkill: 1, placed: 1 },
  { cgpa: 7.5, skillCount: 6, hasExp: 1, projectCount: 4, hasTechSkill: 1, placed: 1 },

  // Good CGPA, moderate skills → mostly placed
  { cgpa: 8.1, skillCount: 3, hasExp: 1, projectCount: 2, hasTechSkill: 1, placed: 1 },
  { cgpa: 7.6, skillCount: 4, hasExp: 0, projectCount: 3, hasTechSkill: 1, placed: 1 },
  { cgpa: 8.4, skillCount: 2, hasExp: 1, projectCount: 2, hasTechSkill: 0, placed: 1 },
  { cgpa: 7.9, skillCount: 3, hasExp: 0, projectCount: 2, hasTechSkill: 1, placed: 0 },

  // Moderate CGPA, strong skills → mixed
  { cgpa: 6.8, skillCount: 7, hasExp: 1, projectCount: 5, hasTechSkill: 1, placed: 1 },
  { cgpa: 6.5, skillCount: 6, hasExp: 1, projectCount: 3, hasTechSkill: 1, placed: 1 },
  { cgpa: 7.0, skillCount: 5, hasExp: 0, projectCount: 3, hasTechSkill: 1, placed: 1 },
  { cgpa: 6.2, skillCount: 4, hasExp: 1, projectCount: 2, hasTechSkill: 1, placed: 0 },
  { cgpa: 7.2, skillCount: 3, hasExp: 0, projectCount: 2, hasTechSkill: 0, placed: 0 },
  { cgpa: 6.9, skillCount: 2, hasExp: 1, projectCount: 1, hasTechSkill: 0, placed: 0 },

  // Low CGPA → generally not placed (with exceptions for strong skills)
  { cgpa: 5.8, skillCount: 8, hasExp: 1, projectCount: 5, hasTechSkill: 1, placed: 1 },
  { cgpa: 5.5, skillCount: 3, hasExp: 0, projectCount: 2, hasTechSkill: 0, placed: 0 },
  { cgpa: 5.0, skillCount: 2, hasExp: 0, projectCount: 1, hasTechSkill: 0, placed: 0 },
  { cgpa: 5.2, skillCount: 1, hasExp: 0, projectCount: 1, hasTechSkill: 0, placed: 0 },
  { cgpa: 6.0, skillCount: 2, hasExp: 0, projectCount: 1, hasTechSkill: 0, placed: 0 },
  { cgpa: 6.1, skillCount: 5, hasExp: 0, projectCount: 3, hasTechSkill: 1, placed: 0 },

  // Edge cases — high CGPA but no skills/projects
  { cgpa: 9.5, skillCount: 0, hasExp: 0, projectCount: 0, hasTechSkill: 0, placed: 0 },
  { cgpa: 8.7, skillCount: 1, hasExp: 0, projectCount: 0, hasTechSkill: 0, placed: 0 },

  // Strong skills, no experience, average CGPA
  { cgpa: 7.1, skillCount: 7, hasExp: 0, projectCount: 4, hasTechSkill: 1, placed: 1 },
  { cgpa: 6.7, skillCount: 6, hasExp: 0, projectCount: 3, hasTechSkill: 1, placed: 0 },

  // Well-rounded mid-tier
  { cgpa: 7.4, skillCount: 4, hasExp: 1, projectCount: 3, hasTechSkill: 1, placed: 1 },
  { cgpa: 7.3, skillCount: 3, hasExp: 1, projectCount: 2, hasTechSkill: 0, placed: 0 },
];

// ============================================================
// SECTION 2: FEATURE ENGINEERING
// Normalise raw student values into the 0–1 range the model
// expects. Keeps training and prediction consistent.
// ============================================================

/**
 * List of in-demand technical skills used to derive hasTechSkill.
 * Matched case-insensitively against the student's skills array.
 */
const IN_DEMAND_SKILLS = [
  "react", "node.js", "nodejs", "python", "javascript",
  "java", "machine learning", "data science", "sql",
  "mongodb", "express", "django", "flask", "typescript",
  "aws", "docker", "tensorflow", "spring boot",
];

/**
 * Convert a raw student profile into the 5-feature vector
 * [cgpaNorm, skillNorm, hasExp, projectNorm, hasTechSkill]
 * that the logistic regression model consumes.
 *
 * @param {number} cgpa         - CGPA on a 10-point scale
 * @param {string[]} skills     - array of skill strings
 * @param {string} experience   - experience text (empty string = no experience)
 * @param {string[]} projects   - array of project strings
 * @returns {number[]} feature vector of length 5
 */
function buildFeatureVector(cgpa, skills, experience, projects) {
  const cgpaNorm    = Math.min(Number(cgpa || 0) / 10, 1);
  const skillNorm   = Math.min((skills || []).length / 10, 1);
  const hasExp      = experience && experience.trim().length > 0 ? 1 : 0;
  const projectNorm = Math.min((projects || []).length / 5, 1);

  const skillsLower = (skills || []).map((s) => s.toLowerCase());
  const hasTechSkill = IN_DEMAND_SKILLS.some((ts) =>
    skillsLower.some((s) => s.includes(ts))
  )
    ? 1
    : 0;

  return [cgpaNorm, skillNorm, hasExp, projectNorm, hasTechSkill];
}

// ============================================================
// SECTION 3: LOGISTIC REGRESSION — MATHS UTILITIES
// ============================================================

/**
 * Sigmoid activation: maps any real number to (0, 1).
 * σ(z) = 1 / (1 + e^(-z))
 *
 * @param {number} z
 * @returns {number}
 */
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Compute the linear combination of weights and features.
 * z = bias + w1*x1 + w2*x2 + ... + wn*xn
 *
 * @param {number[]} weights - [bias, w1, w2, ..., wn]
 * @param {number[]} features - [x1, x2, ..., xn]
 * @returns {number}
 */
function linearCombination(weights, features) {
  // weights[0] is the bias term
  return (
    weights[0] +
    features.reduce((sum, xi, i) => sum + weights[i + 1] * xi, 0)
  );
}

/**
 * Run one forward pass: compute predicted probability for each
 * training example given the current weights.
 *
 * @param {number[][]} X - matrix of feature vectors
 * @param {number[]}   weights
 * @returns {number[]} predicted probabilities
 */
function forwardPass(X, weights) {
  return X.map((features) =>
    sigmoid(linearCombination(weights, features))
  );
}

// ============================================================
// SECTION 4: GRADIENT DESCENT TRAINING
// ============================================================

/**
 * Train a logistic regression model on the given dataset using
 * batch gradient descent.
 *
 * @param {number[][]} X        - feature matrix (n_samples × n_features)
 * @param {number[]}   y        - binary labels (0 or 1), length n_samples
 * @param {number}     lr       - learning rate
 * @param {number}     epochs   - number of gradient descent iterations
 * @returns {number[]} trained weights [bias, w1, ..., wn]
 */
function trainLogisticRegression(X, y, lr = 0.5, epochs = 1000) {
  const nSamples  = X.length;
  const nFeatures = X[0].length;

  // Initialise all weights (including bias at index 0) to zero
  const weights = new Array(nFeatures + 1).fill(0);

  for (let epoch = 0; epoch < epochs; epoch++) {
    const predictions = forwardPass(X, weights);

    // Compute gradients for each weight
    const gradients = new Array(nFeatures + 1).fill(0);

    for (let i = 0; i < nSamples; i++) {
      const error = predictions[i] - y[i]; // prediction error for sample i

      // Bias gradient
      gradients[0] += error;

      // Feature weight gradients
      for (let j = 0; j < nFeatures; j++) {
        gradients[j + 1] += error * X[i][j];
      }
    }

    // Update weights: w = w - (lr / n) * gradient
    for (let k = 0; k < weights.length; k++) {
      weights[k] -= (lr / nSamples) * gradients[k];
    }
  }

  return weights;
}

// ============================================================
// SECTION 5: MODEL TRAINING AT SERVER STARTUP
// Training runs ONCE when this module is first required.
// All subsequent API calls use the already-trained weights.
// ============================================================

// Build feature matrix X and label vector y from the synthetic dataset
const X_train = TRAINING_DATA.map((row) =>
  buildFeatureVector(row.cgpa, new Array(row.skillCount).fill("react"),
    row.hasExp ? "internship" : "",
    new Array(row.projectCount).fill("project"))
);
const y_train = TRAINING_DATA.map((row) => row.placed);

// Train — happens once, synchronously, in ~2ms
const trainedWeights = trainLogisticRegression(X_train, y_train, 0.5, 1000);

console.log("🤖 Placement prediction model trained successfully.");
console.log("   Weights:", trainedWeights.map((w) => w.toFixed(4)).join(", "));

// ============================================================
// SECTION 6: PREDICTION ENDPOINT
// POST /api/predict/:studentId
//
// Fetches the student's profile from MongoDB.
// Builds the feature vector from the stored profile data.
// Runs the trained logistic regression to get a probability.
// Returns placement chance (0–100) and supporting details.
// ============================================================

/**
 * predictPlacement(student)
 *
 * Shared prediction helper — the single source of truth for placement
 * predictions. Used by POST /:studentId (student-facing) and by the
 * admin stats aggregate so both paths rely on the same trained model.
 *
 * Accepts a student document (or any object exposing cgpa, skills,
 * projects, experience) and returns:
 *   { placementChance, label, breakdown }
 *
 * placementChance is clamped to [1, 99] to avoid overconfident 0%/100%.
 */
function predictPlacement(student) {
  const { cgpa, skills, projects, experience } = student || {};

  // Build normalised feature vector from the stored profile
  const features = buildFeatureVector(cgpa, skills, experience, projects);

  // Run trained model: compute probability of placement
  const z           = linearCombination(trainedWeights, features);
  const probability = sigmoid(z);

  // Convert to 0–100 placement chance, clamped to [1, 99]
  // Clamped to avoid showing "0%" or "100%" which would be overconfident
  const placementChance = Math.min(
    99,
    Math.max(1, Math.round(probability * 100))
  );

  // Determine human-readable label
  let label;
  if (placementChance >= 70) {
    label = "High Potential";
  } else if (placementChance >= 45) {
    label = "Good Potential";
  } else {
    label = "Needs Improvement";
  }

  // Feature contribution breakdown (for display in Dashboard)
  // These are approximate point contributions, not exact SHAP values.
  const breakdown = {
    cgpa:       Math.round(features[0] * 40),   // CGPA contributes up to 40 pts
    skills:     Math.round(features[1] * 25),   // Skills contribute up to 25 pts
    experience: features[2] === 1 ? 15 : 0,     // Experience: 15 or 0
    projects:   Math.round(features[3] * 10),   // Projects contribute up to 10 pts
  };

  return { placementChance, label, breakdown };
}

const MODEL_INFO =
  "Logistic Regression trained on 30 synthetic student profiles. " +
  "Predictions are for academic/demo purposes only and do not " +
  "represent real placement outcomes.";

router.post("/:studentId", async (req, res) => {
  try {
    // Fetch student from MongoDB — never trust profile data from the frontend
    const student = await Student.findById(req.params.studentId).select(
      "name cgpa skills projects experience" // password is never selected
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const result = predictPlacement(student);

    res.json({ ...result, modelInfo: MODEL_INFO });
  } catch (error) {
    console.error("Prediction error:", error.message);
    res.status(500).json({ message: "Prediction failed", error: error.message });
  }
});

module.exports = router;
// Exported for reuse by admin aggregation (same model = single source of truth)
module.exports.predictPlacement = predictPlacement;
module.exports.MODEL_INFO = MODEL_INFO;
