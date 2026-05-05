import { Router } from "express";
import path from "path";
import fs from "fs";
import { db } from "../config/db";
import {
  projects, requirements, signoffs, comments, issues, reviewers, attachments, projectSprints,
} from "@shared/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { uploadImages, UPLOAD_DIR, VERIFY_SIGNOFF_DIR, VERIFY_FEEDBACK_DIR } from "../middleware/upload";

// Persist uploaded files as attachment rows linked to the owner (signoff | comment).
async function saveAttachments(
  files: Express.Multer.File[] | undefined,
  ownerType: "signoff" | "comment",
  ownerId: string,
  uploadedBy: string,
) {
  if (!files?.length) return [];
  const rows = files.map((f) => ({
    ownerType, ownerId,
    filename: f.filename,
    originalName: f.originalname,
    mimetype: f.mimetype,
    filesize: f.size,
    uploadedBy,
  }));
  return db.insert(attachments).values(rows).returning();
}

export const projectsRouter = Router();

// Admin/delivery see every project; other reviewers only see rows flagged
// visibleToNonAdmin=true. Unauthenticated gets the same non-admin view. Ordered
// by sort_order (ascending), then name as a stable tiebreaker.
async function resolveReviewerRole(req: any): Promise<string | null> {
  if (!req.session?.reviewerId) return null;
  const [r] = await db.select().from(reviewers).where(eq(reviewers.id, req.session.reviewerId));
  return r?.role ?? null;
}
const isAdminRole = (role: string | null) => role === "admin" || role === "delivery";

projectsRouter.get("/", async (req, res) => {
  const role = await resolveReviewerRole(req);
  const rows = await db.select().from(projects)
    .orderBy(asc(projects.sortOrder), asc(projects.name));
  const filtered = isAdminRole(role) ? rows : rows.filter((p) => p.visibleToNonAdmin);
  res.json(filtered);
});

// Public: project by slug + summary counts
projectsRouter.get("/:slug", async (req, res) => {
  const [project] = await db.select().from(projects).where(eq(projects.slug, req.params.slug));
  if (!project) return res.status(404).json({ error: "Not found" });

  // 404 rather than 403 for hidden projects accessed by non-admin — matches
  // the Home listing behaviour and doesn't confirm existence to the caller.
  if (!project.visibleToNonAdmin) {
    const role = await resolveReviewerRole(req);
    if (!isAdminRole(role)) return res.status(404).json({ error: "Not found" });
  }

  const reqs = await db.select().from(requirements)
    .where(eq(requirements.projectId, project.id))
    .orderBy(asc(requirements.section), asc(requirements.sortOrder));

  const sos = await db.select().from(signoffs);
  const reqIds = new Set(reqs.map(r => r.id));
  const projectSignoffs = sos.filter(s => reqIds.has(s.requirementId));

  const soIds = projectSignoffs.map(s => s.id);
  const atts = soIds.length
    ? await db.select().from(attachments).where(
        and(eq(attachments.ownerType, "signoff"), inArray(attachments.ownerId, soIds))
      )
    : [];
  const byOwner: Record<string, any[]> = {};
  for (const a of atts) (byOwner[a.ownerId] ??= []).push(a);
  const signoffsWithAttachments = projectSignoffs.map(s => ({ ...s, attachments: byOwner[s.id] ?? [] }));

  // Deployed sprints — the frontend uses `fixedItemRefs` + `deployedAt` to
  // decide which signoffs get a 🔁 "re-verify needed" badge. Closed sprints
  // are excluded so once the tester has re-verified and admin closes, the
  // badges stop appearing (clean board).
  const deployedSprints = await db.select().from(projectSprints)
    .where(and(eq(projectSprints.projectId, project.id), eq(projectSprints.status, "deployed")))
    .orderBy(desc(projectSprints.deployedAt));

  res.json({
    project,
    requirements: reqs,
    signoffs: signoffsWithAttachments,
    deployedSprints,
  });
});

