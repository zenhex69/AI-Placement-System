"use strict";
/**
 * models/Admin.js
 *
 * Completely separate collection from Student and Recruiter.
 *
 * Admins are provisioned ONLY via the offline seed script
 * (scripts/createAdmin.js). There is no public HTTP registration
 * endpoint — the admin role cannot be self-assigned.
 *
 * The 'role' field is NOT stored in the database.
 * It is hard-coded to "admin" in the login route JWT payload,
 * following the same pattern as Student and Recruiter.
 *
 * Password is stored as a bcrypt hash and is NEVER returned
 * in any API response.
 */

const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Name is required"],
      trim:      true,
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

    // bcrypt hash — never exposed in responses
    password: {
      type:      String,
      required:  [true, "Password is required"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Admin", adminSchema);
