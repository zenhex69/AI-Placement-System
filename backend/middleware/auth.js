/**
 * middleware/auth.js
 *
 * Two composable middleware functions:
 *
 *   verifyToken   — verifies the JWT in the Authorization header and
 *                   attaches { id, email, role } to req.user.
 *                   Returns 401 if the token is missing, malformed,
 *                   expired, or signed with the wrong secret.
 *
 *   requireRole   — factory that returns middleware enforcing a specific
 *                   role claim.  Must be used AFTER verifyToken.
 *                   Returns 403 if the role does not match.
 *
 * Usage in a route file:
 *   const { verifyToken, requireRole } = require("../middleware/auth");
 *
 *   router.get("/me", verifyToken, requireRole("recruiter"), handler);
 *   router.get("/profile", verifyToken, requireRole("student"), handler);
 */

"use strict";

const jwt = require("jsonwebtoken");

// ─────────────────────────────────────────────────────────────────────────────
// verifyToken
// Reads the Authorization header, validates the JWT, populates req.user.
// ─────────────────────────────────────────────────────────────────────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required. Please include a Bearer token.",
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      // Configuration error — do NOT reveal the missing key name in production,
      // but log it server-side so it is immediately visible.
      console.error("FATAL: JWT_SECRET is not set in environment variables.");
      return res.status(500).json({ message: "Server configuration error." });
    }

    const decoded = jwt.verify(token, secret);

    // Attach only the claims we need — never the whole token payload blindly
    req.user = {
      id:    decoded.id,
      email: decoded.email,
      role:  decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    // JsonWebTokenError, NotBeforeError, etc.
    return res.status(401).json({ message: "Invalid token. Please log in again." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requireRole(role)
// Returns middleware that enforces the given role on req.user.
// Must be placed AFTER verifyToken in the middleware chain.
// ─────────────────────────────────────────────────────────────────────────────
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) {
      // Guard against being called without verifyToken
      return res.status(401).json({ message: "Authentication required." });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        message: `Access denied. This endpoint requires the '${role}' role.`,
      });
    }

    next();
  };
}

module.exports = { verifyToken, requireRole };