// Serve attachment files — authenticated only, streams from the per-owner leaf
// under the Verify namespace. Falls back to the bare root for legacy pre-
// migration rows so already-uploaded signoff screenshots keep working without
// requiring a data migration in the same deploy.
projectsRouter.get("/attachments/:id", requireAuth, async (req, res) => {
  const [row] = await db.select().from(attachments).where(eq(attachments.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  const safeName = path.basename(row.filename);
  const leaf = row.ownerType === "feedback" ? VERIFY_FEEDBACK_DIR : VERIFY_SIGNOFF_DIR;
  const candidates = [
    path.join(leaf, safeName),
    path.join(UPLOAD_DIR, safeName), // legacy pre-namespacing
  ];
  const abs = candidates.find((p) => fs.existsSync(p));
  if (!abs) return res.status(404).json({ error: "File missing" });
  res.type(row.mimetype);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.sendFile(abs);
});

// Authenticated: post a sign-off for a requirement at a level.
// Authorization: reviewers can only sign off on their own pipeline level.
// `admin` and `delivery` roles bypass the level check.
projectsRouter.post("/:slug/requirements/:reqId/signoff", requireAuth, uploadImages, async (req, res) => {
  const { reqId } = req.params;
  const { level, decision, comment } = req.body ?? {};
  if (!["agentryx", "htis", "hpsedc_staging", "hpsedc_final"].includes(level))
    return res.status(400).json({ error: "Invalid level" });
  if (!["accepted", "rejected", "waived"].includes(decision))
    return res.status(400).json({ error: "Invalid decision" });

  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.id, req.session.reviewerId!));
  if (!reviewer) return res.status(401).json({ error: "Reviewer not found" });

  const isAdmin = reviewer.role === "admin" || reviewer.role === "delivery";
  if (!isAdmin && reviewer.role !== level) {
    return res.status(403).json({
      error: `Your role (${reviewer.role}) can only sign off at level "${reviewer.role}". Requested level: "${level}".`,
    });
  }

  const files = req.files as Express.Multer.File[] | undefined;

  const existing = await db.select().from(signoffs).where(
    and(eq(signoffs.requirementId, reqId), eq(signoffs.level, level))
  );
  let signoffRow;
  if (existing[0]) {
    [signoffRow] = await db.update(signoffs).set({
      decision, comment: comment ?? null, reviewerId: req.session.reviewerId!, signedAt: new Date(),
    }).where(eq(signoffs.id, existing[0].id)).returning();
  } else {
    [signoffRow] = await db.insert(signoffs).values({
      requirementId: reqId, level, decision, comment: comment ?? null,
      reviewerId: req.session.reviewerId!,
    }).returning();
  }

  const newAttachments = await saveAttachments(files, "signoff", signoffRow.id, req.session.reviewerId!);
  res.json({ ...signoffRow, attachments: newAttachments });
});

// Edit test instructions for a requirement. Admin/delivery only.
projectsRouter.patch("/:slug/requirements/:reqId", requireAuth, async (req, res) => {
  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.id, req.session.reviewerId!));
  if (!reviewer) return res.status(401).json({ error: "Reviewer not found" });
  if (reviewer.role !== "admin" && reviewer.role !== "delivery") {
    return res.status(403).json({ error: "Only admin/delivery can edit instructions" });
  }
  const { testSteps, expectedResult } = req.body ?? {};
  const [row] = await db.update(requirements).set({
    ...(testSteps !== undefined ? { testSteps } : {}),
    ...(expectedResult !== undefined ? { expectedResult } : {}),
  }).where(eq(requirements.id, req.params.reqId)).returning();
  res.json(row);
});

// Admin toggle — flip visible_to_non_admin on a project. Admin/delivery only.
// Kept on the project resource itself so the client doesn't need a separate
// admin panel yet; Home renders an inline eye-icon button for admins.
projectsRouter.patch("/:slug/visibility", requireAuth, async (req, res) => {
  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.id, req.session.reviewerId!));
  if (!reviewer) return res.status(401).json({ error: "Reviewer not found" });
  if (reviewer.role !== "admin" && reviewer.role !== "delivery") {
    return res.status(403).json({ error: "Only admin/delivery can change project visibility" });
  }
  const visible = req.body?.visibleToNonAdmin;
  if (typeof visible !== "boolean") return res.status(400).json({ error: "visibleToNonAdmin (boolean) required" });

  const [row] = await db.update(projects)
    .set({ visibleToNonAdmin: visible })
    .where(eq(projects.slug, req.params.slug))
    .returning();
  if (!row) return res.status(404).json({ error: "Project not found" });
  res.json(row);
});

// Clear a sign-off (reset decision to pending). Same authorization as posting.
projectsRouter.delete("/:slug/requirements/:reqId/signoff", requireAuth, async (req, res) => {
  const { reqId } = req.params;
  const level = String(req.query.level ?? "");
  if (!["agentryx", "htis", "hpsedc_staging", "hpsedc_final"].includes(level))
    return res.status(400).json({ error: "Invalid level" });

  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.id, req.session.reviewerId!));
  if (!reviewer) return res.status(401).json({ error: "Reviewer not found" });

  const isAdmin = reviewer.role === "admin" || reviewer.role === "delivery";
  if (!isAdmin && reviewer.role !== level) {
    return res.status(403).json({
      error: `Your role (${reviewer.role}) can only clear sign-offs at level "${reviewer.role}".`,
    });
  }

  await db.delete(signoffs).where(and(eq(signoffs.requirementId, reqId), eq(signoffs.level, level as any)));
  res.json({ ok: true });
});

