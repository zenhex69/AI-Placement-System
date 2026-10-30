/**
 * models/Recruiter.js
 *
 * Completely separate collection from Student.
 * No shared fields, no shared queries.
 *
 * Password is stored as a bcrypt hash and is NEVER returned in
 * any response — the routes delete it before sending.
 *
 * The 'role' field is intentionally not in the schema:
 *   - It is NOT stored in the database (no need to).
 *   - It is embedded in the JWT payload at login time as a hard-coded
 *     "recruiter" string — the application logic controls it, not user input.
 *   - This prevents any self-promotion to admin via the API.
 */

"use strict";

const mongoose = require("mongoose");

const recruiterSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Name is required"],
      trim:     true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
    },

    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      trim:      true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },

    // bcrypt hash — never exposed
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    company: {
      type:      String,
      required:  [true, "Company name is required"],
      trim:      true,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [150, "Company name must be at most 150 characters"],
    },

    phone: {
      type:    String,
      default: "",
      trim:    true,
    },

    // Added by admin dashboard phase.
    // default: false means no migration needed — existing Recruiter documents
    // without this field are treated as active (isSuspended: false).
    isSuspended: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Note: email index is declared inline via `index: true` on the field above.
// No schema.index() call here — that would create a duplicate and trigger a Mongoose warning.

module.exports = mongoose.model("Recruiter", recruiterSchema);
