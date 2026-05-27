/**
 * Beyond-FRS verification catalogue for HireStream.
 *
 * Seeded as a *separate* Verify project (`hirestream-v1.5-extras`) so that
 * HPSEDC/HTIS reviewers can sign these off independently from the FRS
 * contracted scope. FRS acceptance remains clean; these are acknowledged
 * separately as value-adds.
 *
 * Organised into 6 role-aligned sections so each reviewer can focus on
 * their domain.
 */
import "dotenv/config";
import { db, pool } from "../server/config/db";
import { projects, requirements } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

interface Row {
  itemRef: string; section: number; sectionTitle: string;
  description: string; testSteps: string; expectedResult: string;
}

const SECTIONS: Record<number, string> = {
  1: "Candidate Experience",
  2: "Agency Productivity",
  3: "Employer Workflow",
  4: "Admin / HPSEDC Oversight",
  5: "Regulatory / MEA Compliance",
  6: "Platform Configuration",
  7: "Pipeline & Workflow Governance",
  8: "Account Security & Notifications UX",
  9: "End-to-End Workflow Verification",
};

const rows: Row[] = [
  // ══════════════════════════════════════════════════════════════════════
  // SECTION 1 — CANDIDATE EXPERIENCE
  // ══════════════════════════════════════════════════════════════════════
  { itemRef: "C1.1",  section: 1, sectionTitle: SECTIONS[1], description: "Journey timeline strip on candidate overview shows next 3 uncompleted milestones", testSteps: "Log in as demo_candidate and check the Dashboard overview card titled 'Your Journey'", expectedResult: "3 next steps displayed with one-click action buttons for each" },
  { itemRef: "C1.2",  section: 1, sectionTitle: SECTIONS[1], description: "Upcoming Interviews card on overview (auto-shows only when candidate has scheduled interviews)", testSteps: "As demo_candidate, check Overview below Journey strip", expectedResult: "Card lists next 3 interviews with date, mode, location" },
  { itemRef: "C1.3",  section: 1, sectionTitle: SECTIONS[1], description: "Offer Received banner with inline Accept / Decline + PDF download", testSteps: "Open My Applications → Software Developer (Siemens)", expectedResult: "Emerald banner shown with Accept / Decline / Download offer letter buttons" },
  { itemRef: "C1.4",  section: 1, sectionTitle: SECTIONS[1], description: "Rejection feedback widget shows recruiter notes when application is rejected", testSteps: "Open the Mechanical Engineer rejected application", expectedResult: "Red banner shows Feedback from Recruiter with detailed text" },
  { itemRef: "C1.5",  section: 1, sectionTitle: SECTIONS[1], description: "Employer card + benefits + similar-jobs strip on job detail page", testSteps: "Click any job in Browse Jobs", expectedResult: "Right panel shows employer initials logo, country-specific tagline, inferred benefits, 3 similar jobs" },
  { itemRef: "C1.6",  section: 1, sectionTitle: SECTIONS[1], description: "Salary tier filter (Entry/Mid/Senior/Unlisted) + salary sort on Browse Jobs (closes FRS 1.15 \uD83D\uDFE1 \u2192 \u2705)", testSteps: "Browse Jobs \u2192 pick Mid tier + Salary high\u2192low", expectedResult: "Results filtered + sorted correctly" },
  { itemRef: "C1.7",  section: 1, sectionTitle: SECTIONS[1], description: "Smart profile completion CTA deep-links to the missing wizard step", testSteps: "Sidebar \u2192 click the contextual completion button", expectedResult: "Navigates to /profile?step=N where N is the first incomplete section" },
  { itemRef: "C1.8",  section: 1, sectionTitle: SECTIONS[1], description: "Application pipeline stages show dates below labels on /applications/:id", testSteps: "Open any application detail page", expectedResult: "Dates visible under Submitted, Interview, Placed stages where known" },
  { itemRef: "C1.9",  section: 1, sectionTitle: SECTIONS[1], description: "Dedicated detail routes: /jobs/:id, /applications/:id, /agencies/:id (bookmarkable)", testSteps: "Click any row in Recent Applications / Top Recommendations on Overview", expectedResult: "Lands on dedicated detail page with breadcrumb" },
  { itemRef: "C1.10", section: 1, sectionTitle: SECTIONS[1], description: "Inline document upload + delete + verified badge in Documents tab", testSteps: "Documents tab \u2192 pick type \u2192 Upload \u2192 Delete", expectedResult: "Doc uploads, appears with pending/verified badge, delete works" },
  { itemRef: "C1.11", section: 1, sectionTitle: SECTIONS[1], description: "Candidate self-service Pre-Departure Compliance panel (passport, ECR, PCC, PDO, PBBY, IELTS)", testSteps: "Documents tab \u2192 Pre-Departure Compliance section \u2192 fill + Save", expectedResult: "Fields persist on refresh" },
  { itemRef: "C1.12", section: 1, sectionTitle: SECTIONS[1], description: "Portfolio PDF export \u2014 branded 1-page profile PDF download", testSteps: "Documents tab \u2192 My Portfolio PDF \u2192 Download PDF", expectedResult: "Branded PDF with full profile + compliance summary" },
  { itemRef: "C1.13", section: 1, sectionTitle: SECTIONS[1], description: ".ics calendar export for upcoming interviews", testSteps: "Overview \u2192 Upcoming Interviews \u2192 Add to calendar (.ics)", expectedResult: "ICS file opens in calendar app with correct time + location" },
  { itemRef: "C1.14", section: 1, sectionTitle: SECTIONS[1], description: "Welfare reply card (candidate proactive outreach post-placement)", testSteps: "Once candidate accepts an offer, check Overview", expectedResult: "Rose 'How are you doing?' card appears with one-line note + Send button" },
  { itemRef: "C1.15", section: 1, sectionTitle: SECTIONS[1], description: "Interview prep tips card auto-surfaces when interviews are upcoming", testSteps: "Log in as candidate with any scheduled interview", expectedResult: "Blue card on Overview with 5 practical tips" },
  { itemRef: "C1.16", section: 1, sectionTitle: SECTIONS[1], description: "Professional References management (add/list/delete up to 3)", testSteps: "Documents tab \u2192 Professional References \u2192 add a reference", expectedResult: "Reference appears; delete works; limit enforced at 3" },
  { itemRef: "C1.17", section: 1, sectionTitle: SECTIONS[1], description: "Unread notifications pulse-animated badge in header", testSteps: "Log in with unread notifications", expectedResult: "Bell has red badge with count + pulsing ring animation" },

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 2 — AGENCY PRODUCTIVITY
  // ══════════════════════════════════════════════════════════════════════
  { itemRef: "A2.1",  section: 2, sectionTitle: SECTIONS[2], description: "Applicant pipeline page at /agent/jobs/:id (pipeline funnel + search + filter)", testSteps: "As demo_agent \u2192 My Jobs \u2192 click a job \u2192 Manage", expectedResult: "Full pipeline view with 6-stage funnel chips" },
  { itemRef: "A2.2",  section: 2, sectionTitle: SECTIONS[2], description: "Bulk actions on applicants (multi-select + Mark Reviewed / Shortlist / Reject)", testSteps: "Check 2+ applicants \u2192 sticky action bar appears", expectedResult: "Bulk status updates work" },
  { itemRef: "A2.3",  section: 2, sectionTitle: SECTIONS[2], description: "Internal notes thread per applicant (agency-only, author-attributed)", testSteps: "Click 'Internal notes' on any applicant row", expectedResult: "Thread expands; notes persist with author + timestamp" },
  { itemRef: "A2.4",  section: 2, sectionTitle: SECTIONS[2], description: "Schedule Interview modal (date/time/mode/location + drive selector + auto-notify)", testSteps: "Shortlisted applicant \u2192 Schedule Interview \u2192 fill \u2192 Schedule", expectedResult: "Interview row created; candidate notified with details" },
  { itemRef: "A2.5",  section: 2, sectionTitle: SECTIONS[2], description: "Structured interview feedback (1\u20135 rating, strengths, concerns, recommendation)", testSteps: "Drive detail \u2192 Feedback button on any interview", expectedResult: "Modal saves rating + text fields; row shows rating on next view" },
  { itemRef: "A2.6",  section: 2, sectionTitle: SECTIONS[2], description: "CSV export of applicants per job (FRS 2.10 now \u2705)", testSteps: "Applicant pipeline \u2192 Export applicants (CSV) button", expectedResult: "File downloads with escape-safe CSV incl. compliance fields" },
  { itemRef: "A2.7",  section: 2, sectionTitle: SECTIONS[2], description: "ICS calendar export per interview", testSteps: "Drive detail \u2192 .ics button", expectedResult: "File opens in calendar app" },
  { itemRef: "A2.8",  section: 2, sectionTitle: SECTIONS[2], description: "Reversible interview results (Selected / Hold / Rejected + Clear)", testSteps: "Drive detail \u2192 set result \u2192 change to different result \u2192 Clear", expectedResult: "All transitions work; active state highlighted" },
  { itemRef: "A2.9",  section: 2, sectionTitle: SECTIONS[2], description: "Agent Reports / BI tab (funnel, conversion %, time-to-placement, top countries, trend chart)", testSteps: "Agent sidebar \u2192 Reports", expectedResult: "All widgets render with real aggregated data scoped to agent's jobs" },
  { itemRef: "A2.10", section: 2, sectionTitle: SECTIONS[2], description: "Job edit in-place via pencil icon on job card (applicants untouched)", testSteps: "My Jobs \u2192 pencil \u2192 change \u2192 Save", expectedResult: "Job updated; pipeline states preserved" },
  { itemRef: "A2.11", section: 2, sectionTitle: SECTIONS[2], description: "Rich candidate profile at /agent/candidates/:id (edu + exp + docs + applications + compliance)", testSteps: "Candidates tab \u2192 click any candidate", expectedResult: "Full profile page renders with all sections" },
  { itemRef: "A2.12", section: 2, sectionTitle: SECTIONS[2], description: "Drive detail page /agent/drives/:id with interviews table + reversible results", testSteps: "Drives tab \u2192 click any drive", expectedResult: "Drive details + scheduled interviews with actions" },
  { itemRef: "A2.13", section: 2, sectionTitle: SECTIONS[2], description: "Pre-Departure Compliance panel on candidate profile (agent-editable)", testSteps: "Agent candidate profile \u2192 Pre-Departure Compliance panel", expectedResult: "Form saves regulatory fields for the candidate" },
  { itemRef: "A2.14", section: 2, sectionTitle: SECTIONS[2], description: "Premium job-posting form (sectioned layout, icon inputs, flag emojis, skill chips)", testSteps: "Click Post Job", expectedResult: "Gradient header + 3 sections + icons inside every input" },
  { itemRef: "A2.15", section: 2, sectionTitle: SECTIONS[2], description: "Aggregate pipeline funnel widget on agent Overview", testSteps: "Agent Overview", expectedResult: "Stacked funnel bar + per-stage counts across all agent jobs" },

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 3 — EMPLOYER WORKFLOW
  // ══════════════════════════════════════════════════════════════════════
  { itemRef: "E3.1",  section: 3, sectionTitle: SECTIONS[3], description: "Dedicated /employer/review/:id decision queue (distinct from agent UI)", testSteps: "As demo_employer \u2192 My Jobs \u2192 Review Candidates", expectedResult: "Purple-brand decision page (not agent blue)" },
  { itemRef: "E3.2",  section: 3, sectionTitle: SECTIONS[3], description: "'Awaiting your decision' hero card on employer Overview", testSteps: "Employer Overview", expectedResult: "Purple gradient hero with count + preview of first 3 candidates to review" },
  { itemRef: "E3.3",  section: 3, sectionTitle: SECTIONS[3], description: "Requisition cards with progress bar (filled / target hires) + priority badge", testSteps: "Employer Overview \u2192 Active Requisitions", expectedResult: "Cards show priority (standard/urgent/critical), target, progress bar, deadline" },
  { itemRef: "E3.4",  section: 3, sectionTitle: SECTIONS[3], description: "Employer-specific actions: Approve for interview / Request replacement", testSteps: "Review queue \u2192 shortlisted candidate \u2192 Approve", expectedResult: "Candidate marked approved + agency notified" },
  { itemRef: "E3.5",  section: 3, sectionTitle: SECTIONS[3], description: "Request more candidates modal sends formal ask to agency", testSteps: "Review queue \u2192 top-right 'Request more candidates' \u2192 count + reason \u2192 send", expectedResult: "Agency receives notification with count + reason" },
  { itemRef: "E3.6",  section: 3, sectionTitle: SECTIONS[3], description: "Side-by-side candidate comparison modal (2+ at once)", testSteps: "Tick 2+ candidates \u2192 Compare side-by-side button", expectedResult: "Grid comparison with skills, experience, match score, decision state" },
  { itemRef: "E3.7",  section: 3, sectionTitle: SECTIONS[3], description: "Employer Offers & Placements tab (appointment letter link + welfare visibility)", testSteps: "Employer sidebar \u2192 Offers tab", expectedResult: "Cards for every placement with status, letter link, welfare history read-only" },
  { itemRef: "E3.8",  section: 3, sectionTitle: SECTIONS[3], description: "Appointment letter flow \u2014 URL linking + PDF template download (FRS 3.5 now \u2705)", testSteps: "Offers tab \u2192 Set URL + Download template PDF", expectedResult: "URL persists; PDF template generates with Emigration Act footer" },
  { itemRef: "E3.9",  section: 3, sectionTitle: SECTIONS[3], description: "Employer Reports tab (funnel + conversion + time-to-placement, scoped to employer's jobs)", testSteps: "Employer sidebar \u2192 Reports", expectedResult: "KPIs scoped to this employer's jobs only, not whole system" },
  { itemRef: "E3.10", section: 3, sectionTitle: SECTIONS[3], description: "Employer welfare contribution note on placements", testSteps: "Offers tab \u2192 placement card \u2192 welfare note (see API)", expectedResult: "Employer-specific note persists alongside agency welfare entries" },
  { itemRef: "E3.11", section: 3, sectionTitle: SECTIONS[3], description: "Premium requisition-creation form (target hires, deadline, priority pills)", testSteps: "Click New Requisition", expectedResult: "3-section form; priority as visual pills; flag-emoji country dropdown" },

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 4 — ADMIN / HPSEDC OVERSIGHT
  // ══════════════════════════════════════════════════════════════════════
  { itemRef: "D4.1",  section: 4, sectionTitle: SECTIONS[4], description: "Compliance Oversight tab (MEA policy enforcement dashboard)", testSteps: "As demo_admin \u2192 Compliance tab", expectedResult: "7 coverage tiles + 4 risk-flag lists render with real aggregates" },
  { itemRef: "D4.2",  section: 4, sectionTitle: SECTIONS[4], description: "Welfare SLA monitor (overdue 30/60/90 check-ins)", testSteps: "Admin \u2192 Welfare SLA tab", expectedResult: "Overdue list sorted by days-overdue; green state if all clear" },
  { itemRef: "D4.3",  section: 4, sectionTitle: SECTIONS[4], description: "Audit log viewer UI (actor/action/resource/details)", testSteps: "Admin \u2192 Audit Log tab", expectedResult: "Latest 100 audit entries with filters; JSON details visible on hover" },
  { itemRef: "D4.4",  section: 4, sectionTitle: SECTIONS[4], description: "User Management tab (list + enable/disable users)", testSteps: "Admin \u2192 Users tab \u2192 Disable any user \u2192 Enable", expectedResult: "User active status toggles; filter working" },
  { itemRef: "D4.5",  section: 4, sectionTitle: SECTIONS[4], description: "Agency rejection with reason (FRS 4.4 now \u2705; audit-logged)", testSteps: "Agencies tab \u2192 pending agency \u2192 Reject \u2192 reason", expectedResult: "Agency marked rejected; notification + audit entry written" },
  { itemRef: "D4.6",  section: 4, sectionTitle: SECTIONS[4], description: "Live dashboard metrics (candidates, jobs, placements, agencies \u2014 no mock data)", testSteps: "Admin Overview", expectedResult: "All 4 metric cards aggregate from real DB, update after any mutation" },
  { itemRef: "D4.7",  section: 4, sectionTitle: SECTIONS[4], description: "Bulk CSV export for 9 entity types", testSteps: "Admin \u2192 Reports tab / underlying endpoints", expectedResult: "candidates/jobs/applications/agencies/employers/drives/placements/grievances/users all exportable" },
  { itemRef: "D4.8",  section: 4, sectionTitle: SECTIONS[4], description: "District-wise and Country-wise charts on Overview", testSteps: "Admin Overview", expectedResult: "Recharts bar + pie charts render with live data" },

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 5 — REGULATORY / MEA COMPLIANCE
  // ══════════════════════════════════════════════════════════════════════
  { itemRef: "M5.1",  section: 5, sectionTitle: SECTIONS[5], description: "Passport tracking (number + expiry) on candidate record", testSteps: "Any candidate profile \u2192 Pre-Departure Compliance", expectedResult: "Passport number + expiry persist; expiring-soon list on Admin Compliance tab" },
  { itemRef: "M5.2",  section: 5, sectionTitle: SECTIONS[5], description: "ECR / ECNR status tracking (18 Gulf + Malaysia POE clearance)", testSteps: "Candidate compliance panel \u2192 set ECR/ECNR", expectedResult: "Status persists; risk flag fires if missing on placed candidate" },
  { itemRef: "M5.3",  section: 5, sectionTitle: SECTIONS[5], description: "Police Clearance Certificate status + expiry", testSteps: "Set PCC submitted + expiry", expectedResult: "Persists" },
  { itemRef: "M5.4",  section: 5, sectionTitle: SECTIONS[5], description: "Medical fitness tracking (fit/pending/unfit + date)", testSteps: "Set medical fit + date", expectedResult: "Persists; visible in compliance aggregates" },
  { itemRef: "M5.5",  section: 5, sectionTitle: SECTIONS[5], description: "IELTS band + language proficiency capture", testSteps: "Set IELTS 7.5", expectedResult: "Persists; appears on Portfolio PDF" },
  { itemRef: "M5.6",  section: 5, sectionTitle: SECTIONS[5], description: "Pre-Departure Orientation (PDO) tracking", testSteps: "Mark PDO completed + date on candidate", expectedResult: "Persists; risk flag fires if PDO missing on placed candidate" },
  { itemRef: "M5.7",  section: 5, sectionTitle: SECTIONS[5], description: "PBBY (Pravasi Bharatiya Bima Yojana) insurance tracking \u2014 Emigration Act \u00a710", testSteps: "Set PBBY enrolled + policy # on candidate", expectedResult: "Persists; risk flag fires if PBBY missing on placed candidate" },
  { itemRef: "M5.8",  section: 5, sectionTitle: SECTIONS[5], description: "Post-placement welfare check-ins (30/60/90 day)", testSteps: "Agent candidate profile \u2192 welfare cards", expectedResult: "Record status + notes; dates stored; admin welfare SLA tracks overdue" },
  { itemRef: "M5.9",  section: 5, sectionTitle: SECTIONS[5], description: "Candidate-initiated welfare outreach note", testSteps: "Candidate Overview (with active placement) \u2192 How are you doing card \u2192 send update", expectedResult: "Note persists; agency + HPSEDC can view" },
  { itemRef: "M5.10", section: 5, sectionTitle: SECTIONS[5], description: "Employer welfare contribution note per placement", testSteps: "Employer Offers tab \u2192 welfare-note API", expectedResult: "Employer note persists alongside agency + candidate notes" },
  { itemRef: "M5.11", section: 5, sectionTitle: SECTIONS[5], description: "Offer letter PDF generation with Emigration Act reference footer", testSteps: "Download offer letter PDF from candidate or employer UI", expectedResult: "Branded PDF with Emigration Act \u00a710 mention + next-steps checklist" },

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 6 — PLATFORM CONFIGURATION (runtime settings)
  // ══════════════════════════════════════════════════════════════════════
  { itemRef: "S6.1",  section: 6, sectionTitle: SECTIONS[6], description: "System Config admin tab renders 21 settings in 8 gradient-header categories", testSteps: "Admin \u2192 System Config tab", expectedResult: "All settings displayed grouped; live-save on change" },
  { itemRef: "S6.2",  section: 6, sectionTitle: SECTIONS[6], description: "Pipeline \u2014 allow backward transitions toggle", testSteps: "Toggle off; agent tries backward move on applicant", expectedResult: "403 returned when off" },
  { itemRef: "S6.3",  section: 6, sectionTitle: SECTIONS[6], description: "Pipeline \u2014 terminal states multi-select (admin-only lock)", testSteps: "Add 'placed' to terminal; agent tries to modify", expectedResult: "403 when non-admin" },
  { itemRef: "S6.4",  section: 6, sectionTitle: SECTIONS[6], description: "Pipeline \u2014 require reason for backward moves toggle", testSteps: "Toggle on; agent backward-moves without reason", expectedResult: "400 asking for reason" },
  { itemRef: "S6.5",  section: 6, sectionTitle: SECTIONS[6], description: "Rejection \u2014 require reason on reject toggle", testSteps: "Toggle on; agent tries empty rejection", expectedResult: "400 asking for rejection feedback" },
  { itemRef: "S6.6",  section: 6, sectionTitle: SECTIONS[6], description: "Access \u2014 drive auto-approve toggle", testSteps: "Toggle off; create drive as agent", expectedResult: "Drive goes straight to approved without HPSEDC gate" },
  { itemRef: "S6.7",  section: 6, sectionTitle: SECTIONS[6], description: "Access \u2014 agency verification required to publish jobs toggle", testSteps: "Toggle off; unverified agency posts job", expectedResult: "Job published; toggle on restores gating" },
  { itemRef: "S6.8",  section: 6, sectionTitle: SECTIONS[6], description: "Access \u2014 max active jobs per agency cap", testSteps: "Set cap = 3; agent with 3 active jobs posts another", expectedResult: "403 cap-reached message" },
  { itemRef: "S6.9",  section: 6, sectionTitle: SECTIONS[6], description: "Lifecycle \u2014 minimum profile completion % to apply", testSteps: "Set 80%; candidate < 80% tries to apply", expectedResult: "403 with required-% message" },
  { itemRef: "S6.10", section: 6, sectionTitle: SECTIONS[6], description: "Matching \u2014 recommendation threshold %", testSteps: "Set 70%; load candidate Recommended feed", expectedResult: "Only jobs \u2265 70% match shown" },
  { itemRef: "S6.11", section: 6, sectionTitle: SECTIONS[6], description: "Matching \u2014 leaderboard placement + rating weights", testSteps: "Change weights; reload leaderboard", expectedResult: "Reorders agencies per new weighting" },
  { itemRef: "S6.12", section: 6, sectionTitle: SECTIONS[6], description: "Notifications \u2014 auto-notify on status change toggle", testSteps: "Toggle off; agent changes status", expectedResult: "No candidate notification written" },
  { itemRef: "S6.13", section: 6, sectionTitle: SECTIONS[6], description: "Security \u2014 session timeout minutes", testSteps: "Configurable; check env/session cookie maxAge reflects setting", expectedResult: "Session cookie matches value on next boot" },
  { itemRef: "S6.14", section: 6, sectionTitle: SECTIONS[6], description: "Security \u2014 password minimum length", testSteps: "Configurable value readable via API", expectedResult: "Setting persists in system_settings" },
  { itemRef: "S6.15", section: 6, sectionTitle: SECTIONS[6], description: "Security \u2014 auth rate-limit attempts per 15min", testSteps: "Configurable; env AUTH_RATE_LIMIT_MAX override available", expectedResult: "Setting persists; env var takes precedence" },
  { itemRef: "S6.16", section: 6, sectionTitle: SECTIONS[6], description: "Settings audit-logged with updated_by + updated_at", testSteps: "Change any setting as admin; verify system_settings row", expectedResult: "updated_by + updated_at populated" },
  { itemRef: "S6.17", section: 6, sectionTitle: SECTIONS[6], description: "Setting type validation (min/max, enum, array options)", testSteps: "Try out-of-range number or invalid enum", expectedResult: "400 returned with helpful error" },
  { itemRef: "S6.18", section: 6, sectionTitle: SECTIONS[6], description: "In-memory cache with write-invalidation for zero-cost reads", testSteps: "Check settings service on server boot log", expectedResult: "\"Settings loaded: N stored, M using defaults\" log line present" },
  { itemRef: "S6.19", section: 6, sectionTitle: SECTIONS[6], description: "UAT-open defaults (rejection/backward reasons off during testing)", testSteps: "Fresh install shows UAT-friendly defaults", expectedResult: "Defaults in settings.service.ts UAT-open; comments indicate prod flip" },
  { itemRef: "S6.20", section: 6, sectionTitle: SECTIONS[6], description: "Pre-go-live checklist documented (4 toggles to flip for prod)", testSteps: "Read 06_System_Configuration_Reference.md", expectedResult: "Checklist with 4 actions: Terminal states, require reason on backward/reject, profile completion threshold" },
  { itemRef: "S6.21", section: 6, sectionTitle: SECTIONS[6], description: "Extensible: adding a new setting is ~5 lines; UI renders automatically", testSteps: "Code review of settings.service.ts SETTING_SPECS", expectedResult: "Spec-driven; no frontend change needed to add a new setting" },

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 7 — PIPELINE & WORKFLOW GOVERNANCE (Sprint 2 / PWS)
  // ══════════════════════════════════════════════════════════════════════
  { itemRef: "P7.1",  section: 7, sectionTitle: SECTIONS[7],
    description: "Employer requisitions are invisible to candidates — in the list AND on direct UUID fetch (v0.8.6 leak closed)",
    testSteps: "Log in as demo_candidate → Browse Jobs. Confirm no agents_only job appears in the list. Also call GET /api/v1/jobs directly. Separately, obtain an agents_only requisition UUID (e.g. as admin or employer) and hit GET /api/v1/jobs/<uuid> while logged in as the candidate.",
    expectedResult: "List response contains zero agents_only jobs. Direct-fetch returns 404 (not 403 — we don't confirm the ID exists). Verified agents, admins, and the owning employer still get 200. Closes the pre-v0.8.6 leak where a candidate in possession of a requisition UUID could pull the full record via the detail route even though the list hid it." },
  { itemRef: "P7.2",  section: 7, sectionTitle: SECTIONS[7],
    description: "Agents see open requisitions via /api/v1/agent/requisitions (pairing mode aware)",
    testSteps: "Log in as demo_agent → Open Requisitions. Confirm at least one requisition appears. Flip pairing_mode to pinned_only (no pin) → list becomes empty.",
    expectedResult: "Requisitions listed when pairing_mode=open; hidden when pinned_only without a pin." },
  { itemRef: "P7.3",  section: 7, sectionTitle: SECTIONS[7],
    description: "Agent pick-up creates a derivative agent-owned job (parent_requisition_id set, visibility=public)",
    testSteps: "As agent, click Pick Up on a requisition. Check My Jobs — new derivative present.",
    expectedResult: "Derivative created with parent_requisition_id = requisition.id, visibility=public; candidates see the derivative." },
  { itemRef: "P7.4",  section: 7, sectionTitle: SECTIONS[7],
    description: "In pinned_only pairing mode, only the pinned agent can pick up the requisition",
    testSteps: "Admin → System Config → set `requisition.pairing_mode = pinned_only`. Employer pins a requisition to Agent A. Log in as Agent B (also verified) and attempt pick-up. Then log in as Agent A and attempt pick-up. Restore `pairing_mode = open` after the test.",
    expectedResult: "Agent B → 403 Forbidden. Agent A → 201 Created (derivative job). Note: in the default `open` mode, a pinned requisition is NOT exclusive — every verified agent can pick it up, the pinned agent just gets a priority badge. Exclusivity only activates in `pinned_only`." },
  { itemRef: "P7.5",  section: 7, sectionTitle: SECTIONS[7],
    description: "Cascading close: employer closing a requisition auto-closes all derivatives",
    testSteps: "Create requisition R → 2 agents pick up (D1, D2). Employer closes R.",
    expectedResult: "R, D1, D2 all status=closed. Audit log has requisition.status_change + 2× job.cascade_close rows." },
  { itemRef: "P7.6",  section: 7, sectionTitle: SECTIONS[7],
    description: "Candidates on cascaded derivatives receive neutral 'Position filled' notification (no employer name)",
    testSteps: "Candidate applies to D1 → employer closes R → check candidate's notifications.",
    expectedResult: "Notification text matches 'Position filled' template; employer companyName NEVER appears." },
  { itemRef: "P7.7",  section: 7, sectionTitle: SECTIONS[7],
    description: "Employer-name scrubbed in candidate-facing rejection message",
    testSteps: "Shortlist a candidate → employer rejects → inspect candidate notification.",
    expectedResult: "Message says 'Not selected this round'; no mention of employer companyName." },
  { itemRef: "P7.8",  section: 7, sectionTitle: SECTIONS[7],
    description: "Agent closing a derivative does NOT cascade to the parent requisition",
    testSteps: "Create R → D1 → agent closes D1.",
    expectedResult: "R remains active; other agents can still pick up R." },
  { itemRef: "P7.9",  section: 7, sectionTitle: SECTIONS[7],
    description: "Candidate opt-in for agent outreach (open_to_outreach flag, per-candidate)",
    testSteps: "Set candidate X open_to_outreach=false. Log in as agent → candidate pool search.",
    expectedResult: "X is not listed for any agent's search when flag is off." },
  { itemRef: "P7.10", section: 7, sectionTitle: SECTIONS[7],
    description: "Auto-close cron respects hiring_deadline (runs 02:00 IST daily)",
    testSteps: "Seed a job with hiring_deadline = yesterday. Admin → POST /api/v1/admin/lifecycle/run.",
    expectedResult: "Status flips to closed; audit row action=job.auto_close (actor=system); owner + applicants notified." },
  { itemRef: "P7.11", section: 7, sectionTitle: SECTIONS[7],
    description: "Owner nudged N days before hiring_deadline (configurable)",
    testSteps: "Seed job with hiring_deadline = today + 3 days; job.auto_close_nudge_days_before_deadline=3. Trigger lifecycle.",
    expectedResult: "Owner receives 'closes in 3 days' notification exactly once." },
  { itemRef: "P7.12", section: 7, sectionTitle: SECTIONS[7],
    description: "Audit log written per application/job state transition",
    testSteps: "Walk an application: submitted → reviewed → shortlisted → rejected. Inspect audit_log.",
    expectedResult: "One row per transition with actor_user_id, actor_role, from, to, reason, ip, timestamp." },
  { itemRef: "P7.13", section: 7, sectionTitle: SECTIONS[7],
    description: "All pipeline + workflow settings (20+) are admin-editable without restart",
    testSteps: "Admin → System Config. Change requisition.pairing_mode from 'open' to 'pinned_only' and hit Save. Retry agent pick-up on an unpinned requisition. Then flip it back.",
    expectedResult: "Agent immediately blocked with 403; setting takes effect on the very next request with no server restart. The full matrix (pairing, cascade, terminal states, scrubbing, single-session, session timeout, salary filter, upload limits, scorecard auth, etc.) lives in `system_settings` and is documented in E2E_Workflow__Final_STG.md §6." },
  { itemRef: "P7.14", section: 7, sectionTitle: SECTIONS[7],
    description: "Notification templates editable by admin (14 events × up to 3 roles)",
    testSteps: "Admin → Notification Templates → edit 'application.shortlisted' (candidate). Trigger shortlist.",
    expectedResult: "New template wording appears in the next notification immediately." },
  { itemRef: "P7.15", section: 7, sectionTitle: SECTIONS[7],
    description: "Clone job creates a new draft with fields copied (except applicants)",
    testSteps: "From My Jobs, click Clone on any published job.",
    expectedResult: "New row with status=draft, title/description/skills copied, applicants not copied, hiringDeadline cleared." },
  { itemRef: "P7.16", section: 7, sectionTitle: SECTIONS[7],
    description: "Preview as Candidate renders the public-facing job card",
    testSteps: "Detail page → Preview → new tab.",
    expectedResult: "Candidate-facing job page opens without admin controls." },
  { itemRef: "P7.17", section: 7, sectionTitle: SECTIONS[7],
    description: "Shareable public link resolves with login gate",
    testSteps: "Copy share link → open incognito → login → attempt Apply.",
    expectedResult: "Public link resolves to job detail; login redirect preserves destination." },
  { itemRef: "P7.18", section: 7, sectionTitle: SECTIONS[7],
    description: "Draft cap enforced server-side (jobs.max_drafts_per_user)",
    testSteps: "Set cap=3. Create 3 drafts. Attempt 4th.",
    expectedResult: "4th attempt returns 403 with 'Draft limit reached' message." },
  { itemRef: "P7.19", section: 7, sectionTitle: SECTIONS[7],
    description: "Job analytics panel on detail page (views, application rate, avg match, time-to-first-applicant)",
    testSteps: "Open an active job with applicants; scroll to Analytics panel.",
    expectedResult: "4 metrics shown with non-zero values where data exists." },
  { itemRef: "P7.20", section: 7, sectionTitle: SECTIONS[7],
    description: "Auto-match notification fires when a new public job matches a candidate profile",
    testSteps: "Seed candidate with skills+preferred_country matching a new job. Post the job.",
    expectedResult: "Candidate receives 'Job matching your profile' notification (throttled once/day)." },
  { itemRef: "P7.21", section: 7, sectionTitle: SECTIONS[7],
    description: "Direct-fetch visibility gate on GET /api/v1/jobs/:id — no leak via a known requisition UUID (v0.8.6 regression)",
    testSteps: "Obtain an agents_only requisition UUID (as admin or employer). Then exercise the detail endpoint from four session contexts: (a) unauthenticated, (b) authenticated candidate, (c) verified agent, (d) admin, (e) the owning employer. Use GET /api/v1/jobs/<uuid> in each case.",
    expectedResult: "(a) unauth → 401. (b) candidate → 404 JSON ('Job not found') — must NOT reveal title, employer, or even existence of the id. (c) agent → 200 with full record. (d) admin → 200. (e) owning employer → 200. Pre-v0.8.6, the list endpoint filtered visibility but the detail endpoint didn't, so a candidate with the UUID could pull the record. Gated in server/routes/job.routes.ts:294-301 returning 404 (not 403) so we don't confirm ID existence to a non-privileged caller." },

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 8 — ACCOUNT SECURITY & NOTIFICATIONS UX
  // ══════════════════════════════════════════════════════════════════════

  // ── Account security ──────────────────────────────────────────────
  { itemRef: "A8.1", section: 8, sectionTitle: SECTIONS[8],
    description: "Change Password available from every logged-in user's account menu",
    testSteps: "Log in as any role → click the user initials/name in the header top-right → dropdown shows 'Change Password'.",
    expectedResult: "Dialog opens with Current / New / Confirm fields and live rules checklist." },
  { itemRef: "A8.2", section: 8, sectionTitle: SECTIONS[8],
    description: "Password change rejects wrong current password and weak new passwords",
    testSteps: "Open Change Password dialog. Enter wrong current password + valid new. Attempt submit. Then try current-correct but new='weak'.",
    expectedResult: "Wrong current → 'Current password is incorrect'. Weak new → rules checklist shows unmet items; submit disabled." },
  { itemRef: "A8.3", section: 8, sectionTitle: SECTIONS[8],
    description: "Password change enforces 8 chars + upper/lower/digit/special (same as registration)",
    testSteps: "Enter new password missing each class one at a time; observe the rules checklist.",
    expectedResult: "Each unmet rule is listed in red with ○; green ✓ as each becomes satisfied. Submit only enabled when all five rules + confirmation match." },
  { itemRef: "A8.4", section: 8, sectionTitle: SECTIONS[8],
    description: "Password change invalidates other sessions, keeps current session alive",
    testSteps: "Log in on device A. Change password. Verify device A remains logged in. Separately, any other device that was logged in gets signed out on its next request.",
    expectedResult: "Current tab /auth/me still returns 200. Other sessions removed from session store." },
  { itemRef: "A8.5", section: 8, sectionTitle: SECTIONS[8],
    description: "Password change is audit-logged",
    testSteps: "After a password change, Admin → Audit Log filter by actor or resource-id.",
    expectedResult: "A row with action including 'password_changed' and the actor's user id is present." },
  { itemRef: "A8.6", section: 8, sectionTitle: SECTIONS[8],
    description: "Password change works for superadmin",
    testSteps: "Log in as superadmin (default hpsedc@super2026) → Change Password from header menu.",
    expectedResult: "Dialog works; can rotate the superadmin password without code changes." },

  // ── Notifications drawer ──────────────────────────────────────────
  { itemRef: "A8.7", section: 8, sectionTitle: SECTIONS[8],
    description: "Bell in header opens a right-side notifications drawer (replaces old popover)",
    testSteps: "Log in as candidate. Click the bell icon in the header.",
    expectedResult: "Sheet drawer slides in from right with two tabs: Active and Saved." },
  { itemRef: "A8.8", section: 8, sectionTitle: SECTIONS[8],
    description: "Notifications use severity colors (info=sky, positive=emerald, warning=amber, urgent=red)",
    testSteps: "Seed notifications of each severity for a user; open the drawer.",
    expectedResult: "Each card shows the severity's dot + left border + tinted background. No amber-everywhere." },
  { itemRef: "A8.9", section: 8, sectionTitle: SECTIONS[8],
    description: "Dismiss button marks a notification as permanently dismissed",
    testSteps: "In Active tab, click × on a notification.",
    expectedResult: "Item disappears from Active. Returning with view=all shows dismissed_at populated. Item never resurfaces in Active." },
  { itemRef: "A8.10", section: 8, sectionTitle: SECTIONS[8],
    description: "Save button bookmarks a notification into the Saved tab",
    testSteps: "Click the 🔖 Save icon on any Active notification. Switch to Saved tab.",
    expectedResult: "Notification appears in Saved with a 'Saved' indicator; button becomes Unsave." },
  { itemRef: "A8.11", section: 8, sectionTitle: SECTIONS[8],
    description: "Offers, interviews, selected auto-save for candidates (never accidentally dismissed)",
    testSteps: "Trigger offer.issued / interview.scheduled / application.selected for a candidate.",
    expectedResult: "Notification lands with saved_at already set — visible in both Active and Saved tabs by default." },
  { itemRef: "A8.12", section: 8, sectionTitle: SECTIONS[8],
    description: "Dismiss-all bulk clears Active but preserves Saved items",
    testSteps: "With mixed notifications (some saved, some not) in Active, click 'Dismiss all' and confirm.",
    expectedResult: "Non-saved items dismissed; saved items remain active; saved count unchanged." },
  { itemRef: "A8.13", section: 8, sectionTitle: SECTIONS[8],
    description: "Unread badge + pulse on bell icon",
    testSteps: "Ensure unread notifications exist; observe the bell.",
    expectedResult: "Red badge with count (or '9+'), plus ping-animation ring. Goes away when all read or dismissed." },

  // ── Announcement banner ──────────────────────────────────────────
  { itemRef: "A8.14", section: 8, sectionTitle: SECTIONS[8],
    description: "Announcement banner uses severity color (info=sky, not amber as default)",
    testSteps: "Insert announcements with different severity values in DB, reload dashboard.",
    expectedResult: "Sky-blue for info (not amber), emerald for positive, amber for warning, red for urgent. Pinned keeps blue accent." },
  { itemRef: "A8.15", section: 8, sectionTitle: SECTIONS[8],
    description: "Announcement dismissal persists across page reloads",
    testSteps: "Dismiss an announcement via its × button. Refresh the page.",
    expectedResult: "Announcement does not reappear (stored in localStorage)." },
  { itemRef: "A8.15b", section: 8, sectionTitle: SECTIONS[8],
    description: "Announcement banner has Save-for-later button that mirrors it into Saved tab",
    testSteps: "On dashboard, click the 🔖 bookmark icon on an announcement banner. Open the bell drawer → Saved tab.",
    expectedResult: "Banner disappears (one less click than dismiss + save). A notification with the announcement's title/body/severity appears in the Saved tab. Re-saving the same announcement is idempotent (dedupe by announcementId)." },

  // ── Employer dashboard parity ────────────────────────────────────
  { itemRef: "A8.16", section: 8, sectionTitle: SECTIONS[8],
    description: "Employer can edit an existing requisition (opens form in edit mode)",
    testSteps: "Log in as demo_employer → My Jobs → click Edit on any requisition card.",
    expectedResult: "Dialog title 'Edit Requisition', all fields pre-filled, submit button says 'Save Changes'. PUT sent to /api/v1/jobs/:id." },
  { itemRef: "A8.17", section: 8, sectionTitle: SECTIONS[8],
    description: "Employer can clone a requisition into a new draft",
    testSteps: "Click Clone icon on any requisition card.",
    expectedResult: "New draft created with copied fields (applicants not copied, hiring deadline cleared, visibility=agents_only preserved)." },
  { itemRef: "A8.18", section: 8, sectionTitle: SECTIONS[8],
    description: "Employer can close an active requisition (with cascade to derivatives)",
    testSteps: "Click Close on an active requisition. Confirm the prompt.",
    expectedResult: "Status→closed; any derivative agent jobs also auto-close; candidates on derivatives receive neutral 'position filled' notification." },
  { itemRef: "A8.19", section: 8, sectionTitle: SECTIONS[8],
    description: "Employer can reopen a closed requisition",
    testSteps: "Click Reopen on a closed requisition.",
    expectedResult: "Status→active; button swaps back to Close." },
  { itemRef: "A8.20", section: 8, sectionTitle: SECTIONS[8],
    description: "Employer can delete a draft or applicant-free closed requisition",
    testSteps: "Click Delete on a draft or on a closed requisition with no applicants.",
    expectedResult: "Row removed. Delete is hidden when the requisition is active-with-applicants (audit-trail preservation)." },

  // ── Regressions tracked for QA ────────────────────────────────────
  { itemRef: "A8.21", section: 8, sectionTitle: SECTIONS[8],
    description: "Edit Requisition handles empty hiring_deadline without DB error",
    testSteps: "Edit a requisition that has no hiring_deadline set → change other fields → Save Changes.",
    expectedResult: "Saves cleanly (previous bug 'invalid input syntax for type date' fixed — form coerces empty string to null)." },

  // ── E2E pipeline walkthrough findings (2026-04-17 review) ─────────
  { itemRef: "A8.22", section: 8, sectionTitle: SECTIONS[8],
    description: "Employer can see applicants on agent-derivative jobs in the Review Queue",
    testSteps: "Post a requisition as employer (visibility=agents_only). Verified agent picks it up, creating a derivative public job. A candidate applies and the agent shortlists them. Open the employer's Review Queue.",
    expectedResult: "The shortlisted candidate appears. Previously missing because review-queue only scanned jobs.employerId=self; derivatives (employerId=null, parentRequisitionId=self) were invisible." },

  { itemRef: "A8.23", section: 8, sectionTitle: SECTIONS[8],
    description: "Employer can approve-for-interview / request-replacement on derivative job applicants",
    testSteps: "As employer, call POST /employer/applications/:id/approve-for-interview for a shortlisted candidate against an agent-derivative job.",
    expectedResult: "Returns 200. Previously returned 403 because the authorization check required direct jobs.employerId ownership; it now also accepts jobs whose parent_requisition_id is owned by the employer." },

  { itemRef: "A8.24", section: 8, sectionTitle: SECTIONS[8],
    description: "Employer requisition cards show hiring progress and awaiting-decision counts",
    testSteps: "Open the Employer dashboard → Jobs tab. Inspect any requisition card that has applicants.",
    expectedResult: "Shows 'N / target hired' pill (purple) summing direct + derivative selected/placed apps, and an 'N awaiting you' pill (amber) when an agent shortlist needs the employer's approve/reject decision." },

  { itemRef: "A8.25", section: 8, sectionTitle: SECTIONS[8],
    description: "Status-change notifications are single-sourced (no duplicates)",
    testSteps: "Shortlist a candidate. Inspect the candidate's notifications drawer.",
    expectedResult: "Exactly one notification lands per transition, with severity driven by event type (positive for shortlist/interview/select, warning for rejection, urgent for employer-rejection). Previously each transition wrote two rows — one legacy 'Application Update' (info) and one templated event." },

  { itemRef: "A8.26", section: 8, sectionTitle: SECTIONS[8],
    description: "Agent-driven rejection uses application.rejected template (not legacy generic)",
    testSteps: "As agent, mark a shortlisted candidate as rejected with rejectionFeedback.",
    expectedResult: "Candidate receives one 'Application not advancing' notification at warning severity. Employer name is scrubbed per PWS §5 (hide_employer_in_negatives). Admin can edit the template in Admin → Notifications." },

  { itemRef: "A8.27", section: 8, sectionTitle: SECTIONS[8],
    description: "Admin Audit Log shows human-readable state transitions inline",
    testSteps: "Open Admin → Audit Log. Filter resource=application.",
    expectedResult: "Status-change rows render as 'shortlisted → interview_scheduled' with the reason truncated inline. Hover shows the full pretty-printed JSON details payload. Previously the row was raw JSON only." },

  { itemRef: "A8.28", section: 8, sectionTitle: SECTIONS[8],
    description: "Agent Pick Up button shows a loading state during mutation",
    testSteps: "Agent → Open Requisitions tab → click Pick Up on any open requisition.",
    expectedResult: "Button text changes to 'Picking up…' with spinner while the request is in flight. Prevents double-submission and gives immediate feedback; previously the icon animated but the text was static." },

  { itemRef: "A8.29", section: 8, sectionTitle: SECTIONS[8],
    description: "Candidate offer Accept / Decline buttons show a loading state during mutation",
    testSteps: "As a candidate with a pending placement offer, click Accept Offer or Confirm Decline.",
    expectedResult: "Button label swaps to 'Accepting…' / 'Declining…' with a spinner until the PATCH resolves. Stops double-clicks during the network round trip." },

  // ── Phase 0 — Admin-configurable third-party integrations (FRS §3.1) ──
  { itemRef: "A8.30", section: 8, sectionTitle: SECTIONS[8],
    description: "Admin → Integrations tab lets the HPSEDC admin configure Email, SMS, Aadhaar, HIM Access SSO and DigiLocker without a code deploy",
    testSteps: "Sign in as admin. Open Admin → Integrations. Verify five cards are present (Email, SMS, Aadhaar, HIM Access, DigiLocker) with provider-type dropdown, enable toggle, non-secret config fields, secret fields, Save and Test buttons.",
    expectedResult: "All five cards render. The API never returns raw secret values — the card shows 'secret saved' indicator instead. Status badges reflect Disabled / Enabled / Test OK / Test failed / Using env fallback." },

  { itemRef: "A8.31", section: 8, sectionTitle: SECTIONS[8],
    description: "Email SMTP config persists across restart; test-connection calls smtp verify()",
    testSteps: "Save Email with valid SMTP host/port/user/pass. Click Test connection. Restart the server. Open the card again.",
    expectedResult: "Test returns 200 success on valid credentials, 400 with real error message on bad. After restart, config + secretFieldsPresent flags are still there. Saved secret is decrypted on demand when sendEmail() is called." },

  { itemRef: "A8.32", section: 8, sectionTitle: SECTIONS[8],
    description: "SMS gateway supports MSG91 / Twilio / Gupshup / NIC / mock without code change",
    testSteps: "Save SMS with provider=msg91 + apiKey + sender ID. Click Test connection with a valid phone number.",
    expectedResult: "Real SMS API call happens; provider chosen at runtime based on saved providerType. Fails gracefully with a clear error message if credentials missing. Mock / dev provider keeps logging to console when enabled." },

  { itemRef: "A8.33", section: 8, sectionTitle: SECTIONS[8],
    description: "HIM Access SSO + Aadhaar + DigiLocker read endpoint/client-id/secret from provider_config",
    testSteps: "Save HIM Access with endpoint + clientId + redirectUri + clientSecret. GET /api/v1/auth/sso/himaccess should redirect to the saved endpoint with the clientId in the query string.",
    expectedResult: "Redirects to a correctly-formed OAuth authorize URL once the admin has saved config. Returns 501 with a helpful message (pointing to Integrations panel) when not yet configured. Same pattern holds for /verify-aadhaar and (future) DigiLocker callback." },

  { itemRef: "A8.34", section: 8, sectionTitle: SECTIONS[8],
    description: "Integration secrets are encrypted at rest and never returned to the browser",
    testSteps: "Save SMS with an apiKey. Inspect the GET /admin/integrations response.",
    expectedResult: "Response contains 'secretFieldsPresent: [\"apiKey\"]' but never the key value itself. Raw DB row (provider_config.secrets) stores AES-256-GCM encrypted blob {iv, tag, cipher}. Rotating INTEGRATION_SECRET_KEY invalidates old blobs (by design)." },

  { itemRef: "A8.35", section: 8, sectionTitle: SECTIONS[8],
    description: "No payment or billing integration required (FRS confirmation)",
    testSteps: "Search FRS.txt and codebase for 'payment | fee | charge | subscription | razorpay | payu | paytm | stripe | billing'.",
    expectedResult: "No functional matches. HPSEDC overseas placement is free-of-cost for candidates per government mandate; no payment gateway work needed for UAT or production." },

  // ── Phase 1 quick-wins (trust + candidate engagement) ──────────────
  { itemRef: "C1.30", section: 1, sectionTitle: SECTIONS[1],
    description: "Candidate can report a suspicious job (fraud flag) into the HPSEDC grievance queue",
    testSteps: "Open a job. Click Report. Pick a reason (e.g. 'asks for money'). Add optional details. Submit.",
    expectedResult: "Creates a grievance with category=fraud_report and structured metadata {jobId, reason}. Candidate sees a confirmation toast reminding them HPSEDC jobs are always free. Admin sees the report in Admin → Grievances with jobId linkable inline." },

  { itemRef: "C1.31", section: 1, sectionTitle: SECTIONS[1],
    description: "Candidate sees a 'Viewed' badge on an application once the agent has opened / reviewed it",
    testSteps: "Submit an application. In agent console, move the application from submitted → reviewed. Return to the candidate dashboard Applications list.",
    expectedResult: "Emerald 'Viewed' badge appears beside the job title for any application in reviewed / shortlisted / interview_scheduled / selected / placed state. Addresses the #1 retention concern from Naukri research: candidates want to know their application isn't sitting in a black hole." },

  { itemRef: "C1.32", section: 1, sectionTitle: SECTIONS[1],
    description: "Profile Gaps card ranks missing sections by impact with overseas-specific hints",
    testSteps: "Log in as a candidate with < 100% profile. Open Overview.",
    expectedResult: "A 'Strengthen your profile' card shows ranked gaps (e.g. 'Add your highest education — Gulf / EU visas check qualification. Blocks most jobs if empty.'). Each row links to the matching step in the profile wizard. Card is hidden entirely at 100%." },

  { itemRef: "C1.33", section: 1, sectionTitle: SECTIONS[1],
    description: "Similar Jobs carousel at the bottom of job detail (same country + skill overlap)",
    testSteps: "As a candidate, open any public job detail. Scroll to the bottom.",
    expectedResult: "'Similar jobs you might like' row shows up to 5 active public jobs in the same country with ≥ 1 overlapping skill, sorted by overlap and experience proximity. Clicking a card swaps the detail pane." },

  // ── Phase 2 — Candidate + Agent quick wins ─────────────────────────
  { itemRef: "C1.34", section: 1, sectionTitle: SECTIONS[1],
    description: "Easy Apply badge on candidate job cards + 1-click apply when profile ≥ 70% complete",
    testSteps: "Log in as a candidate with ≥ 70% profile completion. Open Browse Jobs.",
    expectedResult: "Job cards with no existing application show an emerald 'EASY APPLY' pill and a small 'Apply now' button that triggers application creation without opening the detail pane. Candidates at < 70% see neither badge nor inline button." },

  { itemRef: "C1.35", section: 1, sectionTitle: SECTIONS[1],
    description: "Candidate can save a current job search and receive daily / weekly email digests",
    testSteps: "Filter the Jobs tab by country + skill + salary. Click 'Save search'. Set frequency to weekly. Confirm.",
    expectedResult: "Saved search persists to DB. Cron (07:30 UTC daily) emails the user when new jobs match. Max 10 saved searches per user. In-app notification also fires on each digest run." },

  { itemRef: "A2.30", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent bulk actions: select multiple applicants + shortlist / reject / mark-reviewed via /bulk-status",
    testSteps: "Open an agent job detail. Tick 2+ applicant checkboxes (or use 'Select all'). Click 'Shortlist All'.",
    expectedResult: "Single atomic PATCH /applications/bulk-status updates all selected applications, invalidates the applicants query, fires notifications. Fails cleanly if any applicant blocks the transition." },

  { itemRef: "A2.31", section: 2, sectionTitle: SECTIONS[2],
    description: "Compare Candidates side-by-side dialog (2-4 applicants)",
    testSteps: "Select 2-4 applicants on an agent job detail. Click 'Compare'.",
    expectedResult: "Modal shows a table with rows for Match / Experience / Location / Status / Skills / Languages / Passport / Education / Applied date, one column per selected candidate. Helps the 'who do we put forward?' decision without opening N tabs." },

  { itemRef: "A2.32", section: 2, sectionTitle: SECTIONS[2],
    description: "Kanban pipeline view on agent job detail — toggle between List and Board",
    testSteps: "On agent job detail, click 'Board' toggle.",
    expectedResult: "Applicants render as cards in 6 columns (Submitted → Reviewed → Shortlisted → Interview → Selected → Rejected). Each card has an inline status dropdown to move the candidate; changes persist immediately." },

  { itemRef: "A2.33", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent can add private per-candidate tags that persist across applications",
    testSteps: "Open an agent candidate detail. Under 'Your private tags', type 'good-english' + Enter.",
    expectedResult: "Tag saved to candidate_agent_tags table, scoped to (candidateId, agentUserId). Other agencies looking at the same candidate cannot see these tags. Delete via × icon. Validation: letters, digits, dashes, max 40 chars." },

  { itemRef: "C1.36", section: 1, sectionTitle: SECTIONS[1],
    description: "Public agency page shows active jobs, countries served, and verified license",
    testSteps: "Visit /agencies/<agency-id> without logging in.",
    expectedResult: "Page renders publicly (no auth) with agency name, license, verified badge, rating, specializations, **countries served**, and up to 8 **currently-hiring jobs** linking to the public job detail. Reviews list beneath." },

  // ── Phase 3 — Analytics + power features ───────────────────────────
  { itemRef: "A4.30", section: 4, sectionTitle: SECTIONS[4],
    description: "HPSEDC agency leaderboard with placements, time-to-offer, welfare %, grievances",
    testSteps: "Log in as admin. Open Admin → Leaderboard.",
    expectedResult: "Table ranks agencies by accepted placements (ties by rating, then fewer grievances). Columns: #, Agency, Placements, Accepted, Avg days → offer, Welfare %, Rating, Grievances 30d. Red count when ≥ 3 grievances." },

  { itemRef: "A4.31", section: 4, sectionTitle: SECTIONS[4],
    description: "Pipeline funnel analytics (submitted → reviewed → shortlisted → interview → selected → placed)",
    testSteps: "Admin → Funnel. Optionally filter by country.",
    expectedResult: "Horizontal bars show counts at each stage with relative drop-off %. Drop-off > 50% rendered in red. Filterable by country/agentId/since." },

  { itemRef: "A4.32", section: 4, sectionTitle: SECTIONS[4],
    description: "Fraud / anomaly watchlist — recent fraud reports + agencies with grievance spikes",
    testSteps: "Admin → Fraud watch.",
    expectedResult: "Top section: recent fraud reports (category=fraud_report) with reason metadata and linked jobId. Bottom: agencies with ≥ 3 grievances in the last 30 days. Aggregated from the existing grievances table; no new collection required." },

  { itemRef: "A3.30", section: 3, sectionTitle: SECTIONS[3],
    description: "Interview feedback now accepts a multi-dimensional scorecard (technical / communication / culture / english, 1–5 each)",
    testSteps: "After an interview, submit PATCH /interviews/:id/feedback with a scorecard object.",
    expectedResult: "Values outside 1–5 are dropped silently; valid dimensions stored in interviews.scorecard JSONB. Structured scorecard coexists with the existing single rating + recommendation fields." },

  { itemRef: "A2.34", section: 2, sectionTitle: SECTIONS[2],
    description: "@mentions in application notes notify the mentioned user",
    testSteps: "Post a note on an application with body '@username please review'.",
    expectedResult: "Note saved; user with matching username (case-insensitive) receives an in-app notification: 'Author mentioned you on a candidate'. Supports multiple mentions. Self-mentions skipped." },

  // ── Final wrap-up round — UX differentiators + UAT-blocker fixes ────
  { itemRef: "C1.37", section: 1, sectionTitle: SECTIONS[1],
    description: "Country Info Card shows embassy / visa / labor law / cost of living / climate on every overseas job",
    testSteps: "As a candidate, open any public job in a country we've seeded (UAE, Saudi, Qatar, Germany, UK, etc.). Scroll to bottom.",
    expectedResult: "A 'Working in <Country>' card renders with 8 info blocks sourced from /api/v1/content/countries/:key. Admin can edit copy in Admin → Countries. Signature differentiator for a govt overseas-placement portal." },

  { itemRef: "C1.38", section: 1, sectionTitle: SECTIONS[1],
    description: "Public application status check without login (phone + OTP + reference)",
    testSteps: "Visit /status-check without logging in. Enter phone on file. Receive OTP via SMS (dev console if SMS gateway not configured). Enter OTP + first 8 chars of application ID.",
    expectedResult: "Returns read-only status (stage + job title + country + placement details). Rate-limited 3 requests per phone per 10 minutes. OTP expires in 10 minutes and is single-use. No session is issued." },

  { itemRef: "C1.40", section: 1, sectionTitle: SECTIONS[1],
    description: "'Why you can't apply' inline reasons when Apply is blocked",
    testSteps: "As a candidate with < 40% profile, open a job detail.",
    expectedResult: "Apply Now button is disabled; a red bullet list below explains the specific gaps ('Add your full name', 'Upload a document', etc.). Eliminates silent fail and reduces support tickets." },

  { itemRef: "A4.33", section: 4, sectionTitle: SECTIONS[4],
    description: "Admin can detect and merge duplicate candidate records (by Aadhaar / phone / email)",
    testSteps: "Admin → Duplicates. Review groups. Click 'Merge into primary' on a non-primary row.",
    expectedResult: "All applications from the secondary candidate are reassigned to the primary record (skipping duplicate jobIds). Secondary candidate row is deleted. Audit-logged. Protects funnel analytics from inflation." },

  { itemRef: "A4.34", section: 4, sectionTitle: SECTIONS[4],
    description: "Country reference info is admin-editable from Admin → Countries",
    testSteps: "Admin → Countries tab → pick a country → edit embassy phone / visa days / any text field → Save.",
    expectedResult: "15 countries seeded on boot. Admin edits persist and take effect immediately on candidate job-detail pages (cache staleTime 5 minutes)." },

  { itemRef: "A2.35", section: 2, sectionTitle: SECTIONS[2],
    description: "Time-in-stage alerts on kanban cards (amber 7 days, red 14 days)",
    testSteps: "Open an agent job detail → Board view. Find a card that has sat in the same stage for more than 7 days.",
    expectedResult: "Card border turns amber at 7+ days, red at 14+. A day-count pill is shown next to the status dropdown. Terminal statuses (rejected / selected / placed) don't trigger the alert." },

  { itemRef: "A3.31", section: 3, sectionTitle: SECTIONS[3],
    description: "Welfare check-in overdue reminder on employer Placements tab (FRS §2.7 follow-up surfaced)",
    testSteps: "Open Employer dashboard → Offers tab. Find a placement whose start date was > 35 days ago without a 30-day welfare check-in.",
    expectedResult: "Amber pulsing badge '⚠ Welfare overdue: 30-day' appears next to the placement status. Thresholds at 35 / 65 / 95 days post start." },

  // ── v0.4.32 (Phase 2 — HPSEDC Item 1: Employer KYB workflow) ────────
  { itemRef: "A3.32", section: 3, sectionTitle: SECTIONS[3],
    description: "Employer verification banner — 3 states (untouched / submitted / rejected) gates the publish flow",
    testSteps: "Log in as demo_employer_unverified. Confirm amber banner appears at top of dashboard with 'Complete verification' button. Submit form, refresh — banner flips to blue. Have admin reject — banner flips to red with the rejection reason inline.",
    expectedResult: "Three visual states map 1:1 to employers.submittedForReviewAt + verified + rejectionReason columns. Verified employer sees no banner." },
  { itemRef: "A3.33", section: 3, sectionTitle: SECTIONS[3],
    description: "EmployerVerificationForm — 4 sections (Company, Address, Signatory, Documents) with structured fields for KYB",
    testSteps: "Open the form. Fill legal company name, CIN, GSTIN, PAN, industry, primary operating location. Then address line 1/2, city, state, PIN, country (defaults to India). Then contact email/phone + signatory name/designation/ID type/ID number. Click Save details.",
    expectedResult: "All fields persist via PATCH /api/v1/employer/profile. Reopening the dialog re-populates from API. companyName max 150 chars enforced; rest are bounded by maxLength on inputs." },
  { itemRef: "A3.34", section: 3, sectionTitle: SECTIONS[3],
    description: "7 employer doc slots + 'Other' catch-all (CIN, GST, PAN, Address proof, Signatory ID, Labour permission, Agreement)",
    testSteps: "Upload one PDF into each slot. Try uploading a doc with type='wrong_type' via direct API call.",
    expectedResult: "All 8 valid types succeed (201). Invalid type returns 400 with message listing allowed types. Each slot shows ✓ + filename + size + Remove button. CIN, PAN, Signatory ID are marked Required in the UI." },
  { itemRef: "A3.35", section: 3, sectionTitle: SECTIONS[3],
    description: "submit-for-review enforces required text fields + at least one doc",
    testSteps: "1. Click Submit on an empty form. 2. Fill text fields but upload no docs, click Submit. 3. Upload a doc, click Submit.",
    expectedResult: "1. 400 with message listing missing required fields (CIN / PAN / contact email / signatory name). 2. 400 with message 'Upload at least one verification document'. 3. 200, submittedForReviewAt set." },
  { itemRef: "A3.36", section: 3, sectionTitle: SECTIONS[3],
    description: "Publish-job gate — unverified employer cannot publish a requisition; drafts still allowed",
    testSteps: "As unverified employer, click New Requisition. Fill form. Click 'Publish'. Then click 'Save as Draft'.",
    expectedResult: "Publish returns 403 with message 'Your company must be verified before publishing requisitions'. Draft save succeeds and shows in My Jobs with status=draft. After admin approves, re-attempt publish — succeeds." },
  { itemRef: "A3.37", section: 3, sectionTitle: SECTIONS[3],
    description: "Setting `employer.require_verification_to_post` defaults ON; admin can toggle in System Config",
    testSteps: "As superadmin, open Admin → System Config → Access. Find 'Require company verification to publish requisitions'. Toggle OFF.",
    expectedResult: "Setting persists. With it OFF, unverified employer can publish (returns 201). Default in fresh seed is true (the HPSEDC-compliant posture)." },

  { itemRef: "P6.5", section: 6, sectionTitle: SECTIONS[6],
    description: "Server-side salary range filter on /api/v1/jobs (FRS 1.15 blocker fix)",
    testSteps: "GET /api/v1/jobs?minSalary=50000&maxSalary=100000",
    expectedResult: "Returns only jobs whose numeric salary token falls inside the range. Parses the first numeric run from the free-text salary field (e.g. 'EUR 60000' → 60000)." },

  { itemRef: "A4.35", section: 4, sectionTitle: SECTIONS[4],
    description: "Clone-from-previous (requisition templates) via existing POST /jobs/:id/clone",
    testSteps: "Employer → Jobs → click Clone on any job.",
    expectedResult: "Creates a new draft copy the employer can edit. Existed since v0.7; verified in this sprint so FRS coverage is explicit." },

  // ── v0.4.32 (Phase 2 — HPSEDC admin KYB review queue) ───────────────
  { itemRef: "A4.36", section: 4, sectionTitle: SECTIONS[4],
    description: "Admin Employers tab — new queue mirrors Agencies with KYB-aware UI",
    testSteps: "Log in as superadmin. Admin → tabs row → click 'Employers' (between Agencies and Compliance).",
    expectedResult: "Two-section layout: 'Awaiting review' (with amber badge count) on top, 'Verified companies' below. Each row expands inline. Rejected resubmissions sit in Awaiting with a red ribbon + previous rejection reason." },
  { itemRef: "A4.37", section: 4, sectionTitle: SECTIONS[4],
    description: "Expanded employer row shows full KYB details + per-doc table",
    testSteps: "On the Employers tab, expand a submitted employer. Scan the rendered fields.",
    expectedResult: "Sections show: Industry, CIN, GST, PAN, contact email/phone, authorised signatory (name + designation + ID type + ID number), registered address (concatenated). Uploaded documents table renders below with: filename, type label, current status badge, View button, review-note input, Approve / Reject buttons per row." },
  { itemRef: "A4.38", section: 4, sectionTitle: SECTIONS[4],
    description: "Per-document Approve / Reject with optional reviewNotes",
    testSteps: "Approve one doc with notes 'Verified against MCA portal'. Reject another with 'Blurry image — re-upload at higher resolution.'",
    expectedResult: "Status badge updates immediately. PATCH /api/v1/admin/employers/:id/documents/:docId persists status + reviewNotes. The employer sees the rejection note in their own document slot card." },
  { itemRef: "A4.39", section: 4, sectionTitle: SECTIONS[4],
    description: "Final approval requires admin enters a rejection reason for any negative decision",
    testSteps: "1. At the bottom of an expanded row, click 'Reject with reason' with empty textarea. 2. Type a reason and click again.",
    expectedResult: "1. Toast 'Reason required'; no API call. 2. PATCH /verify is called with {verified:false, rejectionReason:'…'}; employer receives in-app notification including the reason text. Approve path doesn't require any reason." },
  { itemRef: "A4.40", section: 4, sectionTitle: SECTIONS[4],
    description: "Admin Agencies tab now uses the same KYB review UI (was minimal Approve/Revoke list before v0.4.32)",
    testSteps: "Admin → Agencies tab. Expand any pending agency. Verify same UI as Employers tab.",
    expectedResult: "Identical row layout + per-doc approve/reject + reject-with-reason workflow. The legacy minimal AgencyApprovalList component is no longer mounted." },
  { itemRef: "A4.41", section: 4, sectionTitle: SECTIONS[4],
    description: "Verification result reaches the user as in-app notification with status-appropriate copy",
    testSteps: "Approve an employer. Switch to that employer's account, open notifications bell.",
    expectedResult: "New notification of type 'employer_verified' with success copy. Reject path produces notification with rejection reason embedded in message." },

  // ── Gap-closers for v0.8.3 / v0.8.4 / v0.8.5 (April 2026 regression audit) ──
  { itemRef: "A8.36", section: 8, sectionTitle: SECTIONS[8],
    description: "Multi-device sessions allowed by default (Aadhaar / Naukri behavior)",
    testSteps: "Log in as demo_candidate on Mac. Without logging out, open a new browser (or a different computer) and log in as the same user. Return to the Mac and click anywhere authenticated (Applications tab).",
    expectedResult: "Mac session still valid — no 401s. Previously the 'single-session per user' enforcement silently killed the first login's session on second login. Admin can flip `auth.single_session_per_user` ON in System Config → Security if HTIS audit insists on strict interpretation." },

  { itemRef: "A2.36", section: 2, sectionTitle: SECTIONS[2],
    description: "Already-picked-up requisitions show state instead of re-arming the Pick Up button",
    testSteps: "As a verified agent, pick up any employer requisition. Return to Open Requisitions.",
    expectedResult: "The picked-up requisition now shows an emerald 'Already picked up — open' link that jumps straight to the derivative job detail. Previously the Pick Up button stayed active and a second click raised a 409 with no graceful UI. Requisition endpoint now annotates each row with `pickedUpByMe` + `myDerivativeJobId`." },

  { itemRef: "A2.37", section: 2, sectionTitle: SECTIONS[2],
    description: "Applicants list endpoint returns data reliably (regression test for 22P02 malformed-array-literal bug)",
    testSteps: "As an agent, GET /api/v1/jobs/<any-job-id>/applicants — covering jobs with 0 applicants, 1 applicant, and many applicants.",
    expectedResult: "Returns 200 with `data` array. Previously, drizzle's sql-tagged template mis-serialized appIds arrays into pg text[] casts, causing every call to throw `22P02 malformed array literal`. Rewritten using drizzle's inArray() helper + client-side DISTINCT ON for time-in-stage. Daily regression covered by pipeline-phase2 test." },

  { itemRef: "A2.38", section: 2, sectionTitle: SECTIONS[2],
    description: "Applicants sortable by newest / oldest / best-match",
    testSteps: "Open agent job detail. Use the new sort dropdown in the filter bar. Try all three options.",
    expectedResult: "Server respects ?sort=newest|oldest|match. Default newest — answers 'did anyone new apply today?'. Best match uses matchScore DESC then appliedAt DESC as tie-breaker." },

  { itemRef: "E3.12", section: 3, sectionTitle: SECTIONS[3],
    description: "Employer requisition detail aggregates applicants across all derivative jobs (not just direct applicants)",
    testSteps: "Employer posts a requisition (agents_only). An agent picks it up. A candidate applies to the derivative. Agent shortlists. Employer opens /employer/review/<reqId>.",
    expectedResult: "Candidate visible in the Review Queue with approve/reject buttons. Counter boxes at top (AWAITING YOUR REVIEW / APPROVED FOR INTERVIEW / IN INTERVIEW / SELECTED) reflect the aggregated count. Previously the detail page fetched /jobs/:id/applicants which only returns direct applicants — derivative applicants were invisible even when the hero card on the dashboard correctly showed them. Fixed in v0.8.5 via new /employer/requisitions/:id/applicants endpoint." },

  { itemRef: "E3.13", section: 3, sectionTitle: SECTIONS[3],
    description: "Review Queue hero card and requisition detail page agree on applicant counts",
    testSteps: "Read the candidate count on the dashboard hero card ('Awaiting your decision'). Click through to a specific requisition. Compare the counter-box values on the detail page.",
    expectedResult: "Hero card count == sum of AWAITING + APPROVED + IN INTERVIEW + SELECTED across all listed requisitions. Opening any requisition shows the applicants contributing to that row with no mystery zeros." },

  { itemRef: "E3.14", section: 3, sectionTitle: SECTIONS[3],
    description: "`via` metadata on each applicant reveals which agency shortlisted them",
    testSteps: "In the employer requisition detail page, inspect any applicant row under the Review Queue.",
    expectedResult: "Each row carries a `via.agentId` and `via.isDerivative` flag from the API, ready for UI to render 'shortlisted by <agency>' tag when multiple agencies picked up the same requisition." },

  // ── Pipeline UX pass 1 (v0.9.0 — Apr 2026) ──────────────────────────
  { itemRef: "E3.15", section: 3, sectionTitle: SECTIONS[3],
    description: "Employer review queue — hero stats act as bucket filter (Awaiting / Approved / In interview / Selected)",
    testSteps: "Open /employer/review/<reqId>. Observe the 4 hero stat boxes at the top of the page. Click each in turn. Click the active one a second time to return to 'All reviewable'.",
    expectedResult: "Each box toggles a server-side-equivalent client filter: 'Awaiting your review' = status=shortlisted AND employerDecision is null. 'Approved for interview' = employerDecision=approved_for_interview. 'In interview' = status=interview_scheduled. 'Selected' = status=selected. Active box is inverted white-on-purple with aria-pressed=true. A 'Show all N →' link appears to reset. Queue header + empty-state copy adapt to the active bucket. Default on page load is 'Awaiting your review' — no more heap; employers land on the slice that needs their decision now." },

  { itemRef: "C1.42", section: 1, sectionTitle: SECTIONS[1],
    description: "Candidate My Applications — grouped into Active / Offers / Closed collapsible sections",
    testSteps: "Log in as priya_verma (has applications in several stages including a placed offer). Open My Applications. Observe the left list. Without filtering, the list is split into three collapsible groups. Click the group header to collapse. Change the status dropdown to any specific status — the list flattens.",
    expectedResult: "Three groups: Active (submitted/reviewed/shortlisted/interview_scheduled), Offers (selected/placed), Closed (rejected/withdrawn). Empty groups are hidden. Group headers show count and a caret toggle. When the status dropdown is set to a specific status OR the 'Awaiting your action' quick-filter is engaged, grouping is bypassed and a flat list is shown (the user has already narrowed)." },

  { itemRef: "C1.43", section: 1, sectionTitle: SECTIONS[1],
    description: "Candidate 'Awaiting your action' quick-filter — auto-engages when a pending offer exists",
    testSteps: "Log in as priya_verma (has a placement with status=offered). Open My Applications. An amber pill 'Awaiting your action' is visible above the list; on first load it is active (button highlighted). Cards for offered placements carry an inline 'Decide' badge. Click the pill to toggle off — the full list returns.",
    expectedResult: "Quick-filter pill is visible only when at least one application has `placement.status === \"offered\"`. On first load with such an offer present, the filter is auto-engaged so the candidate immediately sees the decision they need to make. Clicking toggles on/off. Cards for offered-status placements have an amber '⚡ Decide' badge for extra salience. Without any offered placement, neither the pill nor the default activation is shown." },

  { itemRef: "A2.39", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent per-job applicants — auto-default filter to 'submitted' when fresh applicants exist",
    testSteps: "Log in as europe_careers. Open any job that has at least one submitted-status applicant. Observe the pipeline funnel chips.",
    expectedResult: "On first load, the 'Submitted' chip is auto-selected (ring highlight, count visible) if count > 0. User can click any other chip — the auto-default only runs once, never fights the user. Clicking the already-active chip returns to 'All'. When the job has zero submitted applicants, the default stays on 'All' (no auto-engage). The List/Kanban toggle and sort dropdown are unchanged." },

  // ── Pipeline UX pass 2 (v0.9.1 — Apr 2026): aging + stale filter ────
  { itemRef: "A2.40", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent per-job list — time-in-stage badge appears at 7+ days (amber) / 14+ days (red)",
    testSteps: "Open any agent job with applicants. Switch to List view. Inspect rows for applicants who've been in their current stage for a week or more.",
    expectedResult: "Rows for non-terminal statuses (submitted/reviewed/shortlisted/interview_scheduled) display an aging badge when daysInStage ≥ 7. Amber ('⏳ Nd in stage') at 7–13 days, red ('🔥 Nd in stage') at 14+. Hidden for terminal statuses (rejected/selected/placed) and for rows with daysInStage < 7. Kanban board already showed this; list view now matches." },

  { itemRef: "E3.16", section: 3, sectionTitle: SECTIONS[3],
    description: "Employer review queue — time-in-stage badge on each candidate card (7d amber, 14d red)",
    testSteps: "Open /employer/review/<reqId>. Inspect any candidate card. Backend endpoint `/employer/requisitions/:id/applicants` now returns `daysInStage` + `stageEnteredAt` per row (same derivation as agent endpoint: latest application.status_change audit row per app).",
    expectedResult: "Cards with daysInStage ≥ 7 show an inline aging badge (amber) or 🔥 red badge at ≥ 14. Employer sees at a glance which approved-for-interview candidates have been waiting without a scheduled interview, or which selections are past the typical offer-letter turnaround. Response keys: `daysInStage`, `stageEnteredAt`." },

  { itemRef: "A2.41", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent per-job applicants — '⏳ Stale' quick-filter chip restricts to daysInStage ≥ 7",
    testSteps: "Open a job with mixed-age applicants. Above the list, an amber '⏳ Stale N' chip appears only when N > 0. Click it.",
    expectedResult: "Chip toggles an onlyStale filter that composes with the existing statusFilter + search. aria-pressed reflects active state. Terminal statuses are excluded from the stale definition. When no applicants are stale, the chip is hidden (no false urgency). Filter persists within the page session; not URL-synced yet." },

  { itemRef: "E3.17", section: 3, sectionTitle: SECTIONS[3],
    description: "Employer review queue — '⏳ Stale' quick-filter chip composes with bucket filter",
    testSteps: "Open /employer/review/<reqId>. Above the queue header, an amber '⏳ Stale N' chip shows when N > 0. Pick a bucket (e.g. 'Approved for interview'). Click the stale chip.",
    expectedResult: "Stale filter composes with the bucket. Example: 'Approved for interview' + Stale shows only candidates the employer already approved > 7 days ago without a scheduled interview — the natural 'I should nudge the agent' slice. Header shows a 'Stale only' badge while active. Hidden when no aging rows exist." },

  // ── Pipeline UX pass 3 (v0.9.2 — Apr 2026): aggregate view + persistent selection ──
  { itemRef: "A2.42", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent aggregate 'All applicants across your jobs' — single-pane cross-job pipeline view at /agent/applicants",
    testSteps: "Log in as europe_careers. From the left sidebar, click the 'All applicants across your jobs' gradient card (it links to /agent/applicants). The new page lists every application across every job the agent owns, with the job title shown on each row. Observe the 7-chip stage funnel + search + stale filter.",
    expectedResult: "New backend endpoint `GET /api/v1/agent/applicants` returns all applicants across jobs where agentId=self, with daysInStage derived from audit log (same logic as per-job endpoint). Response: { data: Applicant[], jobCount: number, total: number }. Each row includes jobId / jobTitle / jobCountry + candidate + matchScore + daysInStage + stageEnteredAt. Page defaults to 'Submitted' filter when count > 0 (Awaiting my action). Search matches candidate name, job title, or skill. Stale chip composes with stage filter. Non-agents (candidate, employer) receive 403 from the endpoint." },

  { itemRef: "A2.43", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent per-job list — selection survives filter changes, hidden-count hint appears",
    testSteps: "Open an agent job with >3 applicants in mixed stages. Select 3 rows via checkboxes (e.g. 2 submitted + 1 shortlisted). In the sticky bulk-action bar: '3 selected'. Now click the 'Shortlisted' pipeline chip to filter.",
    expectedResult: "Selection set persists (IDs don't get cleared on filter change). The bulk-action bar now reads '3 selected (2 hidden by current filter)'. Clearing the filter shows all 3 selections intact. 'Clear' button wipes the set. Bulk actions still apply to the full selection set — including filter-hidden rows — so the user doesn't lose work when focusing a slice." },

  { itemRef: "E3.18", section: 3, sectionTitle: SECTIONS[3],
    description: "Employer review queue — selection survives bucket + stale filter changes, hidden-count hint appears",
    testSteps: "Open /employer/review/<reqId> with at least 2 candidates in the reviewable set. Select 2 via checkbox. The compare bar appears: '2 candidates selected for comparison'. Click a different bucket (e.g. 'Selected') that doesn't contain the selected rows.",
    expectedResult: "Compare bar still shows '2 candidates selected for comparison' with a hidden-count suffix '(2 hidden by current filter)'. Switch back to the original bucket — the hint disappears; selections unchanged. Enables workflow: employer can pick cross-bucket candidates for side-by-side comparison without losing work." },

  // ── Pipeline UX pass 4 (v0.9.3 — Apr 2026): dead cards → interactive, filters on lists, profile photo ──
  { itemRef: "A2.44", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent dashboard — Applicant Pipeline stage pills are deep-links (no more dead divs)",
    testSteps: "Log in as an agent with applicants spread across stages. On the Dashboard view, scroll to the Applicant Pipeline card. Click any stage pill (New / Reviewed / Shortlisted / Interview / Selected / Placed).",
    expectedResult: "Each pill navigates to `/agent/applicants?status=<stage>` with that stage pre-selected in the aggregate view. URL query is treated as the user's intent and suppresses the auto-default-to-submitted behavior. Previously these pills rendered as read-only `<div>` elements — zero interactivity even though they visually invited a click." },

  { itemRef: "A2.45", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent dashboard — Quick Stats and StatCard tiles pre-filter the downstream view",
    testSteps: "Log in as agent. Click the 'Placements' MiniStat or StatCard. Click 'Active Jobs'. Click back to Dashboard, then click 'Active Jobs' StatCard.",
    expectedResult: "Placements → lands on `/agent/applicants?status=placed` filtered to placed candidates across all jobs. Active Jobs → switches to My Jobs with the `Active` chip pre-selected. Previously the cards were either non-interactive or only switched tabs without carrying a filter." },

  { itemRef: "E3.19", section: 3, sectionTitle: SECTIONS[3],
    description: "Employer dashboard — Closed MiniStat is interactive and pre-filters My Jobs to closed",
    testSteps: "Log in as demo_employer. In the sidebar Quick Stats, click 'Closed'.",
    expectedResult: "Switches to My Jobs view with the `Closed` chip pre-selected; only closed requisitions render. Previously 'Closed' was a dead stat. The chip bar lets you toggle to All / Active / Drafts without extra clicks." },

  { itemRef: "A2.46", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent My Jobs — filter chip bar (All / Active / Drafts / Closed) + search + country select",
    testSteps: "Agent dashboard → My Jobs. Observe the chip bar, search input, and country dropdown at the top of the list. Type in search, pick a country, toggle a chip.",
    expectedResult: "Chips show live counts per status (updates with data). Search matches title / company / location / skill. Country dropdown populated from the jobs' own countries (no pre-seeded list). All three filters compose; clearing falls back to full list. No new nav element — the chip bar sits inside the existing card header." },

  { itemRef: "E3.20", section: 3, sectionTitle: SECTIONS[3],
    description: "Employer My Jobs — same chip bar + search + country filter (parity with agent)",
    testSteps: "Employer dashboard → My Jobs. Same three-filter stack as A2.46.",
    expectedResult: "Same behavior — chips with counts, search across title/company/location/skill, country select. Clean empty-state when filters narrow to zero." },

  { itemRef: "A2.47", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent Candidates — experience bucket chips + location / country selects",
    testSteps: "Agent dashboard → Candidates. Observe new filter row: experience chips (All / Junior <3y / Mid 3–6y / Senior 7y+) + location select + preferred-country select + Clear.",
    expectedResult: "Filters compose with the existing skill search. Buckets map to `candidates.experience` thresholds. Location and country options are derived from the actual candidate pool (not a static list). 'Clear' resets only the added filters, leaves the skill search in place. No new page navigation." },

  { itemRef: "C1.44", section: 1, sectionTitle: SECTIONS[1],
    description: "Candidate profile photo — upload / change / remove from the sidebar card",
    testSteps: "Log in as priya_verma. In the left sidebar Profile Card, click 'Upload photo' — pick a JPG or PNG under 10 MB. The avatar updates immediately. Click 'Change photo' to re-upload. Click 'Remove' to delete.",
    expectedResult: "POST /api/v1/me/photo writes the file to /uploads/photos/ (shared multer pipeline, magic-byte verified) and sets candidates.photoUrl. DELETE clears the column and removes the file. The photo is served statically at /uploads/photos/<file> (distinct from the auth-protected /uploads/ where sensitive docs live). Candidate schema gained a nullable `photo_url` column (applied via ALTER, not destructive drizzle push)." },

  { itemRef: "A2.48", section: 2, sectionTitle: SECTIONS[2],
    description: "Photo renders everywhere a candidate is listed — agent Candidates tab, agent per-job list, aggregate view, employer review queue",
    testSteps: "Upload a photo as priya_verma. Log out, log in as europe_careers. Navigate: Candidates tab → job with priya's application → /agent/applicants aggregate. Then log in as demo_employer → review a requisition with priya as a shortlisted candidate.",
    expectedResult: "All five surfaces now render the real photo (not initials) for priya. Other candidates without a photo continue to show initials gradient — no visual gap. Backend projections on employer `/employer/requisitions/:id/applicants`, agent `/jobs/:id/applicants` (+ aggregate `/agent/applicants`) now include `photoUrl`. Broken images (e.g. deleted file) gracefully fall back." },

  // ── Pipeline UX pass 5 (v0.9.4 — Apr 2026): full filter/sort tooling ──
  { itemRef: "A2.49", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent aggregate applicants — stage cards in a single horizontal row with snap-scroll on narrow viewports",
    testSteps: "Open /agent/applicants on desktop and on a narrow window (< 720px). Confirm the 8 stage cards (All + 6 pipeline + Rejected) sit on one line, not wrapping. On narrow viewports the row scrolls horizontally with snap stops.",
    expectedResult: "All 8 stage cards live on a single line regardless of screen width. Previous layout wrapped to a second row on viewports below ~900px; now the toolbar stays a single rhythm. Cards shrunk to min-w-[92px] + py-2 so the row still fits in the content column." },

  { itemRef: "A2.50", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent aggregate applicants — rich filter/sort toolbar: sort, country, company, priority, job",
    testSteps: "On /agent/applicants toolbar row 2: pick Sort (Newest / Oldest / Best match / Longest in stage). Open Country select. Company select. Priority select. Job select. Clear button resets all to defaults.",
    expectedResult: "All filters compose with each other + the stage-card status filter + the search + the stale chip. Selects are derived from the actual dataset (no hardcoded lists) — empty options hidden when there's only one distinct value. Sort: Newest (appliedAt desc), Oldest (asc), Best match (matchScore desc), Longest in stage (daysInStage desc). Backend `/api/v1/agent/applicants` now returns `jobCompany` + `jobPriority` on every row." },

  { itemRef: "A2.51", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent My Jobs — sort dropdown (newest / oldest / deadline / priority) + priority chip row + company filter",
    testSteps: "Agent dashboard → My Jobs. Change Sort to 'Deadline (soonest)' — jobs with no deadline fall to the bottom. Switch to 'Priority (high→low)' — critical first, then urgent, then standard. Click the 'Urgent' priority chip — list narrows.",
    expectedResult: "Sort options: Newest (createdAt desc, default) / Oldest / Deadline (hiringDeadline asc, nulls-last) / Priority (critical > urgent > standard). Priority chips compose with status chips and country/company selects. Clear resets all extras while keeping the status chip." },

  { itemRef: "E3.21", section: 3, sectionTitle: SECTIONS[3],
    description: "Employer My Jobs — same sort + priority chips (parity with agent)",
    testSteps: "Employer dashboard → My Jobs. Same four sort options, same priority chip row.",
    expectedResult: "Behaviour identical to A2.51. Empty state copy adapts when filters narrow to zero." },

  { itemRef: "A2.52", section: 2, sectionTitle: SECTIONS[2],
    description: "Agent Candidates — sort + profile-complete + open-to-outreach chips on top of existing skill search + experience + location",
    testSteps: "Agent dashboard → Candidates. Change Sort to 'Most experience'. Click 'Profile complete' chip. Toggle 'Open to outreach only' pill.",
    expectedResult: "Sort options: Newest (createdAt desc, default) / Oldest / Most experience (experience desc) / Complete profiles first. Profile-complete chips: All / Complete / Incomplete. Outreach-only pill: when pressed, hides candidates with `openToOutreach = false`. All filters compose; Clear resets all." },

  // ── v0.4.32 (Phase 2 — HPSEDC Item 3: Agency KYB workflow) ───────────
  { itemRef: "A2.53", section: 2, sectionTitle: SECTIONS[2],
    description: "Agency verification banner — 3 states (untouched / submitted / rejected) drives the Complete Verification CTA",
    testSteps: "Log in as demo_agent_unverified. Confirm amber banner shown with 'Complete verification' button. Submit the form, refresh — banner flips to blue 'under review'. Have admin reject — banner flips to red with reason shown.",
    expectedResult: "Three visual states map 1:1 to recruitmentAgents.submittedForReviewAt + verified + rejectionReason columns. CTA opens the same dialog in all states. Approved state hides the banner entirely." },
  { itemRef: "A2.54", section: 2, sectionTitle: SECTIONS[2],
    description: "AgencyVerificationForm renders 4 sections (Agency info, Address, Signatory, Documents)",
    testSteps: "Open 'Complete verification' dialog as an unverified agent. Fill agency name, MEA RA Licence number, MEA expiry, contact email/phone, address, signatory fields. Click Save details.",
    expectedResult: "All fields persist to recruitment_agents row via PATCH /api/v1/agencies/me. Reopening the dialog re-populates from the API." },
  { itemRef: "A2.55", section: 2, sectionTitle: SECTIONS[2],
    description: "9 HPSEDC-mandated agency doc slots + 'Other' catch-all, each with persistent ✓ + per-doc status badge",
    testSteps: "In the Documents section, upload a PDF into the MEA RA Licence slot. Confirm card flips emerald with ✓. Repeat for Incorporation, PAN, GST, Address Proof, Signatory ID, Labour Permission, Experience, Agreement. Try uploading an unrelated doc into 'Other'.",
    expectedResult: "Each slot shows pending/approved/rejected badge. Replace + Add another preserves history. POST /api/v1/agencies/documents enforces type allow-list — server-side reject for bogus types." },
  { itemRef: "A2.56", section: 2, sectionTitle: SECTIONS[2],
    description: "submit-for-review requires MEA RA Licence; missing license returns 400 with explanatory error",
    testSteps: "Upload only PAN + GST docs (no MEA license). Click 'Submit for review'. Confirm error toast names the missing license.",
    expectedResult: "Server returns 400 with message mentioning 'MEA RA Licence'. Submit succeeds once the license doc is uploaded; submittedForReviewAt timestamp is set." },
  { itemRef: "A2.57", section: 2, sectionTitle: SECTIONS[2],
    description: "Approved docs become read-only — agent cannot delete an approved doc",
    testSteps: "Have admin approve any doc. Re-login as agent and try to remove that doc.",
    expectedResult: "Delete button is hidden in the UI for approved docs. Direct DELETE call returns 400 with message 'Cannot remove an approved document'." },

  // ── Section 9 — End-to-End Workflow Verification ────────────────────
  // These walk a reviewer through a complete Flow A or Flow B end-to-end.
  // Each single item is the full sequence; the expected result is a
  // monolithic assertion. Run AFTER per-feature items (Sections 1-8) pass.
  { itemRef: "E9.1", section: 9, sectionTitle: SECTIONS[9],
    description: "Flow A — Employer-led end-to-end walkthrough",
    testSteps: [
      "1. Log in as demo_employer. Post a new requisition (visibility=agents_only). Note the req id.",
      "2. Log in as demo_candidate. Confirm the requisition is NOT visible on the Jobs list.",
      "3. Log in as europe_careers (verified agent). Open Requisitions tab. Click Pick Up on the new req.",
      "4. Log in as demo_candidate again. Confirm the derivative job IS visible. Apply.",
      "5. Log in as europe_careers. Applicants list shows the candidate. Status transition: shortlisted.",
      "6. Log in as demo_employer. Open the requisition detail page. Candidate appears in Review Queue.",
      "7. Click 'Approve for interview'. Agent receives notification.",
      "8. Log in as europe_careers. Transition application to interview_scheduled.",
      "9. Log in as demo_employer. Mark candidate selected.",
      "10. Log in as europe_careers. Create a placement. Upload appointment-letter URL.",
      "11. Log in as demo_candidate. Accept the offer.",
      "12. Log in as demo_admin. Open Admin → Audit Log, filter by application. Every transition is logged with actorRole + from → to.",
    ].join("\n"),
    expectedResult: "Every step succeeds; no 401/500 errors; notifications fire to the correct party at each stage; the candidate sees sanitized status transitions (employer name stays hidden until 'selected'); admin audit log shows all transitions with actorRole in the details JSON. This is the FRS §2.7 canonical workflow." },

  { itemRef: "E9.2", section: 9, sectionTitle: SECTIONS[9],
    description: "Flow B — Agent-led end-to-end walkthrough",
    testSteps: [
      "1. Log in as europe_careers. Post a new public job directly (no employer requisition behind it). Note the job id.",
      "2. Log in as demo_candidate. Confirm the job is visible on the Jobs list. Apply.",
      "3. Log in as europe_careers. Screen → reviewed → shortlisted.",
      "4. Confirm the requisition does NOT appear in any employer's Review Queue (there is no employer).",
      "5. europe_careers transitions shortlisted → interview_scheduled → selected.",
      "6. europe_careers creates a placement.",
      "7. demo_candidate accepts.",
      "8. Admin audit log records the full sequence with actorRole=agent throughout.",
    ].join("\n"),
    expectedResult: "Flow B succeeds without any employer action because the employer row doesn't exist on-platform. Agent carries out every step. Useful for agencies with direct off-platform employer mandates." },

  { itemRef: "E9.3", section: 9, sectionTitle: SECTIONS[9],
    description: "Multi-agent pickup — multiple agencies can serve the same employer requisition",
    testSteps: [
      "1. Admin ensures `requisition.pairing_mode = open` (default) in System Config.",
      "2. demo_employer posts a requisition.",
      "3. europe_careers picks it up (derivative B1).",
      "4. gulf_jobs_direct (also verified) picks up the same requisition (derivative B2).",
      "5. One candidate applies to B1, a different candidate applies to B2.",
      "6. Each agent shortlists their own candidate.",
      "7. demo_employer opens the requisition detail page.",
    ].join("\n"),
    expectedResult: "Employer sees BOTH candidates in the Review Queue, each with a `via.agentId` marker. Approving one notifies only that agent. When employer closes the requisition, both B1 and B2 cascade-close per the lifecycle cron." },

  { itemRef: "E9.4", section: 9, sectionTitle: SECTIONS[9],
    description: "Pinned agent in pinned_only mode blocks other agencies",
    testSteps: [
      "1. Admin sets `requisition.pairing_mode = pinned_only` in System Config.",
      "2. demo_employer posts a requisition with pinnedAgentId = europe_careers' userId.",
      "3. Log in as gulf_jobs_direct (different verified agency). Open Requisitions tab.",
    ].join("\n"),
    expectedResult: "The pinned requisition does NOT appear in gulf_jobs_direct's Open Requisitions list. Only europe_careers can see/pick it up. After the test, flip the setting back to `open` to keep defaults." },

  { itemRef: "E9.5", section: 9, sectionTitle: SECTIONS[9],
    description: "Employer name scrubbing on candidate-facing rejection (FRS §5 compliance)",
    testSteps: "Run Flow A up to step 5 (agent shortlists). Then agent rejects the candidate with feedback. Log in as the candidate and open the notification.",
    expectedResult: "Notification title: 'Application not advancing'. Message contains the job title but NOT the employer company name (scrubbed to 'the employer'). This is governed by `notifications.hide_employer_in_negatives` = true (default). Flipping it off reveals the employer name, as expected." },

  { itemRef: "E9.6", section: 9, sectionTitle: SECTIONS[9],
    description: "Cascade close — filling a requisition auto-closes all derivatives",
    testSteps: [
      "1. Flow A steps 1-9 (candidate selected on derivative B1).",
      "2. A second agent (gulf_jobs_direct) has also picked up the same requisition → derivative B2 exists with active applicants.",
      "3. demo_employer opens the requisition and clicks 'Close' (or the lifecycle cron fires past hiring deadline).",
    ].join("\n"),
    expectedResult: "B1 and B2 both transition to status=closed. Their applicants receive an 'opportunity filled' notification per the job.closed template. New candidates can no longer apply. The agent kanban shows the job in a 'Closed' section." },

  { itemRef: "E9.7", section: 9, sectionTitle: SECTIONS[9],
    description: "Pipeline visibility — who sees what at each state",
    testSteps: [
      "Run Flow A. At each of these states verify the matrix in E2E_Workflow__Final_STG.md §5.1:",
      "  - submitted:         candidate ✓ own | agent ✓ | employer ✗ | admin ✓",
      "  - shortlisted:       candidate ✓ own (employer scrubbed) | agent ✓ | employer ✓ | admin ✓",
      "  - rejected (agent):  candidate ✓ own (employer scrubbed) | employer ✗ | admin ✓",
      "  - selected:          candidate ✓ (employer revealed) | agent ✓ | employer ✓ | admin ✓",
    ].join("\n"),
    expectedResult: "Every role sees exactly what §5.1 of the workflow spec says they should, at every state. No information leaks." },

  { itemRef: "E9.8", section: 9, sectionTitle: SECTIONS[9],
    description: "Interview scorecard authorization (will respect `interview.conducted_by` once shipped — punch-list #11)",
    testSteps: "Today (default `either`, setting not yet enforced): both agent and employer can submit a scorecard on the same interview. Once `interview.conducted_by = employer_only` is wired (planned next sprint), only the employer can submit; agent attempts will return 403.",
    expectedResult: "Default mode allows both parties. Config gate will enforce single-party submission when tightened — not shipped as of v0.8.6 (engineering punch-list item #11, E2E_Workflow__Final_STG.md §7). Scorecard fields: technical / communication / culture / english, each 1-5." },

  { itemRef: "E9.9", section: 9, sectionTitle: SECTIONS[9],
    description: "Admin override — unlocking a terminal-state transition",
    testSteps: [
      "1. Set `pipeline.terminal_states = [\"placed\",\"rejected\"]` in System Config.",
      "2. Agent attempts to move a `placed` application back — receives 403.",
      "3. Admin opens Audit Log → Application, finds the record, uses override to transition state.",
    ].join("\n"),
    expectedResult: "Agents are blocked on terminal states. Admin override succeeds with an audit-logged reason. This covers the HTIS requirement that terminal transitions have to be traceable." },

  { itemRef: "E9.10", section: 9, sectionTitle: SECTIONS[9],
    description: "Cross-sprint regression: public status check still works end-to-end",
    testSteps: "Browse to /status-check without logging in. Enter a candidate's phone number (demo_candidate: whatever phone is on file). Receive OTP (dev logs to console in staging). Enter OTP + first 8 chars of their application id (read from DB).",
    expectedResult: "Status card renders with jobTitle, country, current stage label, and placement info if applicable. No session cookie issued — single read, rate-limited to 3 per 10 min per phone." },

  // ── v0.4.32 (Phase 2 — E2E KYB lifecycle flows) ──────────────────────
  { itemRef: "E9.11", section: 9, sectionTitle: SECTIONS[9],
    description: "Flow C — Employer KYB lifecycle: register → submit → admin reject → fix → resubmit → approve → publish",
    testSteps: [
      "1. Register a fresh employer via /auth (role=employer). Confirm dashboard shows amber 'Complete verification' banner.",
      "2. Open the verification dialog. Fill all 4 sections (Company, Address, Signatory). Upload PAN, GST, Signatory ID docs.",
      "3. Click 'Submit for review'. Banner flips to blue 'under review'.",
      "4. Log in as superadmin. Admin → Employers tab. Expand the new submission. Approve PAN, reject GST with note 'illegible scan'.",
      "5. Click 'Reject with reason' at bottom with reason 'GST scan illegible — re-upload at higher resolution.'.",
      "6. Re-login as employer. Banner is red with rejection reason inline. Open dialog — GST card shows rejected status + note.",
      "7. Delete the rejected GST doc, re-upload a fresh one. Click Submit for review.",
      "8. Re-login as superadmin. Approve all docs. Click 'Approve company'.",
      "9. Re-login as employer. Banner is gone. Click New Requisition. Fill form. Click Publish.",
    ].join("\n"),
    expectedResult: "All 9 steps succeed. submittedForReviewAt + verifiedAt + rejectionReason flow through correctly. Each transition fires a notification visible to the employer. Final publish returns 201 (the verify-to-post gate is now satisfied)." },
  { itemRef: "E9.12", section: 9, sectionTitle: SECTIONS[9],
    description: "Flow D — Agency KYB lifecycle: register → upload MEA RA Licence → submit → admin approves → pick up requisition",
    testSteps: [
      "1. Register a fresh agent via /auth (role=agent). Use AgencyRegisterForm to create the agency stub.",
      "2. Confirm amber 'Complete verification' banner on dashboard.",
      "3. Open dialog. Fill Agency info (incl. MEA RA Licence number + expiry). Address + Signatory. Upload all 9 mandated docs.",
      "4. Try clicking 'Submit for review' BEFORE uploading the MEA RA Licence — confirm 400 error names the missing licence.",
      "5. Upload the licence. Submit succeeds.",
      "6. Log in as superadmin. Admin → Agencies tab. Expand the new submission. Approve.",
      "7. Re-login as agent. Banner cleared. Open Requisitions tab. Pick up any open requisition.",
    ].join("\n"),
    expectedResult: "All steps succeed. The MEA RA Licence guard prevents premature submission; once present, the full lifecycle runs cleanly. Picking up the requisition succeeds (gate at job.routes.ts 40-48 is satisfied)." },
  { itemRef: "E9.13", section: 9, sectionTitle: SECTIONS[9],
    description: "Flow E — Negative path: verified employer revoked mid-life cannot publish new jobs",
    testSteps: [
      "1. Start with a verified employer who has 2 active jobs.",
      "2. Admin → Employers → Revoke. Confirm verified=false.",
      "3. Employer attempts to publish a new requisition.",
      "4. Employer can still edit existing active jobs (PUT not blocked by the gate).",
    ].join("\n"),
    expectedResult: "New publish returns 403 with the verify-to-post message. Existing active jobs stay alive — the gate only blocks the publish step, not subsequent edits. This matches the FRS principle that verification controls market entry, not retroactive removal of existing jobs." },

  // ── v0.4.33 (Phase 3 — HPSEDC Item 2: Matching Engine v2) ────────────
  { itemRef: "P6.6", section: 6, sectionTitle: SECTIONS[6],
    description: "GET /api/v1/matching/version exposes live engine config (weights, policy, threshold, IELTS countries)",
    testSteps: "curl https://hirestream-stg.agentryx.dev/api/v1/matching/version",
    expectedResult: "Returns { version: 'v2', weights: {skill:30,experience:20,qualification:10,country:15,language:10,category:10,salary:5}, policy: {...}, thresholdPct: number, ieltsCountries: [UK,Australia,New Zealand,Canada,Ireland,USA] }. No auth required (public metadata)." },
  { itemRef: "P6.7", section: 6, sectionTitle: SECTIONS[6],
    description: "Engine v2 — 7-factor breakdown returned by GET /applications/:id",
    testSteps: "As demo_candidate, apply to any active job. Open Application Detail.",
    expectedResult: "scoreBreakdown returns all 7 factors (skill, experience, qualification, country, language, category, salary) each with {score, max, detail}. engineVersion = 'v2'. Total <= 100." },
  { itemRef: "P6.8", section: 6, sectionTitle: SECTIONS[6],
    description: "IELTS-country routing — UK/AUS/NZ/CAN/IE/USA jobs use IELTS band; other countries use CEFR",
    testSteps: "1. Post a job with country=UK + requiredIeltsBand=6.0. 2. Apply as a candidate with ieltsBand=7.0. 3. Post another job with country=UAE + languagesRequired={english:B2}. 4. Apply as same candidate (English C1).",
    expectedResult: "Step 2 → language.score = max (IELTS 7.0 meets 6.0). Step 4 → language.score = max (CEFR C1 meets B2). Detail string for IELTS reads 'IELTS 7.0 meets/exceeds required 6.0'; CEFR reads '1/1 language levels met'." },
  { itemRef: "P6.9", section: 6, sectionTitle: SECTIONS[6],
    description: "IELTS — one band below required → half marks; more than one band below → zero",
    testSteps: "Candidate ieltsBand=5.0; job requires 6.0. Score it. Then set candidate=4.0 and re-score.",
    expectedResult: "5.0 vs 6.0 → language.score = max/2. 4.0 vs 6.0 → language.score = 0." },
  { itemRef: "P6.10", section: 6, sectionTitle: SECTIONS[6],
    description: "Engine version toggle — admin can switch to v1 (3-factor legacy) for rollback",
    testSteps: "As superadmin → Admin → Matching Engine tab → toggle Engine v1. Re-score any application.",
    expectedResult: "scoreBreakdown.engineVersion = 'v1'. qualification/language/category/salary factors render with max=0 (UI hides them). Total only uses skill+experience+country." },
  { itemRef: "A4.42", section: 4, sectionTitle: SECTIONS[4],
    description: "Admin Matching Engine page — Panel 1: Weight equalizer (7 sliders, sum-to-100 enforced)",
    testSteps: "Admin → Matching Engine. Drag sliders. Try saving with sum != 100.",
    expectedResult: "Live banner shows running sum + 'Sum must equal 100' warning when invalid. Save button disabled until sum=100. After save, /api/v1/matching/version reflects new weights immediately (no redeploy)." },
  { itemRef: "A4.43", section: 4, sectionTitle: SECTIONS[4],
    description: "Admin Matching Engine — Panel 2: Missing-criteria policy (per-factor full/half/zero)",
    testSteps: "Open Matching Engine. Change Skill from 'zero' to 'half'. Click Save policy.",
    expectedResult: "Setting persists. Next score against a candidate with no skills returns skill.score = half of weight instead of 0. Audit log records the change with before/after." },
  { itemRef: "A4.44", section: 4, sectionTitle: SECTIONS[4],
    description: "Admin Matching Engine — Panel 3: Threshold + engine toggle + breakdown visibility",
    testSteps: "Move threshold slider to 70%. Click Save. Then click Engine V1. Then toggle 'Show breakdown to candidate' OFF.",
    expectedResult: "Recommended jobs feed re-filters at 70%. Engine toggle is instant. Breakdown visibility setting persists (candidate UI hides the breakdown panel when OFF)." },
  { itemRef: "A4.45", section: 4, sectionTitle: SECTIONS[4],
    description: "Admin Matching Engine — Panel 4: Live preview (admin picks candidate + job)",
    testSteps: "Open Matching Engine → Live preview. Pick a candidate + job. Click Run preview.",
    expectedResult: "POST /api/v1/matching/preview returns breakdown rendered as 7 colour-coded cards. Re-dragging weights and re-running shows new score in real time. Admin-only endpoint — non-admin caller gets 403." },
  { itemRef: "A4.46", section: 4, sectionTitle: SECTIONS[4],
    description: "Admin Matching Engine — Panel 5: Audit trail (last 20 matching.* setting changes)",
    testSteps: "After making a weight change, scroll to Audit trail panel.",
    expectedResult: "Latest entry shows actor + key (e.g. matching.weights) + timestamp. Full audit log (Audit Log tab) shows before/after JSON in details column." },
  { itemRef: "C1.45", section: 1, sectionTitle: SECTIONS[1],
    description: "Candidate wizard — Job Preferences section (qualification level, preferred categories, salary band)",
    testSteps: "Open the wizard's Skills step. Scroll past Country preferences. Fill qualification = Bachelor, pick 2-3 preferred categories, enter salary 50000-100000 USD. Save & Continue.",
    expectedResult: "All fields persist (PATCH /api/v1/candidates/profile). Reopening the wizard re-populates. Matching engine uses these on next score (qualification + category + salary factors)." },
  { itemRef: "C1.46", section: 1, sectionTitle: SECTIONS[1],
    description: "Match breakdown panel — 7-factor explainability on Browse Jobs detail + Application Detail",
    testSteps: "1. Browse Jobs → click a job. 2. Apply → open application detail.",
    expectedResult: "Step 1: 7-factor coloured grid shows under the match score. Step 2: 'Why this score' collapsible card with same 7 factors. Each factor shows score/max + progress bar + explanation text. v1 engine hides zero-weight factors." },
  { itemRef: "C1.47", section: 1, sectionTitle: SECTIONS[1],
    description: "Wizard education — sub-types (school / higher-ed / diploma / certification / course) with type-specific fields",
    testSteps: "Open wizard → Education step → Add Education Record. Switch type chip between 'Schooling' and 'Higher Education'.",
    expectedResult: "Schooling shows 'Board' field (CBSE / ICSE / HPBSE / Cambridge). Higher Education + Diploma + Certification show 'Subject / Field'. Saved record displays the type as a violet badge + board/subject in the subtitle line." },
  { itemRef: "A3.38", section: 3, sectionTitle: SECTIONS[3],
    description: "Job poster — Hiring Criteria section (qualification + IELTS for IELTS countries / CEFR languages otherwise)",
    testSteps: "Create a job. Pick country=UK → confirm IELTS numeric input. Switch to UAE → confirm CEFR language picker.",
    expectedResult: "Input swaps automatically on country change. Saved values land in jobs.qualificationRequired + jobs.requiredIeltsBand or jobs.languagesRequired. Both fields are optional — empty saves cleanly." },
  { itemRef: "E9.14", section: 9, sectionTitle: SECTIONS[9],
    description: "Flow F — Matching Engine end-to-end: admin tunes weights → candidate sees updated score immediately",
    testSteps: [
      "1. As candidate, view a 'Recommended for you' job, note the score.",
      "2. As superadmin → Matching Engine → drop Skill weight from 30 to 10, raise Language to 30 (rebalance to sum 100). Save weights.",
      "3. Switch back to candidate, refresh the same job.",
      "4. Score has changed and breakdown reflects new factor maxes (Skill 10, Language 30).",
      "5. As superadmin, open Audit Log → filter resourceType=setting + prefix matching. Confirm the change is logged with actor + before/after.",
    ].join("\n"),
    expectedResult: "End-to-end live-effect of admin tuning. No deploy, no restart, no DB script. Audit log entry survives the page refresh and links back to the admin user." },
];

