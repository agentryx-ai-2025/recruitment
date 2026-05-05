// Seeds 6 clarification rows under Section 18 of the FRS project. Each row is
// phrased as a question to HTIS about an XLSX-smoke failure that was too
// generic to action from the workbook alone. HTIS can answer either through
// the signoff (Pass = not applicable anymore, Fail = see comment for repro)
// or via the comment thread on the row.
//
// Idempotent: keyed on itemRef so re-running updates the text in place.

import { eq, and } from "drizzle-orm";
import { db, pool } from "../server/config/db";
import { projects, requirements } from "../shared/schema";

const FRS_SLUG = "hirestream-v1.4";

type Row = { itemRef: string; description: string; testSteps: string; expectedResult: string };

const ROWS: Row[] = [
  {
    itemRef: "18.6",
    description: "CLARIFICATION NEEDED — Multi-tab behaviour: which interaction failed when opening the portal in two browser tabs?",
    testSteps: "HTIS workbook row \"Page Access → Open in multiple tabs\" was marked Fail with no details. Please describe: (a) which URL / page you had open in each tab, (b) what action you took, (c) what went wrong (session killed, data mismatch, 500 error, etc.). Most flows are tested to coexist across tabs, so we need the specific repro to fix the right thing.",
    expectedResult: "HTIS adds a comment on this row with repro steps, or marks it Pass after re-testing the current build. If the concern was 'logging in on tab A kills session on tab B', that default was already turned off in v0.8.3 — please re-test.",
  },
  {
    itemRef: "18.7",
    description: "PARTIAL — Session expired: add an explicit toast/banner when the session has expired, before redirecting to login.",
    testSteps: "HTIS workbook row \"Page Access → Session expired\" was marked Partial Fail with remark \"No Msg Display\". Currently a 401 from the server silently kicks the user to /auth. We should show a toast like 'Your session expired — please sign in again' on the way out.",
    expectedResult: "Toast renders on any 401 response (not just login). Scheduled for the next sprint; HTIS to re-test when build ≥ v0.9.9.",
  },
  {
    itemRef: "18.8",
    description: "CLARIFICATION NEEDED + FEATURE — Admin list pagination: which admin list(s) need pagination?",
    testSteps: "HTIS workbook remark on \"Data Display → Pagination\" was \"Admin Page should be pagination\". Several admin lists today render all rows at once (agents, candidates, grievances, audit log, notification templates, etc.). Please name the specific list(s) that blow up with a large dataset — without that we risk paginating the wrong ones.",
    expectedResult: "HTIS lists the admin paths that need pagination (e.g. /admin/agencies, /admin/audit-log). We ship paginated versions in the next sprint and flag this row for re-verify.",
  },
  {
    itemRef: "18.9",
    description: "CLARIFICATION NEEDED — Delete confirmation: which delete button is missing a confirm dialog?",
    testSteps: "HTIS workbook row \"CRUD → Delete confirmation\" was marked Fail with no details. Known delete actions: education record, experience record, document, saved job, saved search, candidate tag, agency (admin), job posting (agent/employer), drive (agent), grievance (admin). Please name which one(s) deleted without asking 'Are you sure?' — fixing all at once is wasteful if the gap is on two of ten.",
    expectedResult: "HTIS comments with the specific delete button(s). We add a standard shadcn AlertDialog wrapper on each and re-flag for re-verify.",
  },
  {
    itemRef: "18.10",
    description: "CLARIFICATION NEEDED — Small-screen / mobile layout: which page(s) overlap or break on mobile?",
    testSteps: "HTIS workbook row \"UI → Small screen\" was marked Fail. The portal is responsive, so please screenshot the specific page + viewport width where things overlap or are cut off (e.g. candidate dashboard at 375px, agent applicants at 768px, etc.). Attaching via the signoff's paste-screenshot is enough.",
    expectedResult: "HTIS posts a screenshot showing the broken layout. We tune the affected breakpoint and re-flag for re-verify.",
  },
  {
    itemRef: "18.11",
    description: "CLARIFICATION NEEDED — Toast messages: which message duplicated, and which one didn't auto-dismiss?",
    testSteps: "HTIS workbook had two adjacent Fails in \"Messages\": \"Duplicate messages\" and \"Message not disappearing\". Neither is reproducible without context. Please name: (a) an action that fires the toast (e.g. 'saved profile' with phone=garbage → BUG-002 toast), (b) the exact text of the toast, (c) whether it stacked (duplicate) or failed to auto-dismiss after ~5 seconds (sticky).",
    expectedResult: "HTIS supplies an example. We add dedup-by-key to the toast queue and confirm auto-dismiss works on the call-site they flagged.",
  },
];

async function main() {
  const [project] = await db.select().from(projects).where(eq(projects.slug, FRS_SLUG));
  if (!project) throw new Error("FRS project not found.");

  const start = 20000; // sort_order space reserved for clarifications, placed after 18.1–18.5 which used 10000+
  for (let idx = 0; idx < ROWS.length; idx++) {
    const r = ROWS[idx];
    const isPartial = r.description.startsWith("PARTIAL");
    await db.insert(requirements).values({
      projectId: project.id,
      itemRef: r.itemRef,
      section: 18,
      sectionTitle: "Field Defects — HTIS Report (Apr 2026)",
      description: r.description,
      status: isPartial ? "partial" : "n_a",
      evidence: `HTIS XLSX smoke-checklist row — ambiguous, awaiting clarification (2026-04-22).`,
      testSteps: r.testSteps,
      expectedResult: r.expectedResult,
      externalRefs: ["XLSX"],
      source: "htis_new",
      sortOrder: start + idx,
    }).onConflictDoUpdate({
      target: [requirements.projectId, requirements.itemRef],
      set: {
        section: 18,
        sectionTitle: "Field Defects — HTIS Report (Apr 2026)",
        description: r.description,
        status: isPartial ? "partial" : "n_a",
        evidence: `HTIS XLSX smoke-checklist row — ambiguous, awaiting clarification (2026-04-22).`,
        testSteps: r.testSteps,
        expectedResult: r.expectedResult,
        externalRefs: ["XLSX"],
        source: "htis_new",
      },
    });
    console.log(`  seeded ${r.itemRef} — ${isPartial ? "scheduled (partial)" : "awaiting clarification (n_a)"}`);
  }
  console.log(`Done — ${ROWS.length} clarification rows ready in Section 18.`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
