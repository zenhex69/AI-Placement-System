// Automated E2E verification script for AI Placement System & Recruiter Portal
const assert = require("assert");

const BASE = "http://localhost:5000";

async function request(method, path, body = null, token = null) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

const results = [];

function record(id, title, passed, details = "") {
  results.push({ id, title, passed, details });
  console.log(`${passed ? "✅ PASS" : "❌ FAIL"} [Scenario ${id}] ${title}: ${details}`);
}

async function runTests() {
  console.log("\n==========================================");
  console.log("STARTING END-TO-END VERIFICATION SUITE");
  console.log("==========================================\n");

  const timestamp = Date.now();

  // ─────────────────────────────────────────────────────────────
  // 1. Existing student login and dashboard data
  // ─────────────────────────────────────────────────────────────
  let studentToken = null;
  let studentId = null;
  const studentEmail = `student_${timestamp}@test.edu`;
  const studentPassword = "Password@123";

  // Register student
  const studentReg = await request("POST", "/api/students/register", {
    name: "Alex Patel",
    email: studentEmail,
    password: studentPassword,
    phone: "+91 9876543210",
    college: "Institute of Technology",
    degree: "B.Tech",
    branch: "Computer Science",
    cgpa: 8.7,
    skills: ["React", "Node.js", "MongoDB", "JavaScript"],
    projects: "AI Placement Portal, Cloud Task Manager",
    experience: "Web Development Intern at CodeLab (3 months)",
  });

  assert(studentReg.status === 201, "Student registration failed");
  studentId = studentReg.data.student._id;

  // Login student
  const studentLogin = await request("POST", "/api/students/login", {
    email: studentEmail,
    password: studentPassword,
  });

  if (studentLogin.status === 200 && studentLogin.data.token) {
    studentToken = studentLogin.data.token;
    // Fetch student profile via GET /api/students/:id (used by Dashboard)
    const profileRes = await request("GET", `/api/students/${studentId}`);
    if (profileRes.status === 200 && profileRes.data.student.email === studentEmail) {
      record(1, "Student Login & Dashboard profile retrieval", true, `Logged in student ${studentId}, verified profile data`);
    } else {
      record(1, "Student Login & Dashboard profile retrieval", false, "Failed to retrieve student profile");
    }
  } else {
    record(1, "Student Login & Dashboard profile retrieval", false, "Login returned non-200");
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Recruiter register and login
  // ─────────────────────────────────────────────────────────────
  let recruiter1Token = null;
  let recruiter1Id = null;
  const recruiter1Email = `recruiter1_${timestamp}@acme.com`;
  const recruiter1Password = "Recruiter@123";

  const rec1Reg = await request("POST", "/api/recruiters/register", {
    name: "Elena Rostova",
    company: "Acme Innovations",
    email: recruiter1Email,
    password: recruiter1Password,
    phone: "+91 9898012345",
  });

  if (rec1Reg.status === 201 && rec1Reg.data.recruiter) {
    recruiter1Id = rec1Reg.data.recruiter._id;

    // Login Recruiter 1
    const rec1Login = await request("POST", "/api/recruiters/login", {
      email: recruiter1Email,
      password: recruiter1Password,
    });

    if (rec1Login.status === 200 && rec1Login.data.token) {
      recruiter1Token = rec1Login.data.token;

      // Verify /me endpoint
      const meRes = await request("GET", "/api/recruiters/me", null, recruiter1Token);
      if (meRes.status === 200 && meRes.data.recruiter.company === "Acme Innovations") {
        record(2, "Recruiter register & sign in", true, `Registered and authenticated recruiter: ${rec1Reg.data.recruiter.email} (${recruiter1Id})`);
      } else {
        record(2, "Recruiter register & sign in", false, "Recruiter /me endpoint failed");
      }
    } else {
      record(2, "Recruiter register & sign in", false, "Recruiter login failed");
    }
  } else {
    record(2, "Recruiter register & sign in", false, `Registration failed: ${JSON.stringify(rec1Reg.data)}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Recruiter can create a job and see it in their job list
  // ─────────────────────────────────────────────────────────────
  let job1Id = null;
  const createJobRes = await request("POST", "/api/recruiter/jobs", {
    role: "Senior Full Stack Engineer",
    company: "Acme Innovations",
    location: "Bangalore / Remote",
    type: "Full Time",
    salary: "₹12 - ₹18 LPA",
    description: "Build robust distributed backend systems and beautiful React UIs.",
    skills: ["React", "Node.js", "MongoDB", "TypeScript"],
    requirements: ["3+ years experience with React and Node.js", "Strong database knowledge"],
  }, recruiter1Token);

  if (createJobRes.status === 201 && createJobRes.data.job) {
    job1Id = createJobRes.data.job._id;
    assert.strictEqual(createJobRes.data.job.status, "Draft", "New job must start in Draft status");

    // List own jobs
    const listRes = await request("GET", "/api/recruiter/jobs", null, recruiter1Token);
    const found = listRes.data.jobs?.find((j) => j._id === job1Id);

    if (found && found.applicantCount === 0) {
      record(3, "Recruiter create job & list owned jobs", true, `Created Draft job ${job1Id}, verified in job list with applicantCount=0`);
    } else {
      record(3, "Recruiter create job & list owned jobs", false, "Job not found in recruiter's job list");
    }
  } else {
    record(3, "Recruiter create job & list owned jobs", false, `Job creation failed: ${JSON.stringify(createJobRes.data)}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Edit, publish, close, and delete a job
  // ─────────────────────────────────────────────────────────────
  let job2Id = null; // Create a second job for testing deletion
  const createJob2 = await request("POST", "/api/recruiter/jobs", {
    role: "Junior QA Tester",
    company: "Acme Innovations",
    location: "Pune",
    type: "Full Time",
    salary: "₹4 - ₹6 LPA",
    skills: ["JavaScript", "Python"],
    requirements: ["Testing basics"],
  }, recruiter1Token);
  job2Id = createJob2.data.job._id;

  // 4a. Edit job1
  const editRes = await request("PUT", `/api/recruiter/jobs/${job1Id}`, {
    salary: "₹14 - ₹20 LPA",
    location: "Bangalore / Hybrid",
  }, recruiter1Token);

  // 4b. Publish job1 (Draft -> Open)
  const pubRes = await request("PATCH", `/api/recruiter/jobs/${job1Id}/status`, {
    status: "Open",
  }, recruiter1Token);

  // 4c. Close job2 (Draft -> Closed)
  const closeRes = await request("PATCH", `/api/recruiter/jobs/${job2Id}/status`, {
    status: "Closed",
  }, recruiter1Token);

  // 4d. Delete job2
  const delRes = await request("DELETE", `/api/recruiter/jobs/${job2Id}`, null, recruiter1Token);

  // Verify job2 is gone
  const getDelRes = await request("GET", `/api/recruiter/jobs/${job2Id}`, null, recruiter1Token);

  if (
    editRes.status === 200 && editRes.data.job.salary === "₹14 - ₹20 LPA" &&
    pubRes.status === 200 && pubRes.data.job.status === "Open" &&
    closeRes.status === 200 && closeRes.data.job.status === "Closed" &&
    delRes.status === 200 && getDelRes.status === 404
  ) {
    record(4, "Edit, publish, close, and delete job", true, `Job ${job1Id} edited and published to Open. Job ${job2Id} closed and deleted.`);
  } else {
    record(4, "Edit, publish, close, and delete job", false, `Edit/pub/close/delete check failed: edit=${editRes.status}, pub=${pubRes.status}, close=${closeRes.status}, del=${delRes.status}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Isolation between recruiters
  // ─────────────────────────────────────────────────────────────
  const recruiter2Email = `recruiter2_${timestamp}@competitor.com`;
  const rec2Reg = await request("POST", "/api/recruiters/register", {
    name: "Marcus Vance",
    company: "Competitor Corp",
    email: recruiter2Email,
    password: "Password@123",
  });
  const rec2Login = await request("POST", "/api/recruiters/login", {
    email: recruiter2Email,
    password: "Password@123",
  });
  const recruiter2Token = rec2Login.data.token;

  // Recruiter 2 attempts to GET Recruiter 1's job
  const rec2GetJob1 = await request("GET", `/api/recruiter/jobs/${job1Id}`, null, recruiter2Token);
  // Recruiter 2 attempts to edit Recruiter 1's job
  const rec2PutJob1 = await request("PUT", `/api/recruiter/jobs/${job1Id}`, { role: "Hacked Title" }, recruiter2Token);
  // Recruiter 2 attempts to patch status
  const rec2PatchJob1 = await request("PATCH", `/api/recruiter/jobs/${job1Id}/status`, { status: "Closed" }, recruiter2Token);
  // Recruiter 2 attempts to delete Recruiter 1's job
  const rec2DelJob1 = await request("DELETE", `/api/recruiter/jobs/${job1Id}`, null, recruiter2Token);
  // Recruiter 2 lists own jobs (must NOT contain Job 1)
  const rec2List = await request("GET", "/api/recruiter/jobs", null, recruiter2Token);
  const leakedInList = rec2List.data.jobs?.some((j) => j._id === job1Id);

  if (
    rec2GetJob1.status === 404 &&
    rec2PutJob1.status === 404 &&
    rec2PatchJob1.status === 404 &&
    rec2DelJob1.status === 404 &&
    !leakedInList
  ) {
    record(5, "Recruiter cross-tenant data isolation", true, "Recruiter 2 received 404 for all private Job 1 actions and 0 leakage in job list");
  } else {
    record(5, "Recruiter cross-tenant data isolation", false, `Isolation failed: get=${rec2GetJob1.status}, put=${rec2PutJob1.status}, leaked=${leakedInList}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Student view published jobs and apply
  // ─────────────────────────────────────────────────────────────
  // GET /api/jobs/match/:studentId
  const matchRes = await request("GET", `/api/jobs/match/${studentId}`);
  const matchingJob = matchRes.data.jobs?.find((j) => j.id === job1Id);

  // Student single job details GET /api/jobs/:jobId
  const jobDetailRes = await request("GET", `/api/jobs/${job1Id}?studentId=${studentId}`);

  // Apply to Job 1
  const applyRes = await request("POST", "/api/applications", {
    student: studentId,
    jobId: job1Id,
    company: matchingJob.company,
    role: matchingJob.role,
    location: matchingJob.location,
    salary: matchingJob.salary,
  });

  let appId = applyRes.data.application?._id;

  // Duplicate apply test
  const dupApplyRes = await request("POST", "/api/applications", {
    student: studentId,
    jobId: job1Id,
    company: matchingJob.company,
    role: matchingJob.role,
  });

  if (
    matchingJob &&
    matchingJob.match > 0 &&
    jobDetailRes.status === 200 &&
    applyRes.status === 201 &&
    applyRes.data.application.status === "Applied" &&
    dupApplyRes.status === 400
  ) {
    record(6, "Student view published jobs & apply flow", true, `Job found with AI match score ${matchingJob.match}%, applied successfully (appId: ${appId}), duplicate application blocked (400)`);
  } else {
    record(6, "Student view published jobs & apply flow", false, `Apply flow issue: found=${Boolean(matchingJob)}, applyStatus=${applyRes.status}, dupStatus=${dupApplyRes.status}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Recruiter can view applicants for their own jobs
  // ─────────────────────────────────────────────────────────────
  const jobApplicantsRes = await request("GET", `/api/recruiter/jobs/${job1Id}/applicants`, null, recruiter1Token);
  const allApplicantsRes = await request("GET", "/api/recruiter/applicants", null, recruiter1Token);

  const foundInJob = jobApplicantsRes.data.applications?.find((a) => a._id === appId);
  const foundInAll = allApplicantsRes.data.applications?.find((a) => a._id === appId);

  if (
    foundInJob &&
    foundInAll &&
    foundInJob.student?.name === "Alex Patel" &&
    foundInJob.student?.email === studentEmail
  ) {
    record(7, "Recruiter view applicants for own jobs", true, `Recruiter 1 viewed applicant ${foundInJob.student.name} with populated student profile (CGPA: ${foundInJob.student.cgpa})`);
  } else {
    record(7, "Recruiter view applicants for own jobs", false, `Applicant not found in recruiter view: inJob=${Boolean(foundInJob)}, inAll=${Boolean(foundInAll)}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 8. Recruiter update application status using allowed values
  // ─────────────────────────────────────────────────────────────
  // Test invalid status
  const invalidStatusRes = await request("PATCH", `/api/recruiter/jobs/${job1Id}/applicants/${appId}/status`, {
    status: "Accepted", // Invalid
  }, recruiter1Token);

  // Test valid status: "Shortlisted"
  const updateStatus1 = await request("PATCH", `/api/recruiter/jobs/${job1Id}/applicants/${appId}/status`, {
    status: "Shortlisted",
  }, recruiter1Token);

  // Test valid status: "Interview"
  const updateStatus2 = await request("PATCH", `/api/recruiter/jobs/${job1Id}/applicants/${appId}/status`, {
    status: "Interview",
  }, recruiter1Token);

  if (
    invalidStatusRes.status === 400 &&
    updateStatus1.status === 200 &&
    updateStatus2.status === 200 &&
    updateStatus2.data.application.status === "Interview"
  ) {
    record(8, "Recruiter update application status", true, `Invalid status rejected (400). Valid transitions Applied -> Shortlisted -> Interview confirmed.`);
  } else {
    record(8, "Recruiter update application status", false, `Status update failed: invalid=${invalidStatusRes.status}, s1=${updateStatus1.status}, s2=${updateStatus2.status}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 9. Student application history reflects the updated status
  // ─────────────────────────────────────────────────────────────
  const studentAppsRes = await request("GET", `/api/applications/student/${studentId}`);
  const updatedStudentApp = studentAppsRes.data?.find((a) => a._id === appId);

  if (updatedStudentApp && updatedStudentApp.status === "Interview") {
    record(9, "Student application history reflects updated status", true, `Student application status correctly reflects "Interview"`);
  } else {
    record(9, "Student application history reflects updated status", false, `Expected status "Interview", got "${updatedStudentApp?.status}"`);
  }

  // ─────────────────────────────────────────────────────────────
  // 10. Resume analysis, skill saving, matching, placement prediction
  // ─────────────────────────────────────────────────────────────
  // 10a. Resume analysis
  const pdfSample = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 85 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Alex Patel React Node.js MongoDB Python SQL) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000240 00000 n \n0000000318 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n454\n%%EOF';
  const blob = new Blob([pdfSample], { type: "application/pdf" });
  const form = new FormData();
  form.append("resume", blob, "alex_patel_resume.pdf");

  const resumeRes = await fetch(`${BASE}/api/resume/analyze`, {
    method: "POST",
    body: form,
  });
  const resumeData = await resumeRes.json();

  // 10b. Skill saving
  const newSkills = ["Python", "TensorFlow", "Machine Learning", "SQL", "Pandas"];
  const skillUpdateRes = await request("PATCH", `/api/students/${studentId}/skills`, {
    skills: newSkills,
  });

  // 10c. Job matching with updated skills
  const newMatchRes = await request("GET", `/api/jobs/match/${studentId}`);
  const mlJob = newMatchRes.data.jobs?.find((j) => j.role === "Machine Learning Engineer");

  // 10d. Placement prediction
  const predictRes = await request("POST", `/api/predict/${studentId}`);

  if (
    resumeRes.status === 200 &&
    Array.isArray(resumeData.skills) &&
    resumeData.skills.length > 0 &&
    skillUpdateRes.status === 200 &&
    skillUpdateRes.data.student.skills.length === 5 &&
    mlJob &&
    mlJob.match >= 80 &&
    predictRes.status === 200 &&
    typeof predictRes.data.placementChance === "number" &&
    predictRes.data.label
  ) {
    record(10, "Resume analysis, skill saving, matching & placement prediction", true, `Resume NLP extracted [${resumeData.skills.join(", ")}], skills saved to DB, ML job match = ${mlJob.match}%, placement chance = ${predictRes.data.placementChance}% (${predictRes.data.label})`);
  } else {
    record(10, "Resume analysis, skill saving, matching & placement prediction", false, `Resume/prediction failed: resumeStatus=${resumeRes.status}, predictStatus=${predictRes.status}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 11. Existing jobs and application history remain accessible
  // ─────────────────────────────────────────────────────────────
  const static1 = await request("GET", "/api/jobs/1");
  const static2 = await request("GET", "/api/jobs/2");

  // Apply to static job 1
  const applyStatic = await request("POST", "/api/applications", {
    student: studentId,
    jobId: "1",
    company: static1.data.job.company,
    role: static1.data.job.role,
    location: static1.data.job.location,
    salary: static1.data.job.salary,
  });

  const checkStaticApps = await request("GET", `/api/applications/student/${studentId}`);
  const hasStaticApp = checkStaticApps.data?.some((a) => a.jobId === "1");

  if (
    static1.status === 200 &&
    static2.status === 200 &&
    applyStatic.status === 201 &&
    hasStaticApp
  ) {
    record(11, "Static jobs (1-6) and static application history remain intact", true, `Verified static jobs 1 & 2 accessible, applied to static job 1, confirmed in history`);
  } else {
    record(11, "Static jobs (1-6) and static application history remain intact", false, `Static jobs failed: s1=${static1.status}, apply=${applyStatic.status}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 12. Security: unauthenticated / wrong role access rejected
  // ─────────────────────────────────────────────────────────────
  // Unauthenticated access
  const unauthJobs = await request("GET", "/api/recruiter/jobs");
  const unauthMe = await request("GET", "/api/recruiters/me");

  // Wrong role: student token accessing recruiter endpoints
  const studentAccessJobs = await request("GET", "/api/recruiter/jobs", null, studentToken);
  const studentAccessMe = await request("GET", "/api/recruiters/me", null, studentToken);
  const studentCreateJob = await request("POST", "/api/recruiter/jobs", { role: "Hacked" }, studentToken);

  if (
    unauthJobs.status === 401 &&
    unauthMe.status === 401 &&
    studentAccessJobs.status === 403 &&
    studentAccessMe.status === 403 &&
    studentCreateJob.status === 403
  ) {
    record(12, "RBAC protection (401 for unauth, 403 for wrong role)", true, "401 returned for unauthenticated requests, 403 returned for student tokens attempting recruiter routes");
  } else {
    record(12, "RBAC protection (401 for unauth, 403 for wrong role)", false, `RBAC check failed: unauth=${unauthJobs.status}, studentToken=${studentAccessJobs.status}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log("\n==========================================");
  console.log("TEST EXECUTION SUMMARY");
  console.log("==========================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log("==========================================\n");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