async function main() {
  const slug = "hirestream-v1.5-extras";
  let [project] = await db.select().from(projects).where(eq(projects.slug, slug));
  if (!project) {
    [project] = await db.insert(projects).values({
      slug,
      name: "HireStream — Beyond-FRS Enhancements (v1.5)",
      buildRef: "v2.0.0",
      contractor: "HTIS",
      client: "HPSEDC",
      description:
        "Value-add features delivered above the contracted FRS scope. Organised by stakeholder role so each reviewer can sign off the sections relevant to their domain. FRS acceptance (in the sibling project) stays independent.",
    }).returning();
    console.log("Created beyond-FRS project:", project.id);
  } else {
    // Update name/description in case reviewers see the old one
    await db.update(projects).set({
      name: "HireStream — Beyond-FRS Enhancements (v1.5)",
      buildRef: "v2.0.0",
      description:
        "Value-add features delivered above the contracted FRS scope. Organised by stakeholder role so each reviewer can sign off the sections relevant to their domain.",
    }).where(eq(projects.id, project.id));
    // Do NOT delete requirements here — signoffs cascade on requirementId and
    // we'd wipe reviewer decisions. Upsert keyed on (project_id, item_ref).
    console.log("Project metadata refreshed. Upserting requirements in place.");
  }

  let order = 0;
  const batch = rows.map((r) => ({
    projectId: project.id,
    itemRef: r.itemRef,
    section: r.section,
    sectionTitle: r.sectionTitle,
    description: r.description,
    testSteps: r.testSteps,
    expectedResult: r.expectedResult,
    status: "delivered" as const,
    sortOrder: order++,
  }));
  const seenRefs = new Set(batch.map((b) => b.itemRef));
  for (let i = 0; i < batch.length; i += 30) {
    await db.insert(requirements)
      .values(batch.slice(i, i + 30))
      .onConflictDoUpdate({
        target: [requirements.projectId, requirements.itemRef],
        set: {
          section: sql`excluded.section`,
          sectionTitle: sql`excluded.section_title`,
          description: sql`excluded.description`,
          status: sql`excluded.status`,
          testSteps: sql`excluded.test_steps`,
          expectedResult: sql`excluded.expected_result`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
  }
  const existing = await db.select({ id: requirements.id, itemRef: requirements.itemRef })
    .from(requirements).where(eq(requirements.projectId, project.id));
  const orphans = existing.filter((r) => !seenRefs.has(r.itemRef));
  if (orphans.length > 0) {
    console.log(`⚠ ${orphans.length} orphan item(s) in DB not present in current seed:`);
    for (const o of orphans) console.log(`   - ${o.itemRef} (id=${o.id})`);
    console.log(`  These retain their existing signoffs. Remove via the admin UI if intentional.`);
  }

  console.log(`Upserted ${batch.length} beyond-FRS items across ${Object.keys(SECTIONS).length} role-aligned sections (signoffs preserved).`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
