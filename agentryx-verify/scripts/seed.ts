import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { db, pool } from "../server/config/db";
import { projects, requirements, reviewers, projectReviewers } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

type Status = "delivered" | "partial" | "not_delivered" | "deferred" | "n_a";

function statusFromGlyph(g: string): Status {
  if (g.includes("✅")) return "delivered";
  if (g.includes("🟡")) return "partial";
  if (g.includes("❌")) return "not_delivered";
  if (g.includes("⛔")) return "deferred";
  return "n_a";
}

interface Row {
  itemRef: string;
  section: number;
  sectionTitle: string;
  description: string;
  status: Status;
  evidence: string | null;
  testSteps: string;
  expectedResult: string;
}

// Best-effort auto-generator: turns the FRS requirement + evidence into a
// brief "what to click / what to verify" pair so reviewers aren't staring at
// a blank cell. Admins can edit these inline.
function generateInstructions(section: number, description: string, evidence: string | null): { testSteps: string; expectedResult: string } {
  const persona =
    section === 1 ? "a Candidate" :
    section === 2 ? "an Agency user" :
    section === 3 ? "an Employer" :
    section === 4 ? "a Government Officer" :
    "any signed-in user";

  const desc = description.trim().replace(/\.$/, "");
  const testSteps = section <= 4
    ? `Sign in as ${persona} and exercise: ${desc}.`
    : `Verify across the portal: ${desc}.`;

  const expectedResult = evidence?.trim()
    ? `Behaves as described. Delivery evidence: ${evidence.trim()}`
    : `Feature is accessible and behaves as the FRS describes.`;

  return { testSteps, expectedResult };
}

