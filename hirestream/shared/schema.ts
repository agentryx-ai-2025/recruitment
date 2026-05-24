import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("candidate"),
  email: text("email").notNull().unique(),
  aadhaarNumber: text("aadhaar_number"),
  aadhaarVerified: boolean("aadhaar_verified").default(false),
  phoneNumber: text("phone_number"),
  phoneVerified: boolean("phone_verified").default(false),
  himAccessId: text("him_access_id"),
  preferredLanguage: text("preferred_language").default("en"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  notifyEmail: boolean("notify_email").default(true),
  notifySms: boolean("notify_sms").default(true),
  notifyInApp: boolean("notify_in_app").default(true),
  // 2FA (TOTP)
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorRecoveryCodes: text("two_factor_recovery_codes").array(),
});

export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  experience: integer("experience").default(0),
  skills: text("skills").array(),
  preferredCountries: text("preferred_countries").array(),
  profileComplete: boolean("profile_complete").default(false),
  resumeUrl: text("resume_url"),
  // Photo URL (served from /uploads/photos/...) — candidates + agents both see
  // it; improves recognition in lists. Nullable; InitialsAvatar is the fallback.
  photoUrl: text("photo_url"),
  // Postal address fields — captured separately from the free-text `location`
  // (which holds city/state). Allows a candidate to record their full postal
  // address (required for placement paperwork) and for the wizard to round-trip
  // it. All nullable. Tester feedback: "Address info does not save" — root
  // cause was the wizard had inputs but no corresponding columns.
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  pinCode: text("pin_code"),
  // Regulatory compliance (Emigration Act, MEA) + overseas-placement essentials
  passportNumber: text("passport_number"),
  passportExpiry: date("passport_expiry"),
  ecrStatus: text("ecr_status"),                  // ecr | ecnr | unknown
  pccStatus: text("pcc_status"),                  // submitted | pending | not_required
  pccExpiry: date("pcc_expiry"),
  medicalStatus: text("medical_status"),          // fit | pending | unfit
  medicalDate: date("medical_date"),
  ieltsBand: decimal("ielts_band"),
  languageProficiency: jsonb("language_proficiency"),
  pdoCompleted: boolean("pdo_completed").default(false),
  pdoDate: date("pdo_date"),
  pbbyInsuranceStatus: text("pbby_insurance_status"), // enrolled | pending | not_required
  pbbyPolicyNumber: text("pbby_policy_number"),
  // PWS §2: agent outreach opt-in (default controlled by setting candidate.default_open_to_outreach)
  openToOutreach: boolean("open_to_outreach").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  type: text("type").notNull(), // 'cv', 'passport', 'certificate'
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  verified: boolean("verified").default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  salary: text("salary"),
  description: text("description"),
  requirements: text("requirements").array(),
  skills: text("skills").array(),
  experience: integer("experience_required").default(0),
  employerId: varchar("employer_id").references(() => users.id),
  agentId: varchar("agent_id").references(() => users.id),
  status: text("status").default("active"),
  // PWS §2: visibility and pipeline-linking columns
  visibility: text("visibility").notNull().default("public"),  // public | agents_only
  parentRequisitionId: varchar("parent_requisition_id"),        // FK -> jobs(id), self-ref
  pinnedAgentId: varchar("pinned_agent_id").references(() => users.id),
  // Requisition fields (employer's perspective on this job)
  targetHires: integer("target_hires").default(1),
  hiringDeadline: date("hiring_deadline"),
  priority: text("priority").default("standard"),     // standard | urgent | critical
  employerNotes: text("employer_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  jobId: varchar("job_id").references(() => jobs.id),
  status: text("status").default("submitted"),
  matchScore: integer("match_score").default(0),
  rejectionFeedback: text("rejection_feedback"),
  // Employer-specific decision on this application (independent of pipeline status)
  employerDecision: text("employer_decision"),       // approved_for_interview | replacement_requested | selected_by_employer | rejected_by_employer
  employerDecisionAt: timestamp("employer_decision_at"),
  employerDecisionNotes: text("employer_decision_notes"),
  appliedAt: timestamp("applied_at").defaultNow(),
});

