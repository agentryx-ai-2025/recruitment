/**
 * Candidate self-service endpoints (v1.5 additions):
 *   • Compliance fields they can edit themselves
 *   • Profile PDF download
 *   • Welfare reply (candidate-initiated)
 *   • References CRUD
 *   • ICS for their own interviews
 *   • Offer letter PDF download
 */

import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { storage } from "../storage";
import {
  candidates, candidateEducation, candidateExperience, documents,
  candidateReferences, placements, applications, interviews, jobs,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { logger } from "../config/logger.config";
import { upload, verifyUploadedFile, handleUploadErrors, UPLOAD_DIR, HS_PHOTOS_DIR } from "../middleware/upload.middleware";
import fsNode from "fs";
import pathNode from "path";

const router = Router();
router.use(protect);

// ── Profile photo upload (candidate-only) ────────────────────────────
// Pipeline: multer writes the file into uploads/hs/candidates/docs/ (its
// default destination for any HireStream upload), magic-byte check validates
// it, then we move it into the photos leaf. Keeping photos in a dedicated
// leaf lets the static-serve mount expose ONLY photos publicly — sensitive
// documents (passport, PCC, offer letters) remain auth-gated at a separate
// URL space. URL format: /uploads/hs/candidates/photos/<file>.
router.post("/photo", upload.single("file"), verifyUploadedFile, async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (user.role !== "candidate") return res.status(403).json({ success: false, message: "Candidate-only" });
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    if (!req.file.mimetype.startsWith("image/")) {
      // Clean up the non-image file that multer already wrote.
      try { fsNode.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ success: false, message: "Profile photo must be an image (JPG or PNG)" });
    }
    const candId = await getMyCandidateId(user.id);
    if (!candId) return res.status(404).json({ success: false, message: "Profile not found" });

    // Move the file from the docs landing into the photos leaf so the public
    // static-serve mount only exposes this subdir, never docs.
    const dest = pathNode.join(HS_PHOTOS_DIR, req.file.filename);
    try { fsNode.renameSync(req.file.path, dest); } catch (e) {
      logger.warn(`Photo move failed: ${(e as Error).message}`);
    }
    const photoUrl = `/uploads/hs/candidates/photos/${req.file.filename}`;

    // Delete the previous photo from disk to reclaim space.
    const [prev] = await storage.db.select({ photoUrl: candidates.photoUrl })
      .from(candidates).where(eq(candidates.id, candId));
    if (prev?.photoUrl) {
      const prevPath = pathNode.join(UPLOAD_DIR, prev.photoUrl.replace(/^\/uploads\//, ""));
      try { fsNode.unlinkSync(prevPath); } catch {}
    }

    const [row] = await storage.db.update(candidates)
      .set({ photoUrl })
      .where(eq(candidates.id, candId))
      .returning();
    logger.info(`Photo uploaded: candidate=${candId} url=${photoUrl}`);
    res.json({ success: true, data: { photoUrl: row.photoUrl } });
  } catch (err) { next(err); }
});

