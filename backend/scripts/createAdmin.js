/**
 * scripts/createAdmin.js
 *
 * Offline admin provisioning tool.
 * Creates an admin account directly in MongoDB — bypasses all HTTP endpoints.
 * There is no public HTTP endpoint to create an admin.
 *
 * USAGE (run from the backend/ directory):
 *
 *   node scripts/createAdmin.js
 *
 * The script reads credentials from environment variables:
 *
 *   ADMIN_NAME      — display name (optional, defaults to "Platform Admin")
 *   ADMIN_EMAIL     — email address (required)
 *   ADMIN_PASSWORD  — plaintext password (required, min 10 characters)
 *
 * Example:
 *   $env:ADMIN_EMAIL="admin@careerai.com"; $env:ADMIN_PASSWORD="StrongPass123!"; node scripts/createAdmin.js
 *
 * The password is read from an environment variable, never from
 * a command-line argument, to avoid it appearing in shell history.
 *
 * The script exits with code 0 on success, 1 on failure.
 *
 * It is safe to re-run. If an admin with the given email already
 * exists, the account is left UNCHANGED by default — no duplicate
 * is created and the existing password is never overwritten.
 * To overwrite an existing admin's name and password, set
 * ADMIN_OVERWRITE=true explicitly.
 *
 *   ADMIN_OVERWRITE — set to "true" to overwrite an existing admin
 *                     (optional; defaults to NOT overwriting)
 */

"use strict";

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const Admin    = require("../models/Admin");

const ADMIN_NAME      = process.env.ADMIN_NAME      || "Platform Admin";
const ADMIN_EMAIL     = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD;
// When true, an existing admin's name and password are overwritten.
// Anything else (or unset) leaves an existing account untouched.
const ADMIN_OVERWRITE = (process.env.ADMIN_OVERWRITE || "").toLowerCase() === "true";

async function main() {
  // ── Validate inputs ──────────────────────────────────────────────────────
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      "❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.\n" +
      "   Example (PowerShell):\n" +
      '   $env:ADMIN_EMAIL="admin@careerai.com"; $env:ADMIN_PASSWORD="YourStrong1!"; node scripts/createAdmin.js'
    );
    process.exit(1);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL)) {
    console.error("❌ ADMIN_EMAIL is not a valid email address.");
    process.exit(1);
  }

  if (ADMIN_PASSWORD.length < 10) {
    console.error("❌ ADMIN_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  // ── Connect to MongoDB ───────────────────────────────────────────────────
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/CareerAI";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }

  // ── Create new admin OR (only with ADMIN_OVERWRITE=true) update existing ─
  try {
    const existing = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });

    if (existing) {
      if (!ADMIN_OVERWRITE) {
        // Protect the existing account — do NOT touch name or password.
        console.log(
          `ℹ️  An admin account already exists for ${ADMIN_EMAIL}.\n` +
          "   No changes were made — the existing account is protected.\n" +
          "   To overwrite the name and password, re-run with ADMIN_OVERWRITE=true:\n" +
          '   $env:ADMIN_OVERWRITE="true"; $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; node scripts/createAdmin.js'
        );
        return; // finally block disconnects MongoDB; script exits 0
      }

      const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      existing.name     = ADMIN_NAME.trim();
      existing.password = hash;
      await existing.save();
      console.log(`✅ Admin account updated: ${ADMIN_EMAIL}`);
    } else {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      const admin = await Admin.create({
        name:     ADMIN_NAME.trim(),
        email:    ADMIN_EMAIL.trim().toLowerCase(),
        password: hash,
      });
      console.log(`✅ Admin account created: ${admin.email}  (_id: ${admin._id})`);
    }
  } catch (err) {
    console.error("❌ Failed to create/update admin:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