function parseMatrix(md: string): Row[] {
  const rows: Row[] = [];
  const sectionRe = /^##\s+Section\s+(\d+):\s+(.+)$/m;
  // Split on each "## Section N:" header so we process one section at a time
  const parts = md.split(/^##\s+Section\s+/m);
  for (const block of parts.slice(1)) {
    const headLine = block.split("\n", 1)[0];
    const m = headLine.match(/^(\d+):\s+(.+)$/);
    if (!m) continue;
    const section = parseInt(m[1], 10);
    const sectionTitle = m[2].trim();

    // Collect table rows: "| 1.18 | requirement | ✅ | evidence |"
    // Stop scanning once we hit a non-Section "##" heading (e.g. "## Revision History",
    // "## Related Documents") — those sit inside the last Section's text block but are
    // unrelated tables we must not ingest as requirements.
    const lines = block.split("\n");
    for (const line of lines) {
      if (/^##\s+(?!Section\s)/i.test(line.trim())) break;
      const trimmed = line.trim();
      if (!trimmed.startsWith("|")) continue;
      const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length < 4) continue;
      // Skip header rows like "| ID | Requirement | Status | Evidence ... |" and separator rows like "|----|"
      if (!/^\d+\.\d+$/.test(cells[0])) continue;
      const { testSteps, expectedResult } = generateInstructions(section, cells[1], cells[3] || null);
      rows.push({
        itemRef: cells[0],
        section,
        sectionTitle,
        description: cells[1],
        status: statusFromGlyph(cells[2]),
        evidence: cells[3] || null,
        testSteps,
        expectedResult,
      });
    }
  }
  return rows;
}

async function main() {
  const matrixPath = process.argv[2] ||
    path.resolve(process.env.HOME!, "Projects/HireStream/A.PMD/Dev Plan Architecture & Phasing/Verification & UAT/01_FRS_Compliance_Matrix.md");

  if (!fs.existsSync(matrixPath)) {
    console.error("Matrix file not found:", matrixPath);
    process.exit(1);
  }

  const md = fs.readFileSync(matrixPath, "utf8");
  const allParsed = parseMatrix(md);
  // Dedupe: keep first occurrence per itemRef (later tables in the doc reuse some IDs)
  const seen = new Set<string>();
  const parsed = allParsed.filter((r) => {
    if (seen.has(r.itemRef)) return false;
    seen.add(r.itemRef); return true;
  });
  console.log(`Parsed ${allParsed.length} table rows, ${parsed.length} unique requirements.`);

  // Create or fetch project
  const slug = "hirestream-v1.4";
  let [project] = await db.select().from(projects).where(eq(projects.slug, slug));
  if (!project) {
    [project] = await db.insert(projects).values({
      slug,
      name: "HireStream — HPSEDC Overseas Placement Portal",
      buildRef: "v1.4.2",
      contractor: "HTIS",
      client: "HPSEDC",
      description: "Web portal for overseas employment placement services in Himachal Pradesh.",
      matrixSourcePath: matrixPath,
    }).returning();
    console.log("Created project:", project.id);
  } else {
    console.log("Project exists:", project.id);
    await db.update(projects).set({
      buildRef: "v1.4.2",
      matrixSourcePath: matrixPath,
    }).where(eq(projects.id, project.id));
    // IMPORTANT: do NOT `db.delete(requirements)` here. The signoffs table has
    // `onDelete: cascade` on requirementId, so deleting requirements nukes every
    // reviewer sign-off decision. We UPSERT instead, keyed on the unique
    // (project_id, item_ref) index — re-seeds refresh the text/status/evidence
    // columns without disturbing signoffs or comments.
    console.log("Project metadata refreshed. Upserting requirements in place.");
  }

  // Upsert requirements keyed on (project_id, item_ref). Preserves signoffs +
  // comments across re-seeds.
  let order = 0;
  const batch = parsed.map((r) => ({
    projectId: project.id,
    itemRef: r.itemRef,
    section: r.section,
    sectionTitle: r.sectionTitle,
    description: r.description,
    status: r.status,
    evidence: r.evidence,
    testSteps: r.testSteps,
    expectedResult: r.expectedResult,
    sortOrder: order++,
  }));

  const seenRefs = new Set(batch.map((b) => b.itemRef));
  for (let i = 0; i < batch.length; i += 50) {
    await db.insert(requirements)
      .values(batch.slice(i, i + 50))
      .onConflictDoUpdate({
        target: [requirements.projectId, requirements.itemRef],
        set: {
          section: sql`excluded.section`,
          sectionTitle: sql`excluded.section_title`,
          description: sql`excluded.description`,
          status: sql`excluded.status`,
          evidence: sql`excluded.evidence`,
          testSteps: sql`excluded.test_steps`,
          expectedResult: sql`excluded.expected_result`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
  }
  console.log(`Upserted ${batch.length} requirements (signoffs preserved).`);

  // Flag orphans: rows in DB whose itemRef is no longer in the matrix. We don't
  // delete them (that would wipe their signoffs) — we just print them so an
  // admin can decide whether to prune via the UI.
  const existing = await db.select({ id: requirements.id, itemRef: requirements.itemRef })
    .from(requirements).where(eq(requirements.projectId, project.id));
  const orphans = existing.filter((r) => !seenRefs.has(r.itemRef));
  if (orphans.length > 0) {
    console.log(`⚠ ${orphans.length} orphan requirement(s) in DB not present in current matrix:`);
    for (const o of orphans) console.log(`   - ${o.itemRef} (id=${o.id})`);
    console.log(`  These retain their existing signoffs. Remove via the admin UI if intentional.`);
  }

  // Seed default reviewers — four scoped logins + delivery owner.
  // Each non-admin reviewer can only sign off at their own pipeline level.
  const seedReviewers = [
    { username: "admin",    email: "admin@verify.agentryx.dev",    name: "Portal Admin",      organization: "Agentryx", role: "admin"          as const, password: "admin" },
    { username: "agentryx", email: "agentryx@verify.agentryx.dev", name: "Agentryx Internal", organization: "Agentryx", role: "agentryx"       as const, password: "ulan" },
    { username: "htis",     email: "htis@verify.agentryx.dev",     name: "HTIS Reviewer",     organization: "HTIS",     role: "htis"           as const, password: "test123" },
    { username: "hpsedc",   email: "hpsedc@verify.agentryx.dev",   name: "HPSEDC Staging",    organization: "HPSEDC",   role: "hpsedc_staging" as const, password: "test456" },
    { username: "uat",      email: "uat@verify.agentryx.dev",      name: "HPSEDC Final UAT",  organization: "HPSEDC",   role: "hpsedc_final"   as const, password: "test789" },
  ];

  for (const r of seedReviewers) {
    const { password, ...rest } = r;
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await db.select().from(reviewers).where(eq(reviewers.email, r.email));
    let row = existing[0];
    if (!row) {
      [row] = await db.insert(reviewers).values({ ...rest, passwordHash }).returning();
      console.log("Created reviewer:", r.username);
    } else {
      await db.update(reviewers).set({ username: r.username, passwordHash }).where(eq(reviewers.id, row.id));
      console.log("Updated credentials for:", r.username);
    }
    // Ensure membership in project
    await db.insert(projectReviewers)
      .values({ projectId: project.id, reviewerId: row.id })
      .onConflictDoNothing();
  }

  console.log("Seed complete.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