// Comments for a requirement — includes attachments grouped by comment
projectsRouter.get("/:slug/requirements/:reqId/comments", async (req, res) => {
  const rows = await db.select({
    id: comments.id, body: comments.body, createdAt: comments.createdAt,
    reviewerName: reviewers.name, reviewerOrg: reviewers.organization,
  }).from(comments)
    .leftJoin(reviewers, eq(reviewers.id, comments.reviewerId))
    .where(eq(comments.requirementId, req.params.reqId))
    .orderBy(asc(comments.createdAt));

  const ids = rows.map(r => r.id);
  const atts = ids.length
    ? await db.select().from(attachments).where(
        and(eq(attachments.ownerType, "comment"), inArray(attachments.ownerId, ids))
      )
    : [];
  const byOwner: Record<string, any[]> = {};
  for (const a of atts) (byOwner[a.ownerId] ??= []).push(a);

  res.json(rows.map(r => ({ ...r, attachments: byOwner[r.id] ?? [] })));
});

projectsRouter.post("/:slug/requirements/:reqId/comments", requireAuth, uploadImages, async (req, res) => {
  const { body } = req.body ?? {};
  const files = req.files as Express.Multer.File[] | undefined;
  const hasText = body?.trim();
  const hasFiles = files && files.length > 0;
  if (!hasText && !hasFiles) return res.status(400).json({ error: "Text or at least one file required" });
  const [row] = await db.insert(comments).values({
    requirementId: req.params.reqId, reviewerId: req.session.reviewerId!,
    body: hasText ? body.trim() : "",
  }).returning();
  const newAttachments = await saveAttachments(files, "comment", row.id, req.session.reviewerId!);
  res.json({ ...row, attachments: newAttachments });
});

// Issues
projectsRouter.get("/:slug/issues", async (req, res) => {
  const [project] = await db.select().from(projects).where(eq(projects.slug, req.params.slug));
  if (!project) return res.status(404).json({ error: "Not found" });
  // Join reviewers so the client can show WHO raised each issue. Cheap join —
  // issues are typically < 100 rows per project. Returning raw reviewer refs
  // left the UI unable to attribute entries without a second round-trip.
  const rows = await db.select({
    id: issues.id,
    projectId: issues.projectId,
    shortId: issues.shortId,
    itemRef: issues.itemRef,
    severity: issues.severity,
    status: issues.status,
    description: issues.description,
    resolution: issues.resolution,
    reportedById: issues.reportedById,
    createdAt: issues.createdAt,
    updatedAt: issues.updatedAt,
    reporterUsername: reviewers.username,
    reporterOrg: reviewers.organization,
    reporterRole: reviewers.role,
  }).from(issues)
    .leftJoin(reviewers, eq(reviewers.id, issues.reportedById))
    .where(eq(issues.projectId, project.id))
    .orderBy(desc(issues.createdAt));
  res.json(rows);
});

projectsRouter.post("/:slug/issues", requireAuth, async (req, res) => {
  const [project] = await db.select().from(projects).where(eq(projects.slug, req.params.slug));
  if (!project) return res.status(404).json({ error: "Not found" });
  const { itemRef, severity, description } = req.body ?? {};
  if (!severity || !description) return res.status(400).json({ error: "severity + description required" });

  // Compute next short id (HS-001 etc.)
  const prefix = project.slug.split("-")[0].toUpperCase().slice(0, 4);
  const existing = await db.select().from(issues).where(eq(issues.projectId, project.id));
  const next = `${prefix}-${String(existing.length + 1).padStart(3, "0")}`;

  const [row] = await db.insert(issues).values({
    projectId: project.id, shortId: next, itemRef: itemRef || null,
    severity, description, reportedById: req.session.reviewerId!,
  }).returning();
  res.json(row);
});

projectsRouter.patch("/:slug/issues/:id", requireAuth, async (req, res) => {
  // Only the reporter (HTIS can't close an Agentryx-reported issue and vice-
  // versa) or an admin/delivery reviewer can edit. Previously anyone signed in
  // could flip status, which meant one tester could mark another tester's open
  // bug as "closed" — confusing the audit trail.
  const [existing] = await db.select().from(issues).where(eq(issues.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Issue not found" });
  const [me] = await db.select().from(reviewers).where(eq(reviewers.id, req.session.reviewerId!));
  if (!me) return res.status(401).json({ error: "Reviewer not found" });
  const isAdmin = me.role === "admin" || me.role === "delivery";
  const isReporter = existing.reportedById === me.id;
  if (!isAdmin && !isReporter) {
    return res.status(403).json({ error: "Only the reporter or an admin can change this issue's status." });
  }

  const { status, resolution } = req.body ?? {};
  const [row] = await db.update(issues).set({
    ...(status ? { status } : {}),
    ...(resolution !== undefined ? { resolution } : {}),
    updatedAt: new Date(),
  }).where(eq(issues.id, req.params.id)).returning();
  res.json(row);
});
