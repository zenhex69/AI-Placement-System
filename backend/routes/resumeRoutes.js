const express = require("express");
const multer = require("multer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const skillDatabase = [
  "JavaScript",
  "React",
  "Node.js",
  "Express",
  "MongoDB",
  "Python",
  "Java",
  "C",
  "C++",
  "SQL",
  "HTML",
  "CSS",
  "Git",
  "GitHub",
  "Machine Learning",
  "TensorFlow",
  "Pandas",
  "NumPy",
  "Data Science",
  "REST API",
  "TypeScript",
  "Next.js",
  "Angular",
  "Vue.js",
  "Django",
  "Flask",
  "Spring Boot",
  "MySQL",
  "PostgreSQL",
  "AWS",
  "Docker",
  // Added: previously missing from skillDatabase but required by job listings
  "DSA",
  "Scikit-learn",
  "Kotlin",
  "Swift",
  "Redis",
  "GraphQL",
];

function extractEmail(text) {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0] : "";
}

function extractPhone(text) {
  const match = text.match(
    /(?:\+91[\s-]?)?[6-9]\d{9}/
  );

  return match ? match[0] : "";
}

function extractName(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];

    if (
      line.includes("@") ||
      /\d{7,}/.test(line) ||
      line.toLowerCase().includes("resume") ||
      line.toLowerCase().includes("curriculum vitae") ||
      line.toLowerCase() === "cv"
    ) {
      continue;
    }

    if (line.length > 40) {
      continue;
    }

    if (/^[A-Za-z .'-]+$/.test(line)) {
      return line;
    }
  }

  return "";
}

function extractSection(text, sectionNames) {
  const lines = text.split("\n");

  let collecting = false;
  const result = [];

  const allSections = [
    "skills",
    "technical skills",
    "education",
    "experience",
    "work experience",
    "projects",
    "certifications",
    "languages",
    "career objective",
    "summary",
  ];

  for (const originalLine of lines) {
    const line = originalLine.trim();

    if (!line) {
      continue;
    }

    const lowerLine = line.toLowerCase();

    if (
      sectionNames.some(
        (section) =>
          lowerLine === section.toLowerCase()
      )
    ) {
      collecting = true;
      continue;
    }

    if (
      collecting &&
      allSections.some(
        (section) =>
          lowerLine === section.toLowerCase()
      )
    ) {
      break;
    }

    if (collecting) {
      result.push(line);
    }
  }

  return result.join(" ");
}

async function parsePDF(buffer) {
  const { getDocumentProxy, extractText } = await import(
    "unpdf"
  );

  const pdf = await getDocumentProxy(
    new Uint8Array(buffer)
  );

  const result = await extractText(pdf, {
    mergePages: true,
  });

  return result.text || "";
}

router.post(
  "/analyze",
  upload.single("resume"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a resume PDF.",
        });
      }

      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({
          message: "Only PDF resumes are supported.",
        });
      }

      console.log(
        "Analyzing:",
        req.file.originalname
      );

      const resumeText = await parsePDF(
        req.file.buffer
      );

      console.log(
        "Extracted text length:",
        resumeText.length
      );

      if (!resumeText.trim()) {
        return res.status(400).json({
          message:
            "Could not extract text from this PDF.",
        });
      }

      const lowerText =
        resumeText.toLowerCase();

      // Personal information

      const name =
        extractName(resumeText);

      const email =
        extractEmail(resumeText);

      const phone =
        extractPhone(resumeText);

      // Skills

      const detectedSkills =
        skillDatabase.filter((skill) =>
          lowerText.includes(
            skill.toLowerCase()
          )
        );

      // Education

      const education =
        extractSection(
          resumeText,
          ["education"]
        );

      // Experience

      const experience =
        extractSection(
          resumeText,
          [
            "experience",
            "work experience",
          ]
        );

      // Projects

      const projects =
        extractSection(
          resumeText,
          ["projects"]
        );

      // Profile score

      let profileScore = 0;

      if (name) {
        profileScore += 10;
      }

      if (email) {
        profileScore += 10;
      }

      if (phone) {
        profileScore += 5;
      }

      profileScore += Math.min(
        detectedSkills.length * 5,
        30
      );

      if (education) {
        profileScore += 15;
      }

      if (experience) {
        profileScore += 15;
      }

      if (projects) {
        profileScore += 15;
      }

      profileScore = Math.min(
        profileScore,
        100
      );

      // Send response

      res.json({
        message:
          "Resume analyzed successfully.",

        fileName:
          req.file.originalname,

        candidate: {
          name,
          email,
          phone,
        },

        skills:
          detectedSkills,

        education,

        experience,

        projects,

        profileScore,

        textLength:
          resumeText.length,
      });

    } catch (error) {
      console.error(
        "================================="
      );

      console.error(
        "RESUME ANALYSIS ERROR"
      );

      console.error(
        "Message:",
        error?.message
      );

      console.error(
        "Stack:",
        error?.stack
      );

      console.error(
        "================================="
      );

      res.status(500).json({
        message:
          "Resume analysis failed.",

        error:
          error?.message ||
          String(error),
      });
    }
  }
);

module.exports = router;