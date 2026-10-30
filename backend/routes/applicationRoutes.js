const express = require("express");
const mongoose = require("mongoose");
const Application = require("../models/Application");
const Job = require("../models/Job");

const router = express.Router();

// APPLY FOR JOB
router.post("/", async (req, res) => {
  try {
    const {
      student,
      jobId,
      company,
      role,
      location,
      salary,
    } = req.body;

    const existingApplication = await Application.findOne({
      student,
      jobId,
    });

    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this job",
      });
    }

    let recruiterJobRef = null;
    if (mongoose.Types.ObjectId.isValid(jobId)) {
      const dbJob = await Job.findById(jobId);
      if (dbJob) {
        if (dbJob.status !== "Open") {
          return res.status(400).json({
            message: "This job is closed or archived and no longer accepting applications",
          });
        }
        recruiterJobRef = dbJob._id;
      }
    }

    const application = new Application({
      student,
      jobId,
      company,
      role,
      location,
      salary,
      recruiterJobRef,
    });

    await application.save();

    res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    res.status(500).json({
      message: "Application failed",
      error: error.message,
    });
  }
});

// GET STUDENT APPLICATIONS
router.get("/student/:studentId", async (req, res) => {
  try {
    const applications = await Application.find({
      student: req.params.studentId,
    }).sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch applications",
      error: error.message,
    });
  }
});

module.exports = router;