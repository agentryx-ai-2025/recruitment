// HTIS integration seed. Runs AFTER migrate_htis.ts and scripts/seed.ts.
//
// A. Tags 4 existing FRS rows with their HTIS bug IDs — amber highlight in UI.
// B. Appends 5 new HTIS-only defects to the FRS project under section 18
//    "Field Defects — HTIS Report (Apr 2026)" — purple highlight.
// C. Creates a sibling project `hirestream-htis-smoke` and imports the 73 rows
//    from the HTIS QA test-cases spreadsheet so they can be tracked with the
//    same UX as the FRS matrix. Pre-populates HTIS signoffs with the P/F/PF/NA
//    verdicts supplied in the workbook — teal highlight.
//
// Idempotent: safe to re-run.

import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, pool } from "../server/config/db";
import {
  projects, requirements, reviewers, projectReviewers, signoffs,
} from "../shared/schema";

const FRS_SLUG = "hirestream-v1.4";
const HTIS_SLUG = "hirestream-htis-smoke";

// ── A. tag existing FRS rows with HTIS bug IDs ────────────────────────────
const EXISTING_TAGS: { itemRef: string; bugs: string[]; noteSuffix: string }[] = [
  { itemRef: "1.4",  bugs: ["BUG-002"], noteSuffix: "HTIS BUG-002 — phone field accepts alphabets/special chars; validation missing." },
  { itemRef: "1.5",  bugs: ["BUG-003"], noteSuffix: "HTIS BUG-003 — education edit button missing; year/% /CGPA accept negatives & out-of-range values." },
  { itemRef: "1.6",  bugs: ["BUG-004"], noteSuffix: "HTIS BUG-004 — work-experience edit missing; negative years accepted on client; country dropdown non-functional." },
  { itemRef: "1.11", bugs: ["BUG-006"], noteSuffix: "HTIS BUG-006 — passport expiry date picker allows past dates." },
];

// ── B. new rows appended to FRS project ───────────────────────────────────
const NEW_HTIS_ROWS: Array<{
  itemRef: string; description: string; bugs: string[];
  testSteps: string; expectedResult: string;
}> = [
  {
    itemRef: "18.1",
    description: "Logged-in user details visible on dashboard immediately after login (no manual refresh).",
    bugs: ["BUG-001"],
    testSteps: "1. Open /auth and sign in with valid candidate credentials. 2. Observe dashboard header + profile panel within 3s of redirect.",
    expectedResult: "Username, email, and profile-completion bar render on first paint — no page refresh required.",
  },
  {
    itemRef: "18.2",
    description: "Preferred destination countries list is complete and FRS-consistent (overseas scope).",
    bugs: ["BUG-005"],
    testSteps: "1. Candidate → Profile → Preferences → Destination countries. 2. Open dropdown. 3. Confirm all 15 FRS-seeded countries present; note: India intentionally excluded as this is an overseas-placement portal.",
    expectedResult: "All FRS-seeded destination countries selectable. If HTIS expects India to be selectable, flag for FRS clarification — not a code defect.",
  },
  {
    itemRef: "18.3",
    description: "Browser back navigation from a saved-job detail returns to the Saved-Jobs view, not the dashboard overview.",
    bugs: ["BUG-007"],
    testSteps: "1. Log in as candidate. 2. Go to Dashboard → Saved Jobs tab. 3. Click any saved job to open its detail. 4. Press browser back.",
    expectedResult: "Saved-Jobs view is re-opened with the same filter/scroll state. Currently falls back to overview because sub-view state is not in the URL.",
  },
  {
    itemRef: "18.4",
    description: "Employer requisition 'Create Date' is system-generated (or rejects past dates) per business rule.",
    bugs: ["BUG-008"],
    testSteps: "1. Log in as demo_employer. 2. Post requisition → locate 'Create Date' (or 'Posted on') field. 3. Attempt to pick a past date and save.",
    expectedResult: "Either the field is read-only (system-set to today) or past-date selection is blocked. Server never trusts client-supplied createdAt, but UI must also enforce.",
  },
  {
    itemRef: "18.5",
    description: "Home → 'Choose Your Portal' navigation routes to the portal-selection / login page.",
    bugs: ["BUG-009"],
    testSteps: "1. Sign in to any portal. 2. Header menu → Home → 'Choose Your Portal'. 3. Observe destination.",
    expectedResult: "User lands on the portal-selection (or /auth) page and can switch roles. Currently loops back to the active portal.",
  },
];

// ── C. HTIS QA smoke-checklist project ────────────────────────────────────
// Status in the spreadsheet: P = Pass, F = Fail, PF = Partial Fail, NA = N/A.
// Maps to: 'delivered' / 'not_delivered' / 'partial' / 'n_a' for requirement
// status, AND to HTIS signoff decision (accepted/rejected/waived) so the same
// verdicts HTIS already recorded in Excel show up in their signoff column.
type Verdict = "P" | "F" | "PF" | "NA";
type SmokeRow = { section: number; sectionTitle: string; description: string; type: "Normal" | "Edge" | "Checklist"; expected: string; verdict: Verdict; remark?: string };

const SMOKE_ROWS: SmokeRow[] = [
  // 1. Page Access & Load
  { section: 1, sectionTitle: "Page Access & Load", description: "Open page via URL", type: "Normal", expected: "Page loads successfully", verdict: "P" },
  { section: 1, sectionTitle: "Page Access & Load", description: "Refresh page", type: "Normal", expected: "No crash, data persists", verdict: "P" },
  { section: 1, sectionTitle: "Page Access & Load", description: "Open in multiple tabs", type: "Normal", expected: "No unexpected behaviour", verdict: "F" },
  { section: 1, sectionTitle: "Page Access & Load", description: "Slow internet", type: "Edge", expected: "Loader shown", verdict: "P" },
  { section: 1, sectionTitle: "Page Access & Load", description: "Session expired", type: "Edge", expected: "Message + redirect", verdict: "PF", remark: "No message displayed on expiry." },
  { section: 1, sectionTitle: "Page Access & Load", description: "Broken link", type: "Edge", expected: "404 / error page", verdict: "P", remark: "ERR_SSL_UNRECOGNIZED_NAME_ALERT observed once." },
  // 2. Login & Access
  { section: 2, sectionTitle: "Login & Access", description: "Login as Admin", type: "Normal", expected: "Full access", verdict: "P" },
  { section: 2, sectionTitle: "Login & Access", description: "Login as User", type: "Normal", expected: "Limited access", verdict: "P" },
  { section: 2, sectionTitle: "Login & Access", description: "Unauthorised user", type: "Normal", expected: "Access denied", verdict: "NA", remark: "Quick role-login — no credentials needed to validate." },
  { section: 2, sectionTitle: "Login & Access", description: "Direct URL access restricted", type: "Edge", expected: "Blocked", verdict: "NA" },
  { section: 2, sectionTitle: "Login & Access", description: "Role changed during session", type: "Edge", expected: "Permissions updated", verdict: "NA" },
  // 3. Data Display
  { section: 3, sectionTitle: "Data Display", description: "Data loads", type: "Normal", expected: "Correct display", verdict: "P" },
  { section: 3, sectionTitle: "Data Display", description: "Column names", type: "Normal", expected: "Correct", verdict: "P" },
  { section: 3, sectionTitle: "Data Display", description: "Pagination", type: "Normal", expected: "Works", verdict: "F", remark: "Admin pages lack pagination." },
  { section: 3, sectionTitle: "Data Display", description: "Sorting", type: "Normal", expected: "Works", verdict: "NA" },
  { section: 3, sectionTitle: "Data Display", description: "Filtering", type: "Normal", expected: "Works", verdict: "P" },
  { section: 3, sectionTitle: "Data Display", description: "No data", type: "Edge", expected: "No-records message", verdict: "P" },
  { section: 3, sectionTitle: "Data Display", description: "Large data", type: "Edge", expected: "Responsive", verdict: "F" },
  { section: 3, sectionTitle: "Data Display", description: "Long text", type: "Edge", expected: "Wrapped / truncated", verdict: "P" },
  { section: 3, sectionTitle: "Data Display", description: "Special characters", type: "Edge", expected: "Displayed correctly", verdict: "P" },
  // 4. Search
  { section: 4, sectionTitle: "Search", description: "Valid keyword", type: "Normal", expected: "Results shown", verdict: "P" },
  { section: 4, sectionTitle: "Search", description: "Partial search", type: "Normal", expected: "Works", verdict: "P" },
  { section: 4, sectionTitle: "Search", description: "Case insensitive", type: "Normal", expected: "Works", verdict: "P" },
  { section: 4, sectionTitle: "Search", description: "Special characters", type: "Edge", expected: "Handled", verdict: "P" },
  { section: 4, sectionTitle: "Search", description: "No results", type: "Edge", expected: "No-results message", verdict: "P" },
  { section: 4, sectionTitle: "Search", description: "Long input", type: "Edge", expected: "Handled", verdict: "P" },
  // 5. Forms
  { section: 5, sectionTitle: "Forms", description: "Add valid data", type: "Normal", expected: "Saved", verdict: "F" },
  { section: 5, sectionTitle: "Forms", description: "Edit record", type: "Normal", expected: "Updated", verdict: "F" },
  { section: 5, sectionTitle: "Forms", description: "Required-field validation", type: "Normal", expected: "Error shown", verdict: "NA" },
  { section: 5, sectionTitle: "Forms", description: "Empty submit", type: "Edge", expected: "Validation error", verdict: "P" },
  { section: 5, sectionTitle: "Forms", description: "Spaces only", type: "Edge", expected: "Rejected", verdict: "F" },
  { section: 5, sectionTitle: "Forms", description: "Invalid formats", type: "Edge", expected: "Validation error", verdict: "P" },
  { section: 5, sectionTitle: "Forms", description: "Large input", type: "Edge", expected: "Handled", verdict: "P" },
  { section: 5, sectionTitle: "Forms", description: "Negative values", type: "Edge", expected: "Rejected", verdict: "F" },
  // 6. CRUD
  { section: 6, sectionTitle: "CRUD", description: "Create record", type: "Normal", expected: "Success", verdict: "P" },
  { section: 6, sectionTitle: "CRUD", description: "Update record", type: "Normal", expected: "Updated", verdict: "F" },
  { section: 6, sectionTitle: "CRUD", description: "Delete record", type: "Normal", expected: "Deleted", verdict: "P" },
  { section: 6, sectionTitle: "CRUD", description: "Delete confirmation", type: "Normal", expected: "Shown", verdict: "F" },
  { section: 6, sectionTitle: "CRUD", description: "Delete already-deleted", type: "Edge", expected: "Handled", verdict: "NA" },
  { section: 6, sectionTitle: "CRUD", description: "Edit in 2 tabs", type: "Edge", expected: "Handled", verdict: "P" },
  { section: 6, sectionTitle: "CRUD", description: "Cancel delete", type: "Edge", expected: "No change", verdict: "NA" },
  // 7. Messages
  { section: 7, sectionTitle: "Messages", description: "Success message", type: "Normal", expected: "Displayed", verdict: "P" },
  { section: 7, sectionTitle: "Messages", description: "Error message", type: "Normal", expected: "Displayed", verdict: "F" },
  { section: 7, sectionTitle: "Messages", description: "Duplicate messages", type: "Edge", expected: "Not duplicated", verdict: "F" },
  { section: 7, sectionTitle: "Messages", description: "Message not disappearing", type: "Edge", expected: "Auto-dismiss", verdict: "F" },
  // 8. File Upload
  { section: 8, sectionTitle: "File Upload", description: "Upload valid file", type: "Normal", expected: "Uploaded", verdict: "P" },
  { section: 8, sectionTitle: "File Upload", description: "Download file", type: "Normal", expected: "Downloaded", verdict: "P" },
  { section: 8, sectionTitle: "File Upload", description: "Large file", type: "Edge", expected: "Handled", verdict: "P" },
  { section: 8, sectionTitle: "File Upload", description: "Wrong type", type: "Edge", expected: "Rejected", verdict: "P" },
  { section: 8, sectionTitle: "File Upload", description: "Empty file", type: "Edge", expected: "Rejected", verdict: "F" },
  // 9. Performance
  { section: 9, sectionTitle: "Performance", description: "Page load time", type: "Normal", expected: "Acceptable", verdict: "P" },
  { section: 9, sectionTitle: "Performance", description: "Quick actions", type: "Normal", expected: "Responsive", verdict: "P" },
  { section: 9, sectionTitle: "Performance", description: "Large dataset", type: "Edge", expected: "Handled", verdict: "P" },
  { section: 9, sectionTitle: "Performance", description: "Multiple clicks", type: "Edge", expected: "No duplicate submit", verdict: "P" },
  // 10. Session
  { section: 10, sectionTitle: "Session", description: "Idle expiry", type: "Normal", expected: "Session expires", verdict: "P" },
  { section: 10, sectionTitle: "Session", description: "Post-expiry action", type: "Normal", expected: "Redirect to login", verdict: "P" },
  { section: 10, sectionTitle: "Session", description: "Submit after expiry", type: "Edge", expected: "Handled", verdict: "P" },
  { section: 10, sectionTitle: "Session", description: "Multi-tab logout", type: "Edge", expected: "Handled", verdict: "P" },
  // 11. Navigation
  { section: 11, sectionTitle: "Navigation", description: "Menu links", type: "Normal", expected: "Work", verdict: "P" },
  { section: 11, sectionTitle: "Navigation", description: "Breadcrumbs", type: "Normal", expected: "Correct", verdict: "P" },
  { section: 11, sectionTitle: "Navigation", description: "Back button", type: "Normal", expected: "Works", verdict: "P" },
  { section: 11, sectionTitle: "Navigation", description: "Back after submit", type: "Edge", expected: "No duplicate submit", verdict: "P" },
  // 12. UI
  { section: 12, sectionTitle: "UI", description: "Desktop view", type: "Normal", expected: "Correct", verdict: "P" },
  { section: 12, sectionTitle: "UI", description: "Layout consistency", type: "Normal", expected: "Consistent", verdict: "P" },
  { section: 12, sectionTitle: "UI", description: "Small screen", type: "Edge", expected: "No overlap", verdict: "F" },
  // 13. Date & Time
  { section: 13, sectionTitle: "Date & Time", description: "Valid date", type: "Normal", expected: "Accepted", verdict: "F" },
  { section: 13, sectionTitle: "Date & Time", description: "Format", type: "Normal", expected: "Correct", verdict: "P" },
  { section: 13, sectionTitle: "Date & Time", description: "Leap year", type: "Edge", expected: "Handled", verdict: "P" },
  // 14. Critical
  { section: 14, sectionTitle: "Critical", description: "Duplicate record", type: "Edge", expected: "Prevented", verdict: "F" },
  { section: 14, sectionTitle: "Critical", description: "Negative values", type: "Edge", expected: "Handled", verdict: "F" },
  { section: 14, sectionTitle: "Critical", description: "Concurrent update", type: "Edge", expected: "Handled", verdict: "P" },
  { section: 14, sectionTitle: "Critical", description: "Network failure", type: "Edge", expected: "Handled", verdict: "P" },
  // 15. Checklist
  { section: 15, sectionTitle: "Checklist", description: "Buttons clickable", type: "Checklist", expected: "Verified", verdict: "P" },
  { section: 15, sectionTitle: "Checklist", description: "Forms validated", type: "Checklist", expected: "Verified", verdict: "F" },
  { section: 15, sectionTitle: "Checklist", description: "CRUD working", type: "Checklist", expected: "Verified", verdict: "PF" },
  { section: 15, sectionTitle: "Checklist", description: "No console errors", type: "Checklist", expected: "Verified", verdict: "F", remark: "PWA manifest icon 404 — (index):1 manifest-icon load error." },
  { section: 15, sectionTitle: "Checklist", description: "UI proper", type: "Checklist", expected: "Verified", verdict: "P" },
];

