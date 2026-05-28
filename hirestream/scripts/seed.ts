import "dotenv/config";
import { storage } from "../server/storage";
import {
  users, candidates, jobs, applications, recruitmentAgents, employers,
  candidateEducation, candidateExperience, documents, savedJobs,
  recruitmentDrives, interviews, placements, notifications, agencyReviews,
  grievances, faq, announcements,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * Rich seed for HireStream — populates every role's dashboard with
 * meaningful sample data so clicks land on actual content, not empty lists.
 */
async function seed() {
  console.log("Seeding HireStream demo data…\n");
  if (!storage.db) throw new Error("No database connection.");
  const db = storage.db;

  // ── USERS ────────────────────────────────────────────────────────────
  const accounts = [
    { username: "demo_candidate",  email: "demo_candidate@hirestream.dev",  role: "candidate",  password: "test123" },
    { username: "demo_agent",      email: "demo_agent@hirestream.dev",      role: "agent",      password: "test123" },
    { username: "demo_employer",   email: "demo_employer@hirestream.dev",   role: "employer",   password: "test123" },
    { username: "demo_admin",      email: "demo_admin@hirestream.dev",      role: "admin",      password: "test123" },
    { username: "superadmin", email: "superadmin@hirestream.dev", role: "superadmin", password: "hpsedc@super2026" },
    // Additional candidate users so the agent/employer see a real pool
    { username: "priya_verma",     email: "priya.verma@hirestream.dev",     role: "candidate",  password: "test123" },
    { username: "rohan_mehta",     email: "rohan.mehta@hirestream.dev",     role: "candidate",  password: "test123" },
    { username: "meera_iyer",      email: "meera.iyer@hirestream.dev",      role: "candidate",  password: "test123" },
    { username: "vikram_negi",     email: "vikram.negi@hirestream.dev",     role: "candidate",  password: "test123" },
    { username: "ananya_bhatt",    email: "ananya.bhatt@hirestream.dev",    role: "candidate",  password: "test123" },
    // Additional agency users
    { username: "gulf_jobs_direct", email: "contact@gulfjobsdirect.in",     role: "agent",      password: "test123" },
    { username: "europe_careers",   email: "contact@europecareers.in",      role: "agent",      password: "test123" },
    { username: "japan_pathways",   email: "contact@japanpathways.in",      role: "agent",      password: "test123" },
    // Additional employer users
    { username: "aramco_hr",        email: "recruiting@aramco.sa",          role: "employer",   password: "test123" },
    { username: "nhs_london_hr",    email: "recruiting@royallondon.nhs.uk", role: "employer",   password: "test123" },
    { username: "siemens_hr",       email: "recruiting@siemens.de",         role: "employer",   password: "test123" },
    // v0.4.32 (Phase 2): unverified KYB demo accounts. Both have a row in
    // their respective table but verified=false and no submitted-for-review
    // timestamp, so they land on a fresh "untouched" amber banner and can
    // walk through the full register → upload → submit → admin-review flow.
    { username: "demo_agent_unverified",    email: "demo_agent_unverified@hirestream.dev",    role: "agent",    password: "test123" },
    { username: "demo_employer_unverified", email: "demo_employer_unverified@hirestream.dev", role: "employer", password: "test123" },
  ];
  const userIds: Record<string, string> = {};

  for (const acc of accounts) {
    const existing = await db.select().from(users).where(eq(users.username, acc.username)).limit(1);
    const hashed = await bcrypt.hash(acc.password, 10);
    if (existing.length > 0) {
      await db.update(users).set({ password: hashed, role: acc.role }).where(eq(users.username, acc.username));
      userIds[acc.username] = existing[0].id;
    } else {
      const [u] = await db.insert(users).values({ username: acc.username, email: acc.email, password: hashed, role: acc.role }).returning();
      userIds[acc.username] = u.id;
    }
  }
  console.log(`Users: ${Object.keys(userIds).length}`);

  // ── CLEAN SLATE ──────────────────────────────────────────────────────
  // v0.4.36: single TRUNCATE … CASCADE instead of a hand-ordered delete
  // chain that kept drifting out of sync with the schema (it used to miss
  // application_notes, employer_documents, agency_documents, etc. and
  // throw FK errors mid-seed). CASCADE lets Postgres resolve the FK graph.
  // We do NOT truncate `users` here — the user upsert above preserves IDs.
  await db.execute(sql`TRUNCATE TABLE
    candidates, recruitment_agents, employers, jobs, applications,
    notifications, grievances, recruitment_drives, saved_jobs,
    saved_searches, saved_segments, agency_reviews, documents,
    candidate_education, candidate_experience, candidate_references,
    candidate_agent_tags, agency_documents, employer_documents,
    application_notes, interviews, placements, training_events,
    faq, announcements
    RESTART IDENTITY CASCADE`);

  // ── CANDIDATES ──────────────────────────────────────────────────────
  const candidateSeed = [
    {
      username: "demo_candidate", fullName: "Arjun Sharma", phone: "+91-98765-43210",
      location: "Shimla, Himachal Pradesh", experience: 5,
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker"],
      preferredCountries: ["Canada", "Australia", "Germany"],
    },
    {
      username: "priya_verma", fullName: "Priya Verma", phone: "+91-98100-22110",
      location: "Manali, Himachal Pradesh", experience: 4,
      skills: ["ICU Care", "ACLS", "Patient Management", "IV Therapy"],
      preferredCountries: ["UK", "Ireland", "Germany"],
    },
    {
      username: "rohan_mehta", fullName: "Rohan Mehta", phone: "+91-98111-55221",
      location: "Dharamshala, Himachal Pradesh", experience: 6,
      skills: ["AutoCAD", "Civil 3D", "Structural Design", "Site Supervision"],
      preferredCountries: ["New Zealand", "Australia", "UAE"],
    },
    {
      username: "meera_iyer", fullName: "Meera Iyer", phone: "+91-94700-88121",
      location: "Solan, Himachal Pradesh", experience: 3,
      skills: ["Python", "SQL", "Power BI", "Tableau", "Excel"],
      preferredCountries: ["UAE", "Singapore", "Qatar"],
    },
    {
      username: "vikram_negi", fullName: "Vikram Negi", phone: "+91-97800-33451",
      location: "Kullu, Himachal Pradesh", experience: 8,
      skills: ["Hotel Operations", "Revenue Management", "F&B", "Guest Relations"],
      preferredCountries: ["Maldives", "UAE", "Qatar"],
    },
    {
      username: "ananya_bhatt", fullName: "Ananya Bhatt", phone: "+91-99123-77880",
      location: "Chamba, Himachal Pradesh", experience: 4,
      skills: ["Mechanical Design", "AutoCAD", "Piping", "HSE Standards"],
      preferredCountries: ["Saudi Arabia", "UAE", "Oman"],
    },
  ];
  const candidateIds: Record<string, string> = {};

  for (const c of candidateSeed) {
    const userId = userIds[c.username];
    const existing = await db.select().from(candidates).where(eq(candidates.userId, userId)).limit(1);
    const payload = {
      userId,
      fullName: c.fullName,
      email: accounts.find((a) => a.username === c.username)!.email,
      phone: c.phone,
      location: c.location,
      experience: c.experience,
      skills: c.skills,
      preferredCountries: c.preferredCountries,
      profileComplete: true,
    };
    if (existing[0]) {
      await db.update(candidates).set(payload).where(eq(candidates.id, existing[0].id));
      candidateIds[c.username] = existing[0].id;
    } else {
      const [row] = await db.insert(candidates).values(payload).returning();
      candidateIds[c.username] = row.id;
    }
  }
  console.log(`Candidates: ${Object.keys(candidateIds).length}`);

  // ── CANDIDATE EDUCATION ─────────────────────────────────────────────
  await db.delete(candidateEducation);
  await db.insert(candidateEducation).values([
    { candidateId: candidateIds.demo_candidate, degree: "B.Tech Computer Science",  institution: "NIT Hamirpur",                     year: 2019, percentage: "82.4" as any },
    { candidateId: candidateIds.demo_candidate, degree: "12th (Senior Secondary)",   institution: "DAV Public School, Shimla",        year: 2015, percentage: "89.2" as any },
    { candidateId: candidateIds.priya_verma,    degree: "B.Sc Nursing",              institution: "AIIMS Delhi",                      year: 2020, percentage: "86.0" as any },
    { candidateId: candidateIds.rohan_mehta,    degree: "B.Tech Civil Engineering",  institution: "IIT Roorkee",                      year: 2018, percentage: "84.5" as any },
    { candidateId: candidateIds.meera_iyer,     degree: "B.Sc Statistics",           institution: "Delhi University",                 year: 2021, percentage: "88.1" as any },
    { candidateId: candidateIds.vikram_negi,    degree: "Diploma Hotel Management",  institution: "IHM Kufri",                        year: 2016, percentage: "80.3" as any },
    { candidateId: candidateIds.ananya_bhatt,   degree: "B.Tech Mechanical",         institution: "NIT Jalandhar",                    year: 2020, percentage: "83.9" as any },
  ]);
  console.log("Education entries: 7");

  // ── CANDIDATE EXPERIENCE ────────────────────────────────────────────
  await db.delete(candidateExperience);
  await db.insert(candidateExperience).values([
    { candidateId: candidateIds.demo_candidate, company: "Infosys Limited",   role: "Senior Software Engineer", years: 3, country: "India", description: "Led a team of 4 on a banking modernization project for a North American client." },
    { candidateId: candidateIds.demo_candidate, company: "TCS",                role: "Software Engineer",        years: 2, country: "India", description: "Built microservices for insurance claims processing." },
    { candidateId: candidateIds.priya_verma,    company: "Fortis Hospital",   role: "Staff Nurse — ICU",        years: 3, country: "India" },
    { candidateId: candidateIds.priya_verma,    company: "Max Healthcare",    role: "Junior Nurse",             years: 1, country: "India" },
    { candidateId: candidateIds.rohan_mehta,    company: "L&T Construction",  role: "Senior Civil Engineer",    years: 4, country: "India", description: "Site engineer on 2 major highway projects." },
    { candidateId: candidateIds.meera_iyer,     company: "Accenture",         role: "Data Analyst",             years: 3, country: "India" },
    { candidateId: candidateIds.vikram_negi,    company: "Taj Hotels",        role: "Assistant Manager",        years: 6, country: "India" },
    { candidateId: candidateIds.ananya_bhatt,   company: "Reliance Industries", role: "Mechanical Engineer",    years: 4, country: "India" },
  ]);
  console.log("Experience entries: 8");

  // ── DOCUMENTS (placeholder refs so the Documents tab isn't empty) ───
  await db.delete(documents);
  await db.insert(documents).values([
    { candidateId: candidateIds.demo_candidate, type: "cv",          fileName: "arjun-sharma-cv.pdf",        fileUrl: "/uploads/arjun-sharma-cv.pdf",        fileSize: 245000, verified: true },
    { candidateId: candidateIds.demo_candidate, type: "passport",    fileName: "arjun-passport.jpg",         fileUrl: "/uploads/arjun-passport.jpg",         fileSize: 512000, verified: true },
    { candidateId: candidateIds.demo_candidate, type: "certificate", fileName: "arjun-btech-certificate.pdf", fileUrl: "/uploads/arjun-btech-certificate.pdf", fileSize: 180000, verified: false },
    { candidateId: candidateIds.priya_verma,    type: "cv",          fileName: "priya-cv.pdf",               fileUrl: "/uploads/priya-cv.pdf",               fileSize: 210000, verified: true },
    { candidateId: candidateIds.priya_verma,    type: "certificate", fileName: "priya-nursing-license.pdf",  fileUrl: "/uploads/priya-nursing-license.pdf",  fileSize: 160000, verified: true },
  ]);
  console.log("Documents: 5");

  // ── AGENCIES ────────────────────────────────────────────────────────
  await db.delete(recruitmentAgents);
  const [himAbroad] = await db.insert(recruitmentAgents).values({
    userId: userIds.demo_agent,
    agencyName: "HimAbroad Placement Services",
    licenseNumber: "HP-OPA-2018-0142",
    specializations: ["IT", "Healthcare", "Hospitality"],
    verified: true, rating: 5, placements: 142,
  }).returning();
  const [gulfDirect] = await db.insert(recruitmentAgents).values({
    userId: userIds.gulf_jobs_direct,
    agencyName: "Gulf Jobs Direct",
    licenseNumber: "HP-OPA-2019-0267",
    specializations: ["Oil & Gas", "Construction", "Hospitality"],
    verified: true, rating: 4, placements: 98,
  }).returning();
  const [europeCareers] = await db.insert(recruitmentAgents).values({
    userId: userIds.europe_careers,
    agencyName: "Europe Careers Consulting",
    licenseNumber: "HP-OPA-2020-0351",
    specializations: ["Healthcare", "IT", "Engineering"],
    verified: true, rating: 5, placements: 67,
  }).returning();
  const [japanPathways] = await db.insert(recruitmentAgents).values({
    userId: userIds.japan_pathways,
    agencyName: "Japan Pathways Recruitment",
    licenseNumber: "HP-OPA-2021-0488",
    specializations: ["Manufacturing", "Care Work", "Language Teaching"],
    verified: false, rating: 3, placements: 14,
  }).returning();
  // v0.4.32 (Phase 2): unverified test agency — minimal stub, no KYB metadata
  // yet, so the dashboard banner reads "Complete agency verification".
  await db.insert(recruitmentAgents).values({
    userId: userIds.demo_agent_unverified,
    agencyName: "(pending verification)",
    licenseNumber: "PENDING",
    specializations: [],
    verified: false, rating: 0, placements: 0,
  });
  console.log("Agencies: 5");

  // ── EMPLOYERS ───────────────────────────────────────────────────────
  await db.delete(employers);
  const [techSolutions] = await db.insert(employers).values({
    userId: userIds.demo_employer, companyName: "Tech Solutions Canada Inc.",
    industry: "Information Technology", location: "Toronto, Canada", verified: true, activeJobs: 3,
  }).returning();
  const [aramco] = await db.insert(employers).values({
    userId: userIds.aramco_hr, companyName: "Saudi Aramco",
    industry: "Oil & Gas", location: "Dhahran, Saudi Arabia", verified: true, activeJobs: 2,
  }).returning();
  const [nhsLondon] = await db.insert(employers).values({
    userId: userIds.nhs_london_hr, companyName: "Royal London Hospital NHS Trust",
    industry: "Healthcare", location: "London, UK", verified: true, activeJobs: 2,
  }).returning();
  const [siemens] = await db.insert(employers).values({
    userId: userIds.siemens_hr, companyName: "Siemens AG",
    industry: "Engineering", location: "Munich, Germany", verified: true, activeJobs: 2,
  }).returning();
  // v0.4.32 (Phase 2): unverified test employer — stub row only, so banner
  // and Post-Job gate are exercised cleanly.
  await db.insert(employers).values({
    userId: userIds.demo_employer_unverified,
    companyName: "(pending verification)",
    verified: false, activeJobs: 0,
  });
  console.log("Employers: 5");

  // Delete in FK-safe order before re-inserting jobs
  await db.delete(placements);
  await db.delete(interviews);
  await db.delete(savedJobs);
  await db.delete(notifications);
  await db.delete(agencyReviews);
  await db.delete(grievances);
  await db.delete(recruitmentDrives);

  // ── JOBS (rich, 25 entries) ─────────────────────────────────────────
  await db.delete(jobs);
  const jobSeed = [
    { title: "Senior Software Engineer",        company: "Tech Solutions Canada Inc.", location: "Toronto, Ontario",      country: "Canada",       skills: ["React","Node.js","TypeScript","AWS","PostgreSQL"], salary: "CAD 85,000 – 110,000", experience: 4, agentId: userIds.demo_agent,       employerId: userIds.demo_employer, description: "Work on fintech products used by millions. Full relocation + PR sponsorship." },
    { title: "Full Stack Developer",             company: "Digital Innovations Ltd.",   location: "Melbourne, Victoria",   country: "Australia",    skills: ["Python","Django","React","PostgreSQL"],           salary: "AUD 90,000 – 120,000", experience: 3, agentId: userIds.demo_agent,       employerId: userIds.demo_employer, description: "Healthcare-sector digital products. Hybrid work. 457 visa sponsorship." },
    { title: "DevOps Engineer",                  company: "CloudFirst Systems",         location: "Berlin, Germany",       country: "Germany",      skills: ["Kubernetes","Docker","Terraform","AWS","CI/CD"], salary: "EUR 70,000 – 95,000",  experience: 3, agentId: userIds.europe_careers,   employerId: userIds.siemens_hr,    description: "Scale our infrastructure across Europe. Blue-card sponsorship available." },
    { title: "Data Analyst",                     company: "Gulf Analytics Group",       location: "Dubai, UAE",            country: "UAE",          skills: ["Python","SQL","Power BI","Tableau"],              salary: "AED 15,000 – 20,000/mo", experience: 2, agentId: userIds.gulf_jobs_direct, employerId: userIds.demo_employer, description: "Analytics firm in the heart of the Gulf. Housing allowance + annual flight home." },
    { title: "Registered Nurse – ICU",           company: "Royal London Hospital NHS Trust", location: "London, England",   country: "UK",           skills: ["ICU Care","ACLS","Patient Management","IV Therapy"], salary: "GBP 32,000 – 42,000",  experience: 2, agentId: userIds.europe_careers,   employerId: userIds.nhs_london_hr, description: "NHS is recruiting from India with ICU experience. Visa sponsorship, accommodation support." },
    { title: "Civil Engineer – Infrastructure",  company: "BuildRight International",   location: "Auckland, New Zealand", country: "New Zealand",  skills: ["AutoCAD","Structural Design","Project Management","Civil 3D"], salary: "NZD 85,000 – 105,000", experience: 5, agentId: userIds.demo_agent,       employerId: userIds.demo_employer, description: "Major highway and bridge projects. Relocation assistance included." },
    { title: "Hotel Manager",                    company: "Marriott International – Maldives", location: "Malé, Maldives", country: "Maldives",      skills: ["Hotel Operations","Revenue Management","Guest Relations","F&B Management"], salary: "USD 2,500 – 3,500/mo + board", experience: 6, agentId: userIds.gulf_jobs_direct, employerId: userIds.demo_employer, description: "Manage a luxury 5-star resort. Work in paradise while advancing your career." },
    { title: "Mechanical Engineer",              company: "Saudi Aramco",               location: "Dhahran, Saudi Arabia", country: "Saudi Arabia", skills: ["Mechanical Design","AutoCAD","Pressure Vessels","Piping","HSE"], salary: "USD 4,000 – 6,000/mo tax-free", experience: 4, agentId: userIds.gulf_jobs_direct, employerId: userIds.aramco_hr,    description: "Maintenance and operations of petroleum processing facilities." },
    { title: "Software Developer",               company: "Siemens AG",                 location: "Munich, Germany",       country: "Germany",      skills: ["C++","Python","Embedded Systems","Git"],          salary: "EUR 65,000 – 80,000",  experience: 2, agentId: userIds.europe_careers,   employerId: userIds.siemens_hr,    description: "Embedded software for industrial automation. Blue-card supported." },
    { title: "Operating Theatre Nurse",          company: "Royal London Hospital NHS Trust", location: "London, England",   country: "UK",           skills: ["Surgical Nursing","Sterilization","Patient Care"], salary: "GBP 30,000 – 38,000",  experience: 2, agentId: userIds.europe_careers,   employerId: userIds.nhs_london_hr, description: "Surgical team in a busy London NHS hospital." },
    { title: "Front-End Developer",              company: "Tech Solutions Canada Inc.", location: "Toronto, Canada",       country: "Canada",       skills: ["React","TypeScript","CSS","Accessibility"],       salary: "CAD 75,000 – 95,000",  experience: 2, agentId: userIds.demo_agent,       employerId: userIds.demo_employer, description: "Build user-facing fintech dashboards with a design-led team." },
    { title: "Aramco Drilling Engineer",         company: "Saudi Aramco",               location: "Dhahran, Saudi Arabia", country: "Saudi Arabia", skills: ["Drilling","HSE","Rig Operations","MWD"],          salary: "USD 5,000 – 7,500/mo tax-free", experience: 5, agentId: userIds.gulf_jobs_direct, employerId: userIds.aramco_hr,    description: "Upstream operations. 4-week-on / 2-week-off rotation with paid flights home." },
    { title: "Electrical Engineer",              company: "Siemens AG",                 location: "Erlangen, Germany",     country: "Germany",      skills: ["Power Systems","AutoCAD","PLC","SCADA"],          salary: "EUR 68,000 – 82,000",  experience: 3, agentId: userIds.europe_careers,   employerId: userIds.siemens_hr,    description: "Grid modernization projects. Relocation + German language training." },
    { title: "F&B Supervisor",                   company: "Marriott International – Maldives", location: "Malé, Maldives", country: "Maldives",      skills: ["F&B","Guest Relations","Team Leadership"],        salary: "USD 1,800 – 2,500/mo + board", experience: 3, agentId: userIds.gulf_jobs_direct, employerId: userIds.demo_employer, description: "Oversee restaurants in a luxury island resort." },
    { title: "Cloud Architect",                  company: "Tech Solutions Canada Inc.", location: "Vancouver, Canada",     country: "Canada",       skills: ["AWS","Azure","Terraform","Kubernetes"],           salary: "CAD 125,000 – 160,000",experience: 7, agentId: userIds.demo_agent,       employerId: userIds.demo_employer, description: "Design multi-cloud landing zones for regulated financial workloads." },
    { title: "Pediatric Nurse",                  company: "Royal London Hospital NHS Trust", location: "London, England",   country: "UK",           skills: ["Pediatric Nursing","Patient Care","IV Therapy"],   salary: "GBP 30,000 – 38,000",  experience: 3, agentId: userIds.europe_careers,   employerId: userIds.nhs_london_hr, description: "Dedicated pediatric ward. Weekend premiums + visa sponsorship." },
    { title: "QA Automation Engineer",           company: "Digital Innovations Ltd.",   location: "Sydney, Australia",     country: "Australia",    skills: ["Playwright","TypeScript","CI/CD","Jest"],          salary: "AUD 95,000 – 115,000", experience: 3, agentId: userIds.demo_agent,       employerId: userIds.demo_employer, description: "Ship reliable healthcare tech with modern testing practices." },
    { title: "Structural Site Engineer",         company: "BuildRight International",   location: "Wellington, New Zealand", country: "New Zealand", skills: ["Site Supervision","AutoCAD","Project Management"], salary: "NZD 75,000 – 90,000",  experience: 4, agentId: userIds.demo_agent,       employerId: userIds.demo_employer, description: "Commercial and infrastructure projects on the North Island." },
    { title: "Data Scientist",                   company: "Gulf Analytics Group",       location: "Abu Dhabi, UAE",        country: "UAE",          skills: ["Python","Pandas","ML","SQL","Tableau"],            salary: "AED 20,000 – 28,000/mo", experience: 4, agentId: userIds.gulf_jobs_direct, employerId: userIds.demo_employer, description: "Turn oil & gas operational data into decisions. Housing + schooling allowance." },
    { title: "Hotel Front Office Manager",       company: "Marriott International – Maldives", location: "Malé, Maldives", country: "Maldives",      skills: ["Front Office","Guest Relations","Reservations"],   salary: "USD 2,200 – 3,000/mo + board", experience: 5, agentId: userIds.gulf_jobs_direct, employerId: userIds.demo_employer, description: "Run the guest experience at a luxury resort property." },
    { title: "Embedded Software Engineer",       company: "Siemens AG",                 location: "Nuremberg, Germany",    country: "Germany",      skills: ["C","RTOS","ARM","Git"],                             salary: "EUR 62,000 – 78,000",  experience: 2, agentId: userIds.europe_careers,   employerId: userIds.siemens_hr,    description: "Firmware for industrial drives. Blue-card sponsorship + German course." },
    { title: "Care Worker",                      company: "Sakura Care Japan",          location: "Tokyo, Japan",          country: "Japan",        skills: ["Elder Care","Patient Care","Japanese N4+"],        salary: "JPY 280,000 – 350,000/mo", experience: 1, agentId: userIds.japan_pathways,   employerId: userIds.nhs_london_hr, description: "SSW visa sponsorship. Japanese language training provided on arrival." },
    { title: "Production Line Technician",       company: "Toyota Motor Corp",          location: "Aichi, Japan",          country: "Japan",        skills: ["Manufacturing","Quality Control","Japanese N4+"],  salary: "JPY 300,000 – 380,000/mo", experience: 2, agentId: userIds.japan_pathways,   employerId: userIds.siemens_hr,    description: "Lean manufacturing environment. Housing + medical included." },
    { title: "Welder – Offshore",                company: "Saudi Aramco",               location: "Ras Tanura, Saudi Arabia", country: "Saudi Arabia", skills: ["MIG","TIG","Offshore","HSE"],                    salary: "USD 3,500 – 5,000/mo tax-free", experience: 4, agentId: userIds.gulf_jobs_direct, employerId: userIds.aramco_hr,    description: "Offshore welding on petroleum platforms. Rotation schedule." },
    { title: "Civil Draftsperson",               company: "BuildRight International",   location: "Christchurch, New Zealand", country: "New Zealand", skills: ["AutoCAD","Revit","Civil 3D"],                   salary: "NZD 65,000 – 78,000",  experience: 2, agentId: userIds.demo_agent,       employerId: userIds.demo_employer, description: "Detailed drawings for bridge and road projects." },
  ];
  const jobRows = await db.insert(jobs).values(jobSeed.map((j) => ({ ...j, status: "active", employmentType: "full-time" as any }))).returning();
  console.log(`Jobs: ${jobRows.length}`);
  const jobByTitle: Record<string, string> = {};
  for (const j of jobRows) jobByTitle[j.title] = j.id;

  // ── APPLICATIONS (Arjun applied to several, with varied statuses) ───
  const arjunApps = [
    { jobTitle: "Senior Software Engineer",   status: "shortlisted", matchScore: 92 },
    { jobTitle: "Full Stack Developer",       status: "interview",   matchScore: 88 },
    { jobTitle: "DevOps Engineer",            status: "reviewed",    matchScore: 76 },
    { jobTitle: "Front-End Developer",        status: "submitted",   matchScore: 84 },
    { jobTitle: "Cloud Architect",            status: "submitted",   matchScore: 71 },
    { jobTitle: "QA Automation Engineer",     status: "reviewed",    matchScore: 68 },
    { jobTitle: "Software Developer",         status: "selected",    matchScore: 81 }, // will become a placement
    { jobTitle: "Mechanical Engineer",         status: "rejected",    matchScore: 42 }, // with feedback
  ];
  const arjunAppIds: Record<string, string> = {};
  const rejectionFeedbacks: Record<string, string> = {
    "Mechanical Engineer": "Strong coding background but candidate does not have hands-on petroleum/pressure-vessel experience required for this specific role at Saudi Aramco. Encouraged to apply for software engineering openings instead — candidate is a strong fit there.",
  };
  for (const a of arjunApps) {
    const [row] = await db.insert(applications).values({
      candidateId: candidateIds.demo_candidate, jobId: jobByTitle[a.jobTitle],
      status: a.status, matchScore: a.matchScore,
      rejectionFeedback: rejectionFeedbacks[a.jobTitle] ?? null,
    }).returning();
    arjunAppIds[a.jobTitle] = row.id;
  }
  // Applications from other candidates (so agent/employer see pipeline)
  const otherApps = [
    { cand: "priya_verma",   job: "Registered Nurse – ICU",          status: "shortlisted",         score: 94 },
    { cand: "priya_verma",   job: "Operating Theatre Nurse",         status: "interview_scheduled", score: 88 },
    { cand: "priya_verma",   job: "Pediatric Nurse",                 status: "submitted",           score: 81 },
    { cand: "rohan_mehta",   job: "Civil Engineer – Infrastructure", status: "selected",            score: 90 },
    { cand: "rohan_mehta",   job: "Structural Site Engineer",        status: "interview_scheduled", score: 85 },
    { cand: "meera_iyer",    job: "Data Analyst",                    status: "shortlisted",         score: 89 },
    { cand: "meera_iyer",    job: "Data Scientist",                  status: "reviewed",            score: 75 },
    { cand: "vikram_negi",   job: "Hotel Manager",                   status: "interview_scheduled", score: 92 },
    { cand: "vikram_negi",   job: "Hotel Front Office Manager",      status: "submitted",           score: 86 },
    { cand: "ananya_bhatt",  job: "Mechanical Engineer",             status: "shortlisted",         score: 88 },
    { cand: "ananya_bhatt",  job: "Welder – Offshore",               status: "submitted",           score: 65 },
    // Extra volume on demo_agent's jobs so the agent dashboard feels alive
    { cand: "meera_iyer",    job: "Senior Software Engineer",        status: "reviewed",            score: 64 },
    { cand: "rohan_mehta",   job: "Civil Draftsperson",              status: "shortlisted",         score: 83 },
    { cand: "priya_verma",   job: "Full Stack Developer",            status: "rejected",            score: 38 },
    { cand: "ananya_bhatt",  job: "QA Automation Engineer",          status: "submitted",           score: 57 },
    { cand: "vikram_negi",   job: "Senior Software Engineer",        status: "submitted",           score: 31 },
  ];
  const otherAppIds: Record<string, string> = {};
  for (const a of otherApps) {
    const [row] = await db.insert(applications).values({
      candidateId: candidateIds[a.cand], jobId: jobByTitle[a.job], status: a.status, matchScore: a.score,
    }).returning();
    otherAppIds[`${a.cand}|${a.job}`] = row.id;
  }
  console.log(`Applications: ${arjunApps.length + otherApps.length}`);

  // ── SAVED JOBS (Arjun bookmarked a few) ─────────────────────────────
  await db.delete(savedJobs);
  for (const title of ["Cloud Architect", "Data Scientist", "Embedded Software Engineer"]) {
    await db.insert(savedJobs).values({ userId: userIds.demo_candidate, jobId: jobByTitle[title] });
  }
  console.log("Saved jobs: 3");

  // ── RECRUITMENT DRIVES ──────────────────────────────────────────────
  await db.delete(recruitmentDrives);
  const future = (days: number) => new Date(Date.now() + days * 86_400_000);
  const [driveIT] = await db.insert(recruitmentDrives).values({
    agencyId: himAbroad.id, title: "IT Drive — Canada & Australia", description: "Live interviews for 12 openings across software engineering and cloud roles.",
    date: future(14), location: "Hotel Clarkes, Shimla", targetRoles: ["Software Engineer","Cloud Architect","DevOps"], expectedCandidates: 60, status: "approved", approvedBy: userIds.demo_admin,
  }).returning();
  const [driveHealth] = await db.insert(recruitmentDrives).values({
    agencyId: europeCareers.id, title: "NHS Nursing Recruitment", description: "On-the-spot offers for qualified nurses with IELTS/OSCE.",
    date: future(21), location: "Hotel Holiday Home, Manali", targetRoles: ["ICU Nurse","OT Nurse","Pediatric Nurse"], expectedCandidates: 80, status: "approved", approvedBy: userIds.demo_admin,
  }).returning();
  await db.insert(recruitmentDrives).values({
    agencyId: gulfDirect.id, title: "Gulf Opportunities Fair", description: "Oil & gas, hospitality, and engineering roles across UAE, Saudi, Qatar.",
    date: future(35), location: "Peterhoff, Shimla", targetRoles: ["Mechanical Engineer","Hotel Manager","Welder"], expectedCandidates: 120, status: "pending",
  });
  await db.insert(recruitmentDrives).values({
    agencyId: japanPathways.id, title: "Japan Care Worker Program", description: "SSW-visa candidates for the Japanese elder-care sector.",
    date: future(48), location: "ITI Hamirpur", targetRoles: ["Care Worker","Nurse Assistant"], expectedCandidates: 50, status: "pending",
  });
  console.log("Drives: 4");

  // ── INTERVIEWS ──────────────────────────────────────────────────────
  await db.delete(interviews);
  const intRows = [
    { driveId: driveIT.id,     applicationId: arjunAppIds["Full Stack Developer"],                           scheduledAt: future(14), location: "Hotel Clarkes, Shimla",      mode: "in_person", conductedBy: userIds.demo_agent },
    { driveId: driveHealth.id, applicationId: otherAppIds["priya_verma|Operating Theatre Nurse"],            scheduledAt: future(21), location: "Hotel Holiday Home, Manali",  mode: "in_person", conductedBy: userIds.europe_careers },
    { driveId: driveIT.id,     applicationId: otherAppIds["rohan_mehta|Structural Site Engineer"],           scheduledAt: future(16), location: "Virtual (Google Meet)",      mode: "virtual",   conductedBy: userIds.demo_agent },
    { driveId: driveIT.id,     applicationId: otherAppIds["vikram_negi|Hotel Manager"],                      scheduledAt: future(18), location: "Peterhoff, Shimla",          mode: "in_person", conductedBy: userIds.gulf_jobs_direct },
  ];
  await db.insert(interviews).values(intRows);
  console.log("Interviews: " + intRows.length);

  // ── PLACEMENTS ──────────────────────────────────────────────────────
  await db.delete(placements);
  const placementRows = [
    { applicationId: arjunAppIds["Software Developer"], appointmentLetterUrl: "/uploads/arjun-siemens-offer.pdf", startDate: future(60), country: "Germany", salary: "EUR 72,000", status: "offered", visaStatus: "applied" },
    { applicationId: otherAppIds["rohan_mehta|Civil Engineer – Infrastructure"], appointmentLetterUrl: "/uploads/rohan-buildright-offer.pdf", startDate: future(45), country: "New Zealand", salary: "NZD 90,000", status: "accepted", visaStatus: "approved" },
  ];
  await db.insert(placements).values(placementRows);
  console.log("Placements: " + placementRows.length);

  // ── NOTIFICATIONS (candidate + agent) ───────────────────────────────
  await db.delete(notifications);
  await db.insert(notifications).values([
    { userId: userIds.demo_candidate, type: "application_update", title: "You've been shortlisted",          message: "Tech Solutions Canada Inc. shortlisted you for Senior Software Engineer.", read: false },
    { userId: userIds.demo_candidate, type: "application_update", title: "Interview scheduled",              message: "Your interview for Full Stack Developer is on " + future(14).toDateString() + ".", read: false },
    { userId: userIds.demo_candidate, type: "new_job_match",      title: "3 new matching jobs",              message: "We found 3 jobs matching your skills in Canada and Germany.", read: true },
    { userId: userIds.demo_candidate, type: "system",              title: "Welcome to HireStream",           message: "Complete your profile to unlock more recommendations.", read: true },
    { userId: userIds.demo_agent,     type: "application_update", title: "New application received",         message: "Arjun Sharma applied to Senior Software Engineer.", read: false },
    { userId: userIds.demo_agent,     type: "system",              title: "Agency verified",                 message: "Your agency HimAbroad is now verified.", read: true },
    { userId: userIds.demo_employer,  type: "application_update", title: "2 shortlisted candidates",        message: "HimAbroad shortlisted 2 candidates for your Senior Software Engineer role.", read: false },
    { userId: userIds.demo_admin,     type: "system",              title: "New agency awaiting approval",   message: "Japan Pathways Recruitment is awaiting verification.", read: false },
  ]);
  console.log("Notifications: 8");

  // ── AGENCY REVIEWS ──────────────────────────────────────────────────
  await db.delete(agencyReviews);
  await db.insert(agencyReviews).values([
    { agencyId: himAbroad.id,   candidateUserId: userIds.demo_candidate, rating: 5, title: "Placed in Canada on time",          review: "HimAbroad handled everything from visa to flights. Great communication throughout." },
    { agencyId: himAbroad.id,   candidateUserId: userIds.priya_verma,    rating: 5, title: "Professional and transparent",      review: "No hidden fees. Got my NHS offer within 3 months." },
    { agencyId: gulfDirect.id,  candidateUserId: userIds.ananya_bhatt,   rating: 4, title: "Good placement, slow paperwork",    review: "Aramco offer came through, but the paperwork took longer than promised." },
    { agencyId: europeCareers.id, candidateUserId: userIds.priya_verma,  rating: 5, title: "NHS-ready training",                 review: "They prepared me thoroughly for IELTS and OSCE. Highly recommend for nurses." },
  ]);
  console.log("Agency reviews: 4");

  // ── GRIEVANCES ──────────────────────────────────────────────────────
  await db.delete(grievances);
  await db.insert(grievances).values([
    { userId: userIds.ananya_bhatt,  category: "agency_complaint",  subject: "Paperwork delay",        description: "My Aramco visa paperwork has been stuck for 3 weeks with no update from the agency.", status: "under_review" },
    { userId: userIds.demo_candidate, category: "application_issue", subject: "Match score seems low", description: "I applied to Cloud Architect but my score is 71% — I have all the required skills.", status: "submitted" },
    { userId: userIds.priya_verma,    category: "technical_problem", subject: "Document upload failed", description: "My nursing license PDF fails to upload — says file too large but it's only 150KB.", status: "resolved", resolutionNotes: "Issue was resolved — file type validation updated." },
  ]);
  console.log("Grievances: 3");

  // ── FAQ ─────────────────────────────────────────────────────────────
  await db.delete(faq);
  await db.insert(faq).values([
    { question: "How do I register on HireStream?",                 questionHi: "HireStream पर पंजीकरण कैसे करें?",             answer: "Click the Register button, verify via email or mobile OTP, then fill out your profile.", answerHi: "रजिस्टर बटन पर क्लिक करें, ईमेल या मोबाइल OTP से सत्यापित करें, फिर अपनी प्रोफ़ाइल भरें।", category: "registration", sortOrder: 1 },
    { question: "What documents do I need to apply for overseas jobs?", questionHi: "विदेशी नौकरियों के लिए कौन से दस्तावेज़ चाहिए?", answer: "A CV, valid passport, and relevant educational certificates. Some jobs require additional licenses (e.g., nursing).", answerHi: "एक सीवी, वैध पासपोर्ट और प्रासंगिक शैक्षिक प्रमाणपत्र। कुछ नौकरियों के लिए अतिरिक्त लाइसेंस आवश्यक हैं।", category: "job_application", sortOrder: 2 },
    { question: "How are agencies verified?",                        questionHi: "एजेंसियों का सत्यापन कैसे होता है?",            answer: "Agencies are verified by the HPSEDC officer after submitting their license. Look for the ✅ Verified badge.", answerHi: "लाइसेंस जमा करने के बाद HPSEDC अधिकारी द्वारा एजेंसियों का सत्यापन किया जाता है।", category: "agencies", sortOrder: 3 },
    { question: "Do I need IELTS for all overseas jobs?",            questionHi: "क्या सभी विदेशी नौकरियों के लिए IELTS आवश्यक है?", answer: "No. IELTS is typically required for UK, Canada, Australia, and New Zealand. Gulf countries usually don't require it.", answerHi: "नहीं। IELTS आमतौर पर यूके, कनाडा, ऑस्ट्रेलिया और न्यूजीलैंड के लिए आवश्यक है।", category: "overseas_placement", sortOrder: 4 },
    { question: "How do I track my application status?",             questionHi: "मैं अपने आवेदन की स्थिति कैसे देखूं?",          answer: "Go to My Applications on your dashboard. Each application shows a visual pipeline: Submitted → Reviewed → Shortlisted → Interview → Selected → Placed.", answerHi: "अपने डैशबोर्ड पर My Applications पर जाएं।", category: "job_application", sortOrder: 5 },
  ]);
  console.log("FAQ entries: 5");

  // ── ANNOUNCEMENTS ───────────────────────────────────────────────────
  await db.delete(announcements);
  await db.insert(announcements).values([
    { title: "NHS UK Mega Drive — July 2026",   titleHi: "NHS यूके मेगा ड्राइव — जुलाई 2026",   body: "Recruitment drive for 80+ ICU and OT nurses. Eligible candidates with IELTS 7+ can apply directly.", bodyHi: "80+ ICU और OT नर्सों के लिए भर्ती ड्राइव।", targetRole: "candidate" },
    { title: "Canada Express Entry opens",      titleHi: "कनाडा एक्सप्रेस एंट्री खुली",          body: "IT and engineering roles in Canada with PR sponsorship. Apply before the 30-day window closes.", bodyHi: "कनाडा में IT और इंजीनियरिंग भूमिकाएँ PR प्रायोजन के साथ।", targetRole: null },
  ]);
  console.log("Announcements: 2");

  // ── SUMMARY ─────────────────────────────────────────────────────────
  console.log("\n✅ Seeding complete.\n");
  console.log("Demo credentials (password: test123 for all):");
  console.log("  demo_candidate / demo_agent / demo_employer / demo_admin (all test123)");
  console.log("  superadmin / hpsedc@super2026 (Super Admin — full system control)");
  console.log("  Extra candidates: priya_verma, rohan_mehta, meera_iyer, vikram_negi, ananya_bhatt");
  console.log("  Extra agents:     gulf_jobs_direct, europe_careers, japan_pathways");
  console.log("  Extra employers:  aramco_hr, nhs_london_hr, siemens_hr\n");
  process.exit(0);
}

seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
