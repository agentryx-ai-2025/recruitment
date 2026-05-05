import { Router } from "express";
import { db } from "../config/db";
import { projects, projectSprints, reviewers, requirements, signoffs } from "@shared/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const sprintsRouter = Router();

// Only admin + delivery + agentryx can manage sprints. HTIS / HPSEDC reviewers
// can see the sprint list but not create or deploy — this is a delivery-side
// tool, not a sign-off gate.
const TRIAGE_ROLES = new Set(["admin", "delivery", "agentryx"]);

async function currentReviewer(reviewerId: string) {
  const [r] = await db.select().from(reviewers).where(eq(reviewers.id, reviewerId));
  return r;
}
function canManage(r: { role?: string | null }) {
  return TRIAGE_ROLES.has(String(r?.role));
}

// ── List sprints on a project (scoped by slug) ───────────────────────
sprintsRouter.get("/projects/:slug/sprints", requireAuth, async (req, res) => {
  const [project] = await db.select().from(projects).where(eq(projects.slug, req.params.slug));
  if (!project) return res.status(404).json({ error: "Not found" });
  const rows = await db.select().from(projectSprints)
    .where(eq(projectSprints.projectId, project.id))
    .orderBy(desc(projectSprints.startedAt));
  res.json(rows);
});

// ── Create sprint ───────────────────────────────────────────────────
sprintsRouter.post("/projects/:slug/sprints", requireAuth, async (req, res) => {
  const me = await currentReviewer(req.session.reviewerId!);
  if (!canManage(me)) return res.status(403).json({ error: "Manage access required" });

  const [project] = await db.select().from(projects).where(eq(projects.slug, req.params.slug));
  if (!project) return res.status(404).json({ error: "Not found" });

  const { name, notes, fixedItemRefs } = req.body ?? {};
  if (!name || String(name).trim().length < 3) {
    return res.status(400).json({ error: "Sprint name is required (min 3 chars)" });
  }
  const refs = Array.isArray(fixedItemRefs) ? fixedItemRefs.map((r: any) => String(r).trim()).filter(Boolean) : [];

  const [row] = await db.insert(projectSprints).values({
    projectId: project.id,
    name: String(name).trim().slice(0, 200),
    notes: notes ? String(notes).slice(0, 4000) : null,
    fixedItemRefs: refs,
    createdByReviewerId: me.id,
  }).returning();
  res.status(201).json(row);
});

// ── Sprint detail with progress (how many of fixed_refs have been
// re-verified since deploy) ──────────────────────────────────────────
sprintsRouter.get("/sprints/:id", requireAuth, async (req, res) => {
  const [sprint] = await db.select().from(projectSprints).where(eq(projectSprints.id, req.params.id));
  if (!sprint) return res.status(404).json({ error: "Not found" });

  // Map item refs → requirement rows (only those matching this project).
  const reqs = sprint.fixedItemRefs.length
    ? await db.select().from(requirements).where(
        and(eq(requirements.projectId, sprint.projectId), inArray(requirements.itemRef, sprint.fixedItemRefs))
      )
    : [];
  const reqIds = reqs.map((r) => r.id);

  // Signoffs on those requirements across every level — useful for the diff
  // report to show which levels flipped since deploy.
  const sos = reqIds.length
    ? await db.select().from(signoffs).where(inArray(signoffs.requirementId, reqIds))
    : [];

  const [createdBy] = await db.select({ id: reviewers.id, name: reviewers.name, role: reviewers.role })
    .from(reviewers).where(eq(reviewers.id, sprint.createdByReviewerId));

  // Progress counters — only meaningful after deploy.
  let pending = 0, flipped = 0;
  if (sprint.deployedAt) {
    const deployedAtMs = new Date(sprint.deployedAt).getTime();
    for (const r of reqs) {
      const latestByLevel: Record<string, any> = {};
      for (const s of sos.filter((x) => x.requirementId === r.id)) {
        const prev = latestByLevel[s.level];
        if (!prev || new Date(s.signedAt!).getTime() > new Date(prev.signedAt).getTime()) {
          latestByLevel[s.level] = s;
        }
      }
      // Count Agentryx level only for now (the delivery-internal level).
      const agx = latestByLevel["agentryx"];
      if (!agx) continue;
      if (new Date(agx.signedAt).getTime() < deployedAtMs) pending++;
      else flipped++;
    }
  }

  res.json({
    ...sprint,
    createdBy,
    requirements: reqs,
    signoffs: sos,
    progress: { pending, flipped, total: reqs.length },
  });
});