router.delete("/photo", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (user.role !== "candidate") return res.status(403).json({ success: false, message: "Candidate-only" });
    const candId = await getMyCandidateId(user.id);
    if (!candId) return res.status(404).json({ success: false, message: "Profile not found" });
    await storage.db.update(candidates).set({ photoUrl: null }).where(eq(candidates.id, candId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

async function getMyCandidateId(userId: string) {
  if (!storage.db) return null;
  const [row] = await storage.db.select().from(candidates).where(eq(candidates.userId, userId)).limit(1);
  return row?.id ?? null;
}

// ── Candidate self-edit compliance fields ────────────────────────────
router.patch("/compliance", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (user.role !== "candidate") return res.status(403).json({ success: false, message: "Candidate-only" });
    const candId = await getMyCandidateId(user.id);
    if (!candId) return res.status(404).json({ success: false, message: "Profile not found" });

    const allowed = [
      "passportNumber", "passportExpiry", "ecrStatus",
      "pccStatus", "pccExpiry", "medicalStatus", "medicalDate",
      "ieltsBand", "languageProficiency",
      "pdoCompleted", "pdoDate",
      "pbbyInsuranceStatus", "pbbyPolicyNumber",
    ];
    const set: any = {};
    for (const k of allowed) if (k in (req.body ?? {})) set[k] = req.body[k];
    if (Object.keys(set).length === 0) return res.status(400).json({ success: false, message: "No valid fields" });

    // HTIS BUG-006 — passport expiry must be today or future. Same rule on the
    // PCC expiry since it's an identical travel-document expiry field. Null /
    // empty is allowed (unset). Comparison is date-only (strip time-of-day).
    const today = new Date(new Date().toDateString());
    for (const fld of ["passportExpiry", "pccExpiry"] as const) {
      if (set[fld]) {
        const d = new Date(set[fld]);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ success: false, message: `${fld} is not a valid date.` });
        if (d < today) return res.status(400).json({ success: false, message: `${fld === "passportExpiry" ? "Passport" : "PCC"} expiry must be today or a future date.` });
      }
    }

    const [row] = await storage.db.update(candidates).set(set).where(eq(candidates.id, candId)).returning();
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// ── Candidate references — CRUD ──────────────────────────────────────
router.get("/references", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const candId = await getMyCandidateId(user.id);
    if (!candId) return res.json({ success: true, data: [] });
    const rows = await storage.db.select().from(candidateReferences)
      .where(eq(candidateReferences.candidateId, candId))
      .orderBy(desc(candidateReferences.createdAt));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post("/references", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (user.role !== "candidate") return res.status(403).json({ success: false });
    const candId = await getMyCandidateId(user.id);
    if (!candId) return res.status(404).json({ success: false });
    const { name, relationship, email, phone, organization } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ success: false, message: "name required" });
    const [row] = await storage.db.insert(candidateReferences).values({
      candidateId: candId, name: name.trim(), relationship, email, phone, organization,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

router.delete("/references/:id", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const candId = await getMyCandidateId(user.id);
    if (!candId) return res.status(404).json({ success: false });
    const [ref] = await storage.db.select().from(candidateReferences).where(eq(candidateReferences.id, req.params.id)).limit(1);
    if (!ref || ref.candidateId !== candId) return res.status(404).json({ success: false });
    await storage.db.delete(candidateReferences).where(eq(candidateReferences.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Candidate welfare reply (proactive outreach) ─────────────────────
router.post("/placements/:id/welfare-reply", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const candId = await getMyCandidateId(user.id);
    if (!candId) return res.status(404).json({ success: false });

    // Ensure this placement belongs to the current candidate
    const [row] = await storage.db
      .select({ p: placements, a: applications })
      .from(placements)
      .innerJoin(applications, eq(placements.applicationId, applications.id))
      .where(and(eq(placements.id, req.params.id), eq(applications.candidateId, candId)))
      .limit(1);
    if (!row) return res.status(404).json({ success: false });

    const note = String(req.body?.note ?? "").trim();
    if (!note) return res.status(400).json({ success: false, message: "note required" });

    await storage.db.update(placements)
      .set({ candidateWelfareNote: note, candidateWelfareNoteAt: new Date() })
      .where(eq(placements.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Profile PDF export (candidate's own portfolio) ───────────────────
router.get("/profile.pdf", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).send("");
    const user = (req as any).user;
    if (user.role !== "candidate") return res.status(403).send("");
    const candId = await getMyCandidateId(user.id);
    if (!candId) return res.status(404).send("");

    const [c] = await storage.db.select().from(candidates).where(eq(candidates.id, candId)).limit(1);
    const edu = await storage.db.select().from(candidateEducation).where(eq(candidateEducation.candidateId, candId));
    const exp = await storage.db.select().from(candidateExperience).where(eq(candidateExperience.candidateId, candId));
    const docs = await storage.db.select().from(documents).where(eq(documents.candidateId, candId));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${c.fullName.replace(/\s+/g, "-").toLowerCase()}-portfolio.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(res);

    // Header
    doc.font("Helvetica-Bold").fontSize(22).fillColor("#0f172a").text(c.fullName);
    doc.font("Helvetica").fontSize(10).fillColor("#64748b")
      .text(`${c.email}${c.phone ? ` · ${c.phone}` : ""}${c.location ? ` · ${c.location}` : ""}`);
    if (c.preferredCountries?.length) {
      doc.text(`Preferred destinations: ${c.preferredCountries.join(", ")}`);
    }
    doc.moveDown();

    // Skills
    if (c.skills?.length) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("Skills");
      doc.font("Helvetica").fontSize(10).fillColor("#334155").text(c.skills.join(" · "));
      doc.moveDown();
    }

    // Experience
    if (exp.length) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("Work Experience");
      doc.moveDown(0.3);
      for (const e of exp) {
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text(e.role ?? "");
        doc.font("Helvetica").fontSize(10).fillColor("#475569")
          .text(`${e.company ?? ""}${e.years ? ` · ${e.years} yrs` : ""}${e.country ? ` · ${e.country}` : ""}`);
        if (e.description) doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(e.description, { align: "justify" });
        doc.moveDown(0.5);
      }
    }

    // Education
    if (edu.length) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("Education");
      doc.moveDown(0.3);
      for (const e of edu) {
        doc.font("Helvetica-Bold").fontSize(11).text(e.degree ?? "");
        doc.font("Helvetica").fontSize(10).fillColor("#475569")
          .text(`${e.institution ?? ""}${e.year ? ` · ${e.year}` : ""}${e.percentage ? ` · ${e.percentage}%` : ""}`);
        doc.moveDown(0.4);
      }
    }

    // Compliance summary (overseas-placement essentials)
    const hasCompliance = c.passportNumber || c.ecrStatus || c.pdoCompleted || c.ieltsBand;
    if (hasCompliance) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("Pre-Departure Readiness");
      doc.moveDown(0.3);
      const kv = (k: string, v: any) => {
        if (!v && v !== 0) return;
        doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(`${k}: `, { continued: true })
           .font("Helvetica-Bold").fillColor("#0f172a").text(String(v));
      };
      kv("Passport", c.passportNumber);
      kv("ECR status", c.ecrStatus);
      kv("IELTS band", c.ieltsBand);
      kv("PDO completed", c.pdoCompleted ? "Yes" : "No");
      kv("PBBY insurance", c.pbbyInsuranceStatus);
    }

    // Documents list
    if (docs.length) {
      doc.moveDown();
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("Documents on file");
      for (const d of docs) {
        doc.font("Helvetica").fontSize(10).fillColor("#475569")
          .text(`  • ${d.fileName}${d.verified ? " ✓ Verified" : ""}`);
      }
    }

    // Footer
    doc.moveDown(2);
    doc.font("Helvetica").fontSize(8).fillColor("#94a3b8")
      .text(`Generated from HireStream · ${new Date().toLocaleDateString("en-IN")} · HPSEDC Overseas Placement Portal`, { align: "center" });

    doc.end();
  } catch (err) { next(err); }
});

// ── My interviews — ICS (for candidate's own calendar) ───────────────
router.get("/interviews/:id.ics", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).send("");
    const user = (req as any).user;
    const candId = await getMyCandidateId(user.id);
    if (!candId) return res.status(404).send("");

    const [row] = await storage.db
      .select({ interview: interviews, application: applications, candidate: candidates, job: jobs })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(eq(interviews.id, req.params.id), eq(candidates.id, candId))).limit(1);
    if (!row) return res.status(404).send("");
    const i = row.interview, j = row.job;

    const dt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    const start = new Date(i.scheduledAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HireStream//Candidate//EN",
      "BEGIN:VEVENT",
      `UID:${i.id}@hirestream.agentryx.dev`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      `SUMMARY:Interview — ${j.title} at ${j.company}`,
      `LOCATION:${(i.location || "TBD").replace(/\n/g, " ")}`,
      `DESCRIPTION:Interview for ${j.title} at ${j.company}. Mode: ${i.mode || "in_person"}.`,
      "END:VEVENT", "END:VCALENDAR",
    ];
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="interview-${i.id}.ics"`);
    res.send(lines.join("\r\n"));
  } catch (err) { next(err); }
});

// ── Offer letter PDF (candidate downloading their own) ───────────────
router.get("/placements/:id/offer-letter.pdf", async (req, res, next) => {
  // Delegate to the agent endpoint — it already allows candidate-owner download.
  // Keeping a candidate-facing URL for discoverability.
  res.redirect(`/api/v1/agent/placements/${req.params.id}/offer-letter.pdf`);
});

// Catch multer-specific errors (LIMIT_FILE_SIZE → 413; file-filter type
// rejection → 400) before they hit the global handler as 500s. Same pattern
// used in document.routes.ts. Without this, the photo upload returned a
// generic 500 with code:"LIMIT_FILE_SIZE" instead of the friendly 413 with
// "File too large. Limit is 5 MB." text.
router.use(handleUploadErrors);

export default router;
