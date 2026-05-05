// After shipping fixes for the HTIS bug report, update the Verify evidence so
// the 9 tagged rows reflect the delivered state + set up a Sprint release
// which flags them as "🔁 re-verify" for HTIS.
//
// Runs on `hirestream-v1.4`. Idempotent — safe to re-run when another batch
// of fixes lands.
import { eq, and } from "drizzle-orm";
import { db, pool } from "../server/config/db";
import { projects, requirements, reviewers, projectSprints } from "../shared/schema";

const FRS_SLUG = "hirestream-v1.4";
const BUILD = "v0.9.8";

// itemRef → new evidence text after the fix. Status rolls back to "delivered"
// so the row is reviewable again (was "partial" while defect was open).
const EVIDENCE: Record<string, { evidence: string; status: "delivered" | "partial" }> = {
  "1.4": {
    evidence: "v0.9.8 — phone validation added. Regex enforces digits + optional +country code / spaces / dashes on both client (wizard + profile form) and server (updateCandidateSchema). Garbage input like `87698GBIUHJIUJN JN&^**&` now returns 400 with a plain-English message. HTIS BUG-002 resolved.",
    status: "delivered",
  },
  "1.5": {
    evidence: "v0.9.8 — education edit button added. Each row shows Edit + Delete icons; form re-opens inline with the record pre-filled. Year clamped to [1950, currentYear+1], percentage/CGPA to [0, 100]. Negative values rejected server-side via insertEducationSchema (zod). HTIS BUG-003 resolved.",
    status: "delivered",
  },
  "1.6": {
    evidence: "v0.9.8 — work-experience edit button added, negative years rejected on client (min=0) + server (insertExperienceSchema), Country field switched from free-text Input to a Select bound to /content/countries (16 rows, includes India). HTIS BUG-004 resolved.",
    status: "delivered",
  },
  "1.8": {
    evidence: "v0.9.8 — India added to country_info so it appears in the experience dropdown and the preferred-destination list. Destination set now 16 rows. HTIS BUG-005 addressed (note: India still treated as source country in match-scoring; FRS scope is overseas placement).",
    status: "delivered",
  },
  "1.11": {
    evidence: "v0.9.8 — passport-expiry date picker now has `min={today}`, /me/compliance PATCH rejects past dates with a 400 and plain-English message. Applied to both candidate dashboard and agent candidate-detail view. HTIS BUG-006 resolved.",
    status: "delivered",
  },
  "18.1": {
    evidence: "v0.9.8 — login mutation now seeds the /auth/me cache from the login response and drops identity-scoped queries so the dashboard renders with the user on first paint. HTIS BUG-001 resolved.",
    status: "delivered",
  },
  "18.2": {
    evidence: "v0.9.8 — India added to country_info (code IN). Now selectable in the destination dropdown. HTIS BUG-005 addressed.",
    status: "delivered",
  },
  "18.3": {
    evidence: "v0.9.8 — candidate dashboard `activeView` state pushed to the URL query (?view=saved). History back from a job detail restores the saved-jobs tab. popstate listener keeps state in sync with native nav. HTIS BUG-007 resolved.",
    status: "delivered",
  },
  "18.4": {
    evidence: "v0.9.8 — hiring-deadline input has `min={today}`, insertJobSchema + draftJobSchema reject past dates at POST + PUT. Applies to employer + agent job forms. HTIS BUG-008 resolved.",
    status: "delivered",
  },
  "18.5": {
    evidence: "v0.9.8 — 'Choose Your Portal' cards on the landing page now log the user out before routing to /auth when a session exists, so switching portals actually works. HTIS BUG-009 resolved.",
    status: "delivered",
  },
};

async function main() {
  const [project] = await db.select().from(projects).where(eq(projects.slug, FRS_SLUG));
  if (!project) throw new Error("FRS project not found.");

  // Bump the project build so the UI header reflects the shipped version.
  await db.update(projects).set({ buildRef: BUILD }).where(eq(projects.id, project.id));

  for (const [itemRef, { evidence, status }] of Object.entries(EVIDENCE)) {
    const [row] = await db.update(requirements)
      .set({ evidence, status })
      .where(and(eq(requirements.projectId, project.id), eq(requirements.itemRef, itemRef)))
      .returning();
    console.log(row ? `  refreshed ${itemRef}` : `  ⚠ ${itemRef} not found — skipped`);
  }

  // Deploy a sprint so HTIS sees 🔁 re-verify chips on all 9 rows. Sprint ref
  // is idempotent — re-running updates the existing row in-place.
  const [htisRv] = await db.select().from(reviewers).where(eq(reviewers.username, "htis"));
  const [admin] = await db.select().from(reviewers).where(eq(reviewers.username, "admin"));
  const reviewerId = admin?.id ?? htisRv?.id;
  if (!reviewerId) throw new Error("No admin/HTIS reviewer to attribute the sprint to.");

  const sprintName = `Sprint 2 — HTIS Apr 22 bug report (${BUILD})`;
  const fixedItemRefs = Object.keys(EVIDENCE);
  const existing = await db.select().from(projectSprints)
    .where(and(eq(projectSprints.projectId, project.id), eq(projectSprints.name, sprintName)));

  if (existing[0]) {
    await db.update(projectSprints).set({
      buildRef: BUILD,
      fixedItemRefs,
      status: "deployed",
      deployedAt: new Date(),
      notes: "Fixes for the 9 bugs HTIS reported on 2026-04-22 (DOCX) + three XLSX-smoke failures (manifest icon, empty file upload, admin pagination tracked separately).",
    }).where(eq(projectSprints.id, existing[0].id));
    console.log(`  sprint refreshed: ${existing[0].id}`);
  } else {
    const [sp] = await db.insert(projectSprints).values({
      projectId: project.id,
      name: sprintName,
      buildRef: BUILD,
      fixedItemRefs,
      status: "deployed",
      deployedAt: new Date(),
      notes: "Fixes for the 9 bugs HTIS reported on 2026-04-22 (DOCX) + three XLSX-smoke failures (manifest icon, empty file upload, admin pagination tracked separately).",
      createdByReviewerId: reviewerId,
    }).returning();
    console.log(`  sprint created: ${sp.id}`);
  }

  console.log(`HTIS evidence refresh complete. Build ${BUILD} live. ${fixedItemRefs.length} rows flagged for re-verify.`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