// ── Update sprint (name / notes / fixedItemRefs) — draft or in_progress only ──
sprintsRouter.patch("/sprints/:id", requireAuth, async (req, res) => {
  const me = await currentReviewer(req.session.reviewerId!);
  if (!canManage(me)) return res.status(403).json({ error: "Manage access required" });

  const [sprint] = await db.select().from(projectSprints).where(eq(projectSprints.id, req.params.id));
  if (!sprint) return res.status(404).json({ error: "Not found" });
  if (sprint.status === "deployed" || sprint.status === "closed") {
    return res.status(409).json({ error: "Sprint is deployed/closed — can't edit metadata. Open a new sprint for further work." });
  }

  const patch: Record<string, any> = {};
  if ("name" in req.body) patch.name = String(req.body.name).trim().slice(0, 200);
  if ("notes" in req.body) patch.notes = req.body.notes ? String(req.body.notes).slice(0, 4000) : null;
  if ("fixedItemRefs" in req.body) {
    patch.fixedItemRefs = Array.isArray(req.body.fixedItemRefs)
      ? req.body.fixedItemRefs.map((r: any) => String(r).trim()).filter(Boolean)
      : [];
  }
  if ("status" in req.body && req.body.status === "in_progress") patch.status = "in_progress";

  const [row] = await db.update(projectSprints).set(patch)
    .where(eq(projectSprints.id, sprint.id)).returning();
  res.json(row);
});

// ── Deploy: bump project.buildRef and stamp deployedAt ──────────────
sprintsRouter.post("/sprints/:id/deploy", requireAuth, async (req, res) => {
  const me = await currentReviewer(req.session.reviewerId!);
  if (!canManage(me)) return res.status(403).json({ error: "Manage access required" });

  const [sprint] = await db.select().from(projectSprints).where(eq(projectSprints.id, req.params.id));
  if (!sprint) return res.status(404).json({ error: "Not found" });
  if (sprint.status === "deployed" || sprint.status === "closed") {
    return res.status(409).json({ error: "Already deployed" });
  }
  const { buildRef } = req.body ?? {};
  if (!buildRef || String(buildRef).trim().length < 2) {
    return res.status(400).json({ error: "buildRef is required (e.g. v1.4.3)" });
  }
  const now = new Date();
  const [row] = await db.update(projectSprints)
    .set({ status: "deployed", deployedAt: now, buildRef: String(buildRef).trim() })
    .where(eq(projectSprints.id, sprint.id))
    .returning();
  // Bump the project's buildRef so the project header + CSV/PDF exports reflect
  // the new build immediately.
  await db.update(projects).set({ buildRef: row.buildRef! }).where(eq(projects.id, sprint.projectId));
  res.json(row);
});

// ── Close: admin marks the sprint done ──────────────────────────────
sprintsRouter.post("/sprints/:id/close", requireAuth, async (req, res) => {
  const me = await currentReviewer(req.session.reviewerId!);
  if (!canManage(me)) return res.status(403).json({ error: "Manage access required" });

  const [sprint] = await db.select().from(projectSprints).where(eq(projectSprints.id, req.params.id));
  if (!sprint) return res.status(404).json({ error: "Not found" });
  const [row] = await db.update(projectSprints)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(projectSprints.id, sprint.id))
    .returning();
  res.json(row);
});

// ── Delete draft sprint ────────────────────────────────────────────
sprintsRouter.delete("/sprints/:id", requireAuth, async (req, res) => {
  const me = await currentReviewer(req.session.reviewerId!);
  if (!canManage(me)) return res.status(403).json({ error: "Manage access required" });

  const [sprint] = await db.select().from(projectSprints).where(eq(projectSprints.id, req.params.id));
  if (!sprint) return res.status(404).json({ error: "Not found" });
  if (sprint.status !== "draft") {
    return res.status(409).json({ error: "Only draft sprints can be deleted. Close instead." });
  }
  await db.delete(projectSprints).where(eq(projectSprints.id, sprint.id));
  res.json({ ok: true });
});