export const recruitmentAgents = pgTable("recruitment_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  agencyName: text("agency_name").notNull(),
  licenseNumber: text("license_number").notNull(),
  specializations: text("specializations").array(),
  verified: boolean("verified").default(false),
  rating: integer("rating").default(0),
  placements: integer("placements").default(0),
});

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  category: text("category").default("general"), // 'feature_flag' | 'maintenance' | 'integration' | 'general'
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// FRS §3.1 / §2.8 — admin-configurable third-party integrations.
// One row per logical integration ("email", "sms", "aadhaar", "himaccess",
// "digilocker"). Secrets are AES-GCM encrypted at rest; non-secret config
// (host/port/sender-id/client-id) lives in plain JSON for easy admin editing.
// Services read from here first; env vars act only as a fallback for local dev.
export const providerConfig = pgTable("provider_config", {
  id: text("id").primaryKey(),               // "email" | "sms" | "aadhaar" | "himaccess" | "digilocker"
  providerType: text("provider_type").notNull(), // "smtp" | "sendgrid" | "twilio" | "msg91" | "uidai" | "himaccess-oauth" | ...
  enabled: boolean("enabled").notNull().default(false),
  config: jsonb("config").notNull().default({}),      // plain: host, port, from, senderId, clientId, endpoint
  secrets: jsonb("secrets").notNull().default({}),    // encrypted: {cipher, iv, tag} per secret field
  lastTestedAt: timestamp("last_tested_at"),
  lastTestStatus: text("last_test_status"),  // "ok" | "fail"
  lastTestError: text("last_test_error"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// PWS §5 — admin-editable notification templates, composite key (eventKey, recipientRole).
export const notificationTemplates = pgTable("notification_templates", {
  eventKey: text("event_key").notNull(),          // e.g. "application.shortlisted"
  recipientRole: text("recipient_role").notNull(), // candidate | agent | employer
  title: text("title").notNull(),
  body: text("body").notNull(),
  channels: text("channels").array().notNull(),
  hideEmployerName: boolean("hide_employer_name").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agencyReviews = pgTable("agency_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").references(() => recruitmentAgents.id).notNull(),
  candidateUserId: varchar("candidate_user_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  title: text("title"),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const employers = pgTable("employers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  companyName: text("company_name").notNull(),
  industry: text("industry"),
  location: text("location"),
  verified: boolean("verified").default(false),
  activeJobs: integer("active_jobs").default(0),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'application_update', 'agency_verified', 'new_job_match', 'system'
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  severity: text("severity").notNull().default("info"), // info | positive | warning | urgent
  dismissedAt: timestamp("dismissed_at"),   // user hit × → never resurfaces
  savedAt: timestamp("saved_at"),           // user bookmarked for later
  metadata: jsonb("metadata"), // flexible JSON for linking to jobs, applications, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Saved/Favorited Jobs ────────────────────────────────────────────
export const savedJobs = pgTable("saved_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  jobId: varchar("job_id").references(() => jobs.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── OTP Verification Codes ──────────────────────────────────────────
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  purpose: text("purpose").notNull().default("login"), // login, register, password_reset
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Password Reset Tokens ───────────────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Candidate Education ─────────────────────────────────────────────
export const candidateEducation = pgTable("candidate_education", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  degree: text("degree").notNull(),
  institution: text("institution").notNull(),
  year: integer("year"),
  percentage: decimal("percentage"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Candidate Work Experience ───────────────────────────────────────
export const candidateExperience = pgTable("candidate_experience", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  years: integer("years").default(0),
  country: text("country"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Recruitment Drives ──────────────────────────────────────────────
export const recruitmentDrives = pgTable("recruitment_drives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: varchar("agency_id").references(() => recruitmentAgents.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  targetRoles: text("target_roles").array(),
  expectedCandidates: integer("expected_candidates"),
  status: text("status").default("pending"), // pending, approved, rejected, completed, cancelled
  approvedBy: varchar("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Interviews ──────────────────────────────────────────────────────
export const interviews = pgTable("interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driveId: varchar("drive_id").references(() => recruitmentDrives.id),
  applicationId: varchar("application_id").references(() => applications.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  location: text("location"),
  mode: text("mode").default("in_person"), // in_person, virtual
  result: text("result"),                  // selected | rejected | hold | null (pending)
  notes: text("notes"),
  // Structured interview feedback
  rating: integer("rating"),                     // 1..5
  strengths: text("strengths"),
  concerns: text("concerns"),
  recommendation: text("recommendation"),  // strong_yes | yes | maybe | no | strong_no
  // Structured scorecard — per-dimension ratings so the employer can give
  // more context than a single 1-5. Shape: { technical: 1-5, communication:
  // 1-5, culture: 1-5, english: 1-5, custom?: {...} }. All optional; the
  // admin-defined template dictates which dimensions are shown in the UI.
  scorecard: jsonb("scorecard"),
  conductedBy: varchar("conducted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Placements ──────────────────────────────────────────────────────
export const placements = pgTable("placements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").references(() => applications.id).notNull(),
  appointmentLetterUrl: text("appointment_letter_url"),
  startDate: timestamp("start_date"),
  country: text("country").notNull(),
  salary: text("salary"),
  status: text("status").default("offered"), // offered, accepted, declined, active, completed
  candidateResponse: text("candidate_response"), // accepted, declined
  declineReason: text("decline_reason"),
  visaStatus: text("visa_status"), // not_applied, applied, approved, rejected
  // Post-placement welfare follow-up (MEA requirement)
  welfare30Day: text("welfare_30_day"),             // ok | concerns | no_response | not_applicable
  welfare30DayAt: timestamp("welfare_30_day_at"),
  welfare30DayNotes: text("welfare_30_day_notes"),
  welfare60Day: text("welfare_60_day"),
  welfare60DayAt: timestamp("welfare_60_day_at"),
  welfare60DayNotes: text("welfare_60_day_notes"),
  welfare90Day: text("welfare_90_day"),
  welfare90DayAt: timestamp("welfare_90_day_at"),
  welfare90DayNotes: text("welfare_90_day_notes"),
  // Candidate-initiated welfare outreach (they can proactively write in)
  candidateWelfareNote: text("candidate_welfare_note"),
  candidateWelfareNoteAt: timestamp("candidate_welfare_note_at"),
  // Employer-contributed welfare note (how is the hire performing at destination)
  employerWelfareNote: text("employer_welfare_note"),
  employerWelfareNoteAt: timestamp("employer_welfare_note_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Grievances ──────────────────────────────────────────────────────
export const grievances = pgTable("grievances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  // category: agency_complaint | application_issue | technical_problem | policy_inquiry | fraud_report | other
  // fraud_report subtype drives the "report this job" flow (overseas-placement
  // fraud is an MEA priority; admin sees these in a dedicated watchlist tab).
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").default("submitted"), // submitted, under_review, action_taken, resolved, escalated
  // metadata.jobId / metadata.agencyId / metadata.reason let the admin click
  // through from a grievance straight to the offending record without re-typing.
  metadata: jsonb("metadata").default({}),
  adminNotes: text("admin_notes"),
  resolutionNotes: text("resolution_notes"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Audit Log ───────────────────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // create, update, delete, verify, reject, login, logout
  resourceType: text("resource_type").notNull(), // user, agency, job, application, drive, grievance, setting
  resourceId: varchar("resource_id"),
  details: jsonb("details"), // before/after values for updates
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── FAQ ─────────────────────────────────────────────────────────────
export const faq = pgTable("faq", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  questionHi: text("question_hi"), // Hindi translation
  answer: text("answer").notNull(),
  answerHi: text("answer_hi"), // Hindi translation
  category: text("category").notNull(), // registration, job_application, agencies, overseas_placement, technical_support
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Announcements ───────────────────────────────────────────────────
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleHi: text("title_hi"),
  body: text("body").notNull(),
  bodyHi: text("body_hi"),
  targetRole: text("target_role"), // null = all, or candidate, agent, employer
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  pinned: boolean("pinned").default(false),
  severity: text("severity").notNull().default("info"), // info (sky) | positive | warning (amber) | urgent (red)
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Training Events ─────────────────────────────────────────────────
export const trainingEvents = pgTable("training_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location"),
  virtualLink: text("virtual_link"),
  targetAudience: text("target_audience"), // null = all, or candidate, agent
  maxParticipants: integer("max_participants"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════
// INSERT / UPDATE SCHEMAS & TYPES
// ═══════════════════════════════════════════════════════════════════

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  email: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
});

// HTIS BUG-008 — employer "Create Date" (hiring deadline on the requisition
// form) accepted past dates. Enforced here so both the agent job-poster and
// the employer job-creation-form get the check.
const futureOrTodayDate = z.string().refine(
  (v) => !v || new Date(v) >= new Date(new Date().toDateString()),
  { message: "Date must be today or a future date." },
);

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(150),
  location: z.string().trim().min(1).max(80),
  country: z.string().trim().min(2).max(60),
  salary: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  employerNotes: z.string().trim().max(2000).optional().nullable(),
  skills: z.array(z.string().trim().max(40)).max(30).optional().nullable(),
  experience: z.number().int().min(0).max(60).optional().nullable(),
  targetHires: z.number().int().min(1).max(500).optional().nullable(),
  hiringDeadline: z.union([futureOrTodayDate, z.null()]).optional(),
});

// Draft job: only title required, all other fields optional but still length-bounded.
export const draftJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().max(150).optional().nullable(),
  location: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().max(60).optional().nullable(),
  salary: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  employerNotes: z.string().trim().max(2000).optional().nullable(),
  skills: z.array(z.string().trim().max(40)).max(30).optional().nullable(),
  experience: z.number().int().min(0).max(60).optional().nullable(),
  targetHires: z.number().int().min(1).max(500).optional().nullable(),
  hiringDeadline: z.union([futureOrTodayDate, z.null()]).optional(),
}).partial({ company: true, location: true, country: true });

export const insertRecruitmentAgentSchema = createInsertSchema(recruitmentAgents).omit({
  id: true,
  verified: true,
  rating: true,
  placements: true,
}).extend({
  agencyName: z.string().trim().min(2).max(150),
  licenseNumber: z.string().trim().min(3).max(50),
  specializations: z.array(z.string().trim().max(60)).max(20).optional().nullable(),
});

// Phone regex — accepts an optional `+`, optional country code up to 3 digits,
// optional space/dash separators, and 6–12 digits of subscriber number. Meant
// to reject alphanumeric garbage (HTIS BUG-002: field was accepting
// `87698GBIUHJIUJN JN&^**& (*)*Y&%^`), not enforce a strict E.164 shape — the
// FRS promises "email/mobile" without prescribing format, and Indian + GCC
// numbers differ in length.
const phoneRegex = /^\+?[0-9][0-9\s\-]{5,18}[0-9]$/;
const currentYear = new Date().getFullYear();

export const updateCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  userId: true,
  createdAt: true,
  ecrStatus: true,
  pccStatus: true,
  medicalStatus: true,
  pdoCompleted: true,
  pbbyInsuranceStatus: true,
}).partial().extend({
  // Overrides for field-level validation. The auto-generated schema from
  // drizzle only checks types; these add the business rules from the FRS.
  phone: z.string().trim().regex(phoneRegex, {
    message: "Phone must be digits only (optionally with +country code, spaces, or dashes). Example: +91 9876543210",
  }).optional().nullable(),
  // Passport-expiry cannot be in the past. Blocked server-side so a hand-crafted
  // PATCH (bypassing the client date-picker) still fails.
  passportExpiry: z.union([
    z.string().refine((v) => !v || new Date(v) >= new Date(new Date().toDateString()), {
      message: "Passport expiry must be today or a future date.",
    }),
    z.null(),
  ]).optional(),
  experience: z.number().int().min(0, { message: "Experience cannot be negative." }).optional().nullable(),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  appliedAt: true,
  status: true,
  matchScore: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  createdAt: true,
});

// ── New table insert schemas ────────────────────────────────────────

export const insertEducationSchema = createInsertSchema(candidateEducation).omit({
  id: true,
  createdAt: true,
}).extend({
  degree: z.string().trim().min(1, "Degree is required.").max(120),
  institution: z.string().trim().min(1, "Institution is required.").max(200),
  // Year-of-passing bounds — HTIS BUG-003 flagged -2020 being accepted. Upper
  // bound allows +1 year for candidates who are currently in final year.
  year: z.number().int().min(1950, "Year cannot be before 1950.")
    .max(currentYear + 1, `Year cannot be after ${currentYear + 1}.`).optional().nullable(),
  // Percentage OR CGPA is stored here as a decimal string. 0–100 accepts both
  // (CGPA ranges 0–10 fall inside that window, and percentages of 0–100 do
  // too). Rejects negatives and out-of-range values.
  percentage: z.union([z.string(), z.number()]).optional().nullable().transform((v) => (v === null || v === undefined || v === "" ? null : String(v)))
    .refine((v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
      message: "Percentage / CGPA must be between 0 and 100 (or 0–10 on CGPA scale).",
    }),
});

export const insertExperienceSchema = createInsertSchema(candidateExperience).omit({
  id: true,
  createdAt: true,
}).extend({
  company: z.string().trim().min(1, "Company is required.").max(200),
  role: z.string().trim().min(1, "Role is required.").max(120),
  // HTIS BUG-004 — negative `years` accepted.
  years: z.number().int().min(0, "Years cannot be negative.").max(70, "Years looks unrealistic.").optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
});

export const insertDriveSchema = createInsertSchema(recruitmentDrives).omit({
  id: true,
  status: true,
  approvedBy: true,
  rejectionReason: true,
  createdAt: true,
}).extend({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(3000).optional().nullable(),
  location: z.string().trim().min(1).max(120),
  targetRoles: z.array(z.string().trim().max(40)).max(30).optional().nullable(),
});

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  result: true,
  notes: true,
  createdAt: true,
});

export const insertPlacementSchema = createInsertSchema(placements).omit({
  id: true,
  candidateResponse: true,
  declineReason: true,
  createdAt: true,
});

export const insertGrievanceSchema = createInsertSchema(grievances).omit({
  id: true,
  status: true,
  adminNotes: true,
  resolutionNotes: true,
  assignedTo: true,
  resolvedAt: true,
  createdAt: true,
}).extend({
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(3000),
  category: z.string().trim().max(40),
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true,
});

export const insertFaqSchema = createInsertSchema(faq).omit({
  id: true,
  createdAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingEventSchema = createInsertSchema(trainingEvents).omit({
  id: true,
  createdAt: true,
});

// ── Types ───────────────────────────────────────────────────────────

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type RecruitmentAgent = typeof recruitmentAgents.$inferSelect;
export type Employer = typeof employers.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type CandidateEducation = typeof candidateEducation.$inferSelect;
export type CandidateExperience = typeof candidateExperience.$inferSelect;
export type RecruitmentDrive = typeof recruitmentDrives.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
export type Placement = typeof placements.$inferSelect;
export type Grievance = typeof grievances.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type Faq = typeof faq.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type TrainingEvent = typeof trainingEvents.$inferSelect;

// ── Internal notes on applicants (agent collaboration) ──────────────
export const applicationNotes = pgTable("application_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").references(() => applications.id).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Per-agent, per-candidate tags that persist across multiple applications
// from the same agency — e.g. "good-english", "available-gulf",
// "passport-expires-aug". Private to the agent who wrote them (other agents
// looking at the same candidate see their own tag set only).
export const candidateAgentTags = pgTable("candidate_agent_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  agentUserId: varchar("agent_user_id").references(() => users.id).notNull(),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Per-country reference card (admin-editable) — the single biggest UX
// differentiator for an overseas-placement portal. Shown on every job in
// that country so candidates have embassy contact, visa notes, labor-law
// basics, and rough cost-of-living without leaving the portal.
export const countryInfo = pgTable("country_info", {
  code: text("code").primaryKey(),           // ISO-3166 alpha-2, e.g. "AE", "SA", "DE"
  name: text("name").notNull(),              // "United Arab Emirates"
  embassyPhone: text("embassy_phone"),       // Indian Embassy in <country>
  embassyEmail: text("embassy_email"),
  embassyAddress: text("embassy_address"),
  embassyWebsite: text("embassy_website"),
  visaTimelineDays: integer("visa_timeline_days"),  // typical end-to-end days
  minWageNote: text("min_wage_note"),        // "Qatar minimum wage: QAR 1000/month + food+housing"
  laborLawSummary: text("labor_law_summary"),// 1-2 paragraph summary of worker protections
  costOfLivingNote: text("cost_of_living_note"), // rough ratio / caveats vs Himachal
  climateNote: text("climate_note"),         // "summer 45°C+; Ramadan work hours reduce"
  entryRequirements: text("entry_requirements"), // passport validity, police clearance, medical, etc.
  emergencyContact: text("emergency_contact"),   // MEA 24x7 helpline per region
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Candidate-initiated saved searches. Daily cron runs each saved search and
// emails a digest of new matches. Indeed / SEEK / Naukri's single biggest
// return-user retention mechanism.
export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull(),           // {search, country, salaryTier, experienceTier, sortBy}
  frequency: text("frequency").notNull().default("weekly"),  // "daily" | "weekly" | "off"
  lastRunAt: timestamp("last_run_at"),
  lastMatchCount: integer("last_match_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Saved candidate-search segments (per agent) ─────────────────────
export const savedSegments = pgTable("saved_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Email templates (admin-editable, merge-variable driven) ──────────
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  description: text("description"),
  variables: jsonb("variables").default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export type ApplicationNote = typeof applicationNotes.$inferSelect;
export type SavedSegment = typeof savedSegments.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// ── Candidate-submitted references (for background checks) ──────────
export const candidateReferences = pgTable("candidate_references", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  name: text("name").notNull(),
  relationship: text("relationship"),
  email: text("email"),
  phone: text("phone"),
  organization: text("organization"),
  contacted: boolean("contacted").default(false),
  contactedAt: timestamp("contacted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type CandidateReference = typeof candidateReferences.$inferSelect;

// ── Mobile Auth: Refresh Token Rotation ─────────────────────────────
// JWT bearer-token flow for mobile clients. Access tokens are short-lived
// (15min) and stateless; refresh tokens are long-lived (30 days) and stored
// hashed in this table for rotation + reuse detection. See
// /PMD-Final wrapup/MobileApps/05_Backend_API_Adaptations.md §1.
export const mobileRefreshTokens = pgTable("mobile_refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull(),           // SHA-256 of the refresh token
  deviceId: text("device_id"),                        // e.g. "android-PixelOS-abc123"
  userAgent: text("user_agent"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  rotatedTo: varchar("rotated_to"),                   // FK → self (chain for refresh rotation)
});

// ── Mobile Push: Device Token Registration ──────────────────────────
// Stores FCM (Android) or APNs (iOS) device tokens. One user can have
// multiple devices. Stale tokens are cleaned on delivery failure. See
// /PMD-Final wrapup/MobileApps/05_Backend_API_Adaptations.md §4.
export const mobilePushTokens = pgTable("mobile_push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  platform: text("platform").notNull(),               // 'android' | 'ios'
  token: text("token").notNull().unique(),             // the FCM or APNs token
  deviceId: text("device_id"),
  appVersion: text("app_version"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const insertMobileRefreshTokenSchema = createInsertSchema(mobileRefreshTokens).omit({
  id: true,
  issuedAt: true,
  revokedAt: true,
  rotatedTo: true,
});

export const insertMobilePushTokenSchema = createInsertSchema(mobilePushTokens).omit({
  id: true,
  createdAt: true,
  lastSeenAt: true,
});

export type MobileRefreshToken = typeof mobileRefreshTokens.$inferSelect;
export type MobilePushToken = typeof mobilePushTokens.$inferSelect;
