require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");

const router = express.Router();

// ===============================
// REGISTER STUDENT
// ===============================
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      college,
      degree,
      branch,
      cgpa,
      skills,
      projects,
      experience,
    } = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({ email });

    if (existingStudent) {
      return res.status(400).json({
        message: "Student already exists with this email",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const student = new Student({
      name,
      email,
      password: hashedPassword,
      phone,
      college,
      degree,
      branch,
      cgpa,
      skills,
      projects,
      experience,
    });

    await student.save();

    // Don't send password back
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.status(201).json({
      message: "Student registered successfully",
      student: studentResponse,
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

// ===============================
// LOGIN STUDENT
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find student
    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      student.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Refuse login if the account has been suspended by an admin
    if (student.isSuspended) {
      return res.status(403).json({
        message: "This account has been suspended. Please contact the administrator.",
      });
    }

    // Create JWT token
   const secret = process.env.JWT_SECRET;

console.log(
  "LOGIN JWT SECRET:",
  secret ? "LOADED ✅" : "MISSING ❌"
);

const token = jwt.sign(
  {
    id: student._id,
    email: student.email,
    role: "student",
  },
  secret,
  {
    expiresIn: "1d",
  }
);
    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      message: "Login successful",
      token,
      student: studentResponse,
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

// ===============================
// GET ALL STUDENTS
// ===============================
router.get("/", async (req, res) => {
  try {
    const students = await Student.find().select("-password");

    res.json(students);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch students",
      error: error.message,
    });
  }
});

// ===============================
// GET SINGLE STUDENT
// Used by Dashboard.jsx to fetch fresh profile data from MongoDB.
// Ensures skills updated by Resume AI are always current on the Dashboard.
// ===============================
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select(
      "-password"
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    res.json({ student });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch student",
      error: error.message,
    });
  }
});

// ===============================
// UPDATE STUDENT SKILLS
// Called by ResumeAnalysis.jsx after a successful resume scan.
// Replaces the student's skills array with the resume-extracted skills.
// ===============================
router.patch("/:id/skills", async (req, res) => {
  try {
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        message: "Skills must be an array",
      });
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { skills },
      { new: true }
    ).select("-password");

    if (!updatedStudent) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    res.json({
      message: "Skills updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update skills",
      error: error.message,
    });
  }
});

module.exports = router;