/**
 * routes/recruiterRoutes.js
 *
 * Public recruiter authentication endpoints.
 * Mounted at: /api/recruiters
 *
 * POST /api/recruiters/register  — create a recruiter account
 * POST /api/recruiters/login     — authenticate, receive JWT
 * GET  /api/recruiters/me        — return own profile (token required)
 *
 * Security notes:
 *  - Passwords are hashed with bcrypt before storage; never returned.
 *  - Role is hard-coded to "recruiter" in the JWT payload — never read
 *    from the request body, preventing self-promotion to admin.
 *  - Duplicate email returns 409 with a plain message; no user enumeration
 *    risk because registration is intentionally open (unlike login).
 *  - Login always returns 401 with the same generic message for both
 *    "email not found" and "wrong password" to avoid user enumeration.
 */

"use strict";

require("dotenv").config();

const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const Recruiter = require("../models/Recruiter");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

/** Strip password from a Mongoose document before sending. */
function safeRecruiter(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.password;
  return obj;
}

/** Validate registration body; returns an array of error strings. */
function validateRegisterBody(body) {
  const errors = [];
  const { name, email, password, company } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push("name: must be at least 2 characters");
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push("email: must be a valid email address");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    errors.push("password: must be at least 6 characters");
  }
  if (!company || typeof company !== "string" || company.trim().length < 2) {
    errors.push("company: must be at least 2 characters");
  }
  return errors;
}

// ─── POST /api/recruiters/register ──────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const errors = validateRegisterBody(req.body);
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const { name, email, password, company, phone = "" } = req.body;
    const normalEmail = email.trim().toLowerCase();

    // Duplicate email check — 409 Conflict
    const existing = await Recruiter.findOne({ email: normalEmail });
    if (existing) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const recruiter = await Recruiter.create({
      name:     name.trim(),
      email:    normalEmail,
      password: hashedPassword,
      company:  company.trim(),
      phone:    typeof phone === "string" ? phone.trim() : "",
    });

    return res.status(201).json({
      message:   "Recruiter account created successfully.",
      recruiter: safeRecruiter(recruiter),
    });
  } catch (err) {
    // Mongoose validation errors surface here
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: "Validation failed", errors: messages });
    }
    console.error("Recruiter register error:", err.message);
    return res.status(500).json({ message: "Registration failed.", error: err.message });
  }
});

// ─── POST /api/recruiters/login ──────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const recruiter = await Recruiter.findOne({
      email: email.trim().toLowerCase(),
    });

    // Same generic message for "not found" and "wrong password" — no enumeration
    const invalid = () =>
      res.status(401).json({ message: "Invalid email or password." });

    if (!recruiter) return invalid();

    const match = await bcrypt.compare(password, recruiter.password);
    if (!match) return invalid();

    // Refuse login if the account has been suspended by an admin
    if (recruiter.isSuspended) {
      return res.status(403).json({
        message: "This recruiter account has been suspended. Please contact the administrator.",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("FATAL: JWT_SECRET missing.");
      return res.status(500).json({ message: "Server configuration error." });
    }

    // role is hard-coded here — NEVER sourced from DB or request body
    const token = jwt.sign(
      { id: recruiter._id, email: recruiter.email, role: "recruiter" },
      secret,
      { expiresIn: "1d" }
    );

    return res.json({
      message:   "Login successful.",
      token,
      recruiter: safeRecruiter(recruiter),
    });
  } catch (err) {
    console.error("Recruiter login error:", err.message);
    return res.status(500).json({ message: "Login failed.", error: err.message });
  }
});

// ─── GET /api/recruiters/me ───────────────────────────────────────────────────
// Returns the authenticated recruiter's own profile.
// verifyToken decodes the JWT; requireRole("recruiter") rejects student tokens.
router.get(
  "/me",
  verifyToken,
  requireRole("recruiter"),
  async (req, res) => {
    try {
      const recruiter = await Recruiter.findById(req.user.id).select("-password");
      if (!recruiter) {
        return res.status(404).json({ message: "Recruiter account not found." });
      }
      return res.json({ recruiter });
    } catch (err) {
      console.error("Recruiter /me error:", err.message);
      return res.status(500).json({ message: "Failed to fetch profile.", error: err.message });
    }
  }
);

// ─── PUT /api/recruiters/me ───────────────────────────────────────────────────
// Update the authenticated recruiter's own profile ("Company Profile" management).
//  - Recruiter id comes ONLY from req.user.id (decoded JWT), never the body.
//  - Only name, company, and phone may change (whitelist).
//  - email, password, role, and isSuspended can NEVER change here.
//    (The Recruiter schema has no 'role' field; role lives only in the JWT.)
//  - No new schema fields or migration: the model already has `company` and `phone`.
const ALLOWED_PROFILE_FIELDS = ["name", "company", "phone"];

/** Validate profile-update body; only checks fields that are present. */
function validateProfileBody(body) {
  const errors = [];
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      errors.push("name: must be at least 2 characters");
    }
  }
  if (body.company !== undefined) {
    if (typeof body.company !== "string" || body.company.trim().length < 2) {
      errors.push("company: must be at least 2 characters");
    }
  }
  if (body.phone !== undefined && body.phone !== null) {
    if (typeof body.phone !== "string") {
      errors.push("phone: must be a string");
    }
  }
  return errors;
}

router.put(
  "/me",
  verifyToken,
  requireRole("recruiter"),
  async (req, res) => {
    try {
      // Defence in depth: explicitly reject attempts to touch protected fields.
      // (The whitelist below already drops them, but this gives a clear error.)
      const PROTECTED = ["email", "password", "role", "isSuspended", "_id", "createdAt", "updatedAt"];
      const attempted = PROTECTED.filter((k) => req.body && req.body[k] !== undefined);
      if (attempted.length) {
        return res.status(400).json({
          message: `These fields cannot be changed via profile update: ${attempted.join(", ")}.`,
        });
      }

      const errors = validateProfileBody(req.body || {});
      if (errors.length) {
        return res.status(400).json({ message: "Validation failed", errors });
      }

      // Whitelist: only permitted fields are applied.
      const update = {};
      for (const k of ALLOWED_PROFILE_FIELDS) {
        if (req.body[k] !== undefined) update[k] = req.body[k];
      }
      if (update.name !== undefined) update.name = update.name.trim();
      if (update.company !== undefined) update.company = update.company.trim();
      if (update.phone !== undefined) update.phone = typeof update.phone === "string" ? update.phone.trim() : "";

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: "No updatable fields provided (name, company, phone)." });
      }

      // Identity ALWAYS from the JWT — never from the request body.
      const recruiter = await Recruiter.findByIdAndUpdate(
        req.user.id,
        { $set: update },
        { new: true, runValidators: true, context: "query" }
      ).select("-password");

      if (!recruiter) {
        return res.status(404).json({ message: "Recruiter account not found." });
      }

      return res.json({ message: "Profile updated successfully.", recruiter });
    } catch (err) {
      if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ message: "Validation failed", errors: messages });
      }
      console.error("Recruiter profile update error:", err.message);
      return res.status(500).json({ message: "Failed to update profile.", error: err.message });
    }
  }
);

module.exports = router;