const verdictToStatus = (v: Verdict) =>
  v === "P"  ? "delivered" as const :
  v === "F"  ? "not_delivered" as const :
  v === "PF" ? "partial" as const :
               "n_a" as const;

const verdictToDecision = (v: Verdict) =>
  v === "P" ? "accepted" as const :
  v === "F" ? "rejected" as const :
  v === "PF" ? "rejected" as const :
               "waived" as const;

async function main() {
  // ── A. tag existing FRS rows ────────────────────────────────────────────
  const [frsProject] = await db.select().from(projects).where(eq(projects.slug, FRS_SLUG));
  if (!frsProject) throw new Error(`FRS project ${FRS_SLUG} not found — run scripts/seed.ts first.`);

  for (const t of EXISTING_TAGS) {
    const [row] = await db.update(requirements)
      .set({ externalRefs: t.bugs, notes: t.noteSuffix })
      .where(and(eq(requirements.projectId, frsProject.id), eq(requirements.itemRef, t.itemRef)))
      .returning();
    if (row) console.log(`  tagged ${t.itemRef} with ${t.bugs.join(",")}`);
    else console.warn(`  ⚠ itemRef ${t.itemRef} not found on FRS project — skipping.`);
  }

  // ── B. new HTIS rows on FRS project ─────────────────────────────────────
  const startOrder = 10000;
  for (let i = 0; i < NEW_HTIS_ROWS.length; i++) {
    const r = NEW_HTIS_ROWS[i];
    await db.insert(requirements).values({
      projectId: frsProject.id,
      itemRef: r.itemRef,
      section: 18,
      sectionTitle: "Field Defects — HTIS Report (Apr 2026)",
      description: r.description,
      status: "partial",
      evidence: `Reported by HTIS on 2026-04-22 as ${r.bugs.join(", ")}.`,
      testSteps: r.testSteps,
      expectedResult: r.expectedResult,
      externalRefs: r.bugs,
      source: "htis_new",
      sortOrder: startOrder + i,
    }).onConflictDoUpdate({
      target: [requirements.projectId, requirements.itemRef],
      set: {
        section: 18,
        sectionTitle: "Field Defects — HTIS Report (Apr 2026)",
        description: r.description,
        status: "partial",
        evidence: `Reported by HTIS on 2026-04-22 as ${r.bugs.join(", ")}.`,
        testSteps: r.testSteps,
        expectedResult: r.expectedResult,
        externalRefs: r.bugs,
        source: "htis_new",
      },
    });
    console.log(`  appended ${r.itemRef} (${r.bugs.join(",")}) under section 18`);
  }

  // ── C. HTIS QA smoke-checklist project ─────────────────────────────────
  let [smokeProject] = await db.select().from(projects).where(eq(projects.slug, HTIS_SLUG));
  if (!smokeProject) {
    [smokeProject] = await db.insert(projects).values({
      slug: HTIS_SLUG,
      name: "HireStream — HTIS QA Smoke Checklist",
      buildRef: "v0.9.7",
      contractor: "HTIS",
      client: "HPSEDC",
      description: "Generic web-app smoke checklist contributed by HTIS on 2026-04-22. 73 rows across 15 sections; verdicts pre-loaded as HTIS signoffs.",
    }).returning();
    console.log(`  created smoke-checklist project: ${smokeProject.id}`);
  } else {
    await db.update(projects).set({ buildRef: "v0.9.7" }).where(eq(projects.id, smokeProject.id));
    console.log(`  smoke-checklist project exists: ${smokeProject.id} (build refreshed)`);
  }

  // Ensure every reviewer can see it
  const allReviewers = await db.select().from(reviewers);
  for (const rv of allReviewers) {
    await db.insert(projectReviewers)
      .values({ projectId: smokeProject.id, reviewerId: rv.id })
      .onConflictDoNothing();
  }

  // Load HTIS reviewer for signoff pre-population
  const [htisRv] = await db.select().from(reviewers).where(eq(reviewers.username, "htis"));
  if (!htisRv) throw new Error("HTIS reviewer not found — run seed.ts first.");

  let ord = 0;
  for (const s of SMOKE_ROWS) {
    const itemRef = `${s.section}.${(SMOKE_ROWS.filter(x => x.section === s.section).indexOf(s) + 1)}`;
    const description = `${s.description}  —  ${s.type} path. Expected: ${s.expected}.${s.remark ? ` Note: ${s.remark}` : ""}`;
    const [req] = await db.insert(requirements).values({
      projectId: smokeProject.id,
      itemRef,
      section: s.section,
      sectionTitle: s.sectionTitle,
      description,
      status: verdictToStatus(s.verdict),
      evidence: `HTIS verdict on 2026-04-22: ${s.verdict}${s.remark ? ` — ${s.remark}` : ""}.`,
      source: "htis_smoke",
      sortOrder: ord++,
    }).onConflictDoUpdate({
      target: [requirements.projectId, requirements.itemRef],
      set: {
        section: s.section,
        sectionTitle: s.sectionTitle,
        description,
        status: verdictToStatus(s.verdict),
        evidence: `HTIS verdict on 2026-04-22: ${s.verdict}${s.remark ? ` — ${s.remark}` : ""}.`,
        source: "htis_smoke",
      },
    }).returning();

    // Pre-populate the HTIS signoff with their workbook verdict
    if (req && s.verdict !== "NA") {
      await db.insert(signoffs).values({
        requirementId: req.id,
        level: "htis",
        reviewerId: htisRv.id,
        decision: verdictToDecision(s.verdict),
        comment: s.remark || `Verdict ${s.verdict} carried over from HTIS workbook (2026-04-22).`,
      }).onConflictDoNothing({ target: [signoffs.requirementId, signoffs.level] });
    }
  }
  console.log(`  seeded ${SMOKE_ROWS.length} smoke rows + pre-populated HTIS signoffs.`);

  console.log("HTIS integration seed complete.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
