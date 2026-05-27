/**
 * Agent Productivity routes — bundles the Tier 1 / Tier 2 features added
 * in the v1.5 session:
 *   • Internal notes on applicants
 *   • Structured interview feedback
 *   • CSV export of applicants per job
 *   • Saved candidate-search segments
 *   • ICS calendar export of interviews
 *   • Offer letter PDF generation
 *
 * Mounted at /api/v1/agent/... in server/routes.ts
 */

import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { storage } from "../storage";
import {
  applicationNotes, applications, interviews, jobs, candidates,
  savedSegments, placements, users, recruitmentAgents, auditLog,
} from "@shared/schema";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import PDFDocument from "pdfkit";
import { logger } from "../config/logger.config";
import { getSetting } from "../services/settings.service";

const router = Router();
router.use(protect);

// ── Internal notes on applicants ─────────────────────────────────────
router.get("/applications/:id/notes", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const rows = await storage.db.select({
      id: applicationNotes.id, body: applicationNotes.body, createdAt: applicationNotes.createdAt,
      authorName: users.username, authorRole: users.role,
    }).from(applicationNotes)
      .leftJoin(users, eq(users.id, applicationNotes.authorId))
      .where(eq(applicationNotes.applicationId, req.params.id))
      .orderBy(desc(applicationNotes.createdAt));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post("/applications/:id/notes", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (!["agent", "employer", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const body = String(req.body?.body ?? "").trim();
    if (!body) return res.status(400).json({ success: false, message: "body required" });
    const [row] = await storage.db.insert(applicationNotes).values({
      applicationId: req.params.id, authorId: user.id, body,
    }).returning();

    // @mention parsing — notify anyone whose username appears as "@username"
    // in the note body. Keeps agent/employer collaboration tight without
    // requiring email. Skips the author to avoid self-notifications.
    try {
      const mentions = Array.from(new Set((body.match(/@([a-z0-9_.-]+)/gi) || []).map((m) => m.slice(1).toLowerCase())));
      if (mentions.length > 0) {
        const mentioned = await storage.db.select().from(users)
          .where(inArray(sql`LOWER(${users.username})`, mentions));
        const { notify } = await import("../services/notification.service");
        for (const u of mentioned as any[]) {
          if (u.id === user.id) continue;
          notify({
            userId: u.id, type: "system",
            title: `${user.username} mentioned you on a candidate`,
            message: body.slice(0, 240),
            severity: "info",
            metadata: { applicationId: req.params.id, noteId: row.id, mentionedBy: user.id },
          }).catch(() => {});
        }
      }
    } catch (e: any) { logger.warn(`@mention parse failed: ${e?.message}`); }

    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

router.delete("/applications/notes/:id", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const [note] = await storage.db.select().from(applicationNotes).where(eq(applicationNotes.id, req.params.id)).limit(1);
    if (!note) return res.status(404).json({ success: false });
    if (note.authorId !== user.id && user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only the author or an admin can delete this note." });
    }
    await storage.db.delete(applicationNotes).where(eq(applicationNotes.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Structured interview feedback ────────────────────────────────────
router.patch("/interviews/:id/feedback", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (!["agent", "employer", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const { rating, strengths, concerns, recommendation, notes, scorecard } = req.body ?? {};
    const updates: any = {};
    if (rating !== undefined) {
      const r = Number(rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ success: false, message: "rating must be 1..5" });
      updates.rating = r;
    }
    if (strengths !== undefined) updates.strengths = String(strengths || "") || null;
    if (concerns !== undefined) updates.concerns = String(concerns || "") || null;
    if (recommendation !== undefined) {
      const ok = ["strong_yes", "yes", "maybe", "no", "strong_no"];
      if (recommendation && !ok.includes(recommendation)) return res.status(400).json({ success: false, message: "invalid recommendation" });
      updates.recommendation = recommendation || null;
    }
    if (notes !== undefined) updates.notes = String(notes || "") || null;
    // Scorecard: { technical, communication, culture, english, custom?: {} }
    // Values must be 1-5 integers. Clamp silently; anything outside is dropped.
    if (scorecard !== undefined) {
      const clean: any = {};
      if (scorecard && typeof scorecard === "object") {
        for (const dim of ["technical", "communication", "culture", "english"]) {
          const v = Number(scorecard[dim]);
          if (Number.isFinite(v) && v >= 1 && v <= 5) clean[dim] = Math.round(v);
        }
        if (scorecard.custom && typeof scorecard.custom === "object") clean.custom = scorecard.custom;
      }
      updates.scorecard = Object.keys(clean).length ? clean : null;
    }

    const [row] = await storage.db.update(interviews).set(updates).where(eq(interviews.id, req.params.id)).returning();
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// ── CSV export: applicants for a job (FRS 2.10) ──────────────────────
router.get("/jobs/:id/applicants.csv", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).send("");
    const user = (req as any).user;
    const [job] = await storage.db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job) return res.status(404).send("");
    if (user.role !== "admin" && job.agentId !== user.id && job.employerId !== user.id) {
      return res.status(403).send("");
    }
    const rows = await storage.db
      .select({ application: applications, candidate: candidates })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(eq(applications.jobId, job.id));

    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = [
      "Application ID", "Status", "Match Score", "Applied At",
      "Candidate Name", "Email", "Phone", "Location", "Experience (yrs)", "Skills",
      "Passport #", "ECR Status", "PDO Completed", "IELTS Band",
    ];
    const lines = [header.map(esc).join(",")];
    for (const r of rows) {
      lines.push([
        r.application.id, r.application.status, r.application.matchScore, r.application.appliedAt?.toISOString(),
        r.candidate.fullName, r.candidate.email, r.candidate.phone, r.candidate.location,
        r.candidate.experience, (r.candidate.skills || []).join("; "),
        r.candidate.passportNumber, r.candidate.ecrStatus, r.candidate.pdoCompleted ? "Yes" : "No",
        r.candidate.ieltsBand,
      ].map(esc).join(","));
    }
    const fname = `applicants-${job.title.replace(/[^a-z0-9]/gi, "-").slice(0, 40).toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.send(lines.join("\n"));
  } catch (err) { next(err); }
});

// GET /api/v1/agent/jobs/:id/applicants.zip
// Bundle the CSV + each candidate's uploaded documents into a ZIP. Tester
// feedback 2.10 was "no actual documents" in the export — this endpoint
// returns a proper archive: applicants.csv + documents/<candidate-name>/*.
// Auth mirrors the CSV endpoint; the ZIP is streamed, not materialized to disk.
router.get("/jobs/:id/applicants.zip", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).send("");
    const user = (req as any).user;
    const [job] = await storage.db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job) return res.status(404).send("");
    if (user.role !== "admin" && job.agentId !== user.id && job.employerId !== user.id) {
      return res.status(403).send("");
    }
    const rows = await storage.db
      .select({ application: applications, candidate: candidates })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(eq(applications.jobId, job.id));

    // Build CSV (duplicated inline — the .csv route has the same shape; keeping
    // a local copy avoids coupling this stream response to the res.send() branch).
    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      "Application ID", "Status", "Match Score", "Applied At",
      "Candidate Name", "Email", "Phone", "Location", "Experience (yrs)", "Skills",
      "Passport #", "ECR Status", "PDO Completed", "IELTS Band",
      "Documents",
    ];
    const csvLines = [header.map(esc).join(",")];

    // Preload each candidate's documents so we can list them in the CSV AND
    // stream them into the archive below.
    const { documents: docsTable } = await import("@shared/schema");
    const candIds = rows.map((r: any) => r.candidate.id);
    const docs = candIds.length
      ? await storage.db.select().from(docsTable).where(inArray(docsTable.candidateId, candIds))
      : [];
    const docsByCandidate: Record<string, any[]> = {};
    for (const d of docs as any[]) (docsByCandidate[d.candidateId] ??= []).push(d);

    for (const r of rows) {
      const myDocs = docsByCandidate[r.candidate.id] ?? [];
      csvLines.push([
        r.application.id, r.application.status, r.application.matchScore, r.application.appliedAt?.toISOString(),
        r.candidate.fullName, r.candidate.email, r.candidate.phone, r.candidate.location,
        r.candidate.experience, (r.candidate.skills || []).join("; "),
        r.candidate.passportNumber, r.candidate.ecrStatus, r.candidate.pdoCompleted ? "Yes" : "No",
        r.candidate.ieltsBand,
        myDocs.map((d: any) => `${d.type}:${d.fileName}`).join("; "),
      ].map(esc).join(","));
    }
    const csv = csvLines.join("\n");

    // Stream the archive. archiver writes to res progressively so we never
    // hold the full ZIP in memory — important for jobs with many PDFs.
    const fname = `applicants-${job.title.replace(/[^a-z0-9]/gi, "-").slice(0, 40).toLowerCase()}-${new Date().toISOString().slice(0,10)}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);

    const archiver = (await import("archiver")).default;
    const path = await import("node:path");
    const { UPLOAD_DIR } = await import("../middleware/upload.middleware");
    const zip = archiver("zip", { zlib: { level: 9 } });
    zip.on("error", (err: Error) => { logger.warn(`Archive error for job ${job.id}: ${err.message}`); try { res.end(); } catch {} });
    zip.pipe(res);
    zip.append(csv, { name: "applicants.csv" });

    for (const r of rows) {
      const myDocs = docsByCandidate[r.candidate.id] ?? [];
      if (!myDocs.length) continue;
      const safeName = (r.candidate.fullName || "unknown").replace(/[^a-z0-9]/gi, "_").slice(0, 60);
      for (const d of myDocs as any[]) {
        // fileUrl format is /uploads/<filename> — resolve to disk path.
        const disk = path.join(UPLOAD_DIR, path.basename(d.fileUrl ?? ""));
        // archiver handles missing files by skipping; using file() rather than
        // readFileSync keeps memory flat when candidates have big PDFs.
        zip.file(disk, { name: `documents/${safeName}/${d.type}-${d.fileName}` });
      }
    }
    await zip.finalize();
  } catch (err) { next(err); }
});

// ── Saved candidate-search segments ──────────────────────────────────
router.get("/segments", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const rows = await storage.db.select().from(savedSegments)
      .where(eq(savedSegments.userId, user.id))
      .orderBy(desc(savedSegments.createdAt));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post("/segments", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const { name, filters } = req.body ?? {};
    if (!name?.trim() || !filters) return res.status(400).json({ success: false, message: "name and filters required" });
    const [row] = await storage.db.insert(savedSegments).values({
      userId: user.id, name: name.trim(), filters,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

router.delete("/segments/:id", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const [seg] = await storage.db.select().from(savedSegments).where(eq(savedSegments.id, req.params.id)).limit(1);
    if (!seg || seg.userId !== user.id) return res.status(404).json({ success: false });
    await storage.db.delete(savedSegments).where(eq(savedSegments.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── ICS calendar export for a single interview ───────────────────────
router.get("/interviews/:id.ics", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).send("");
    const [row] = await storage.db
      .select({ interview: interviews, application: applications, candidate: candidates, job: jobs })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(interviews.id, req.params.id)).limit(1);
    if (!row) return res.status(404).send("");
    const i = row.interview, c = row.candidate, j = row.job;

    const dt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    const start = new Date(i.scheduledAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1-hour default
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HireStream//Interview//EN",
      "BEGIN:VEVENT",
      `UID:${i.id}@hirestream.agentryx.dev`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      `SUMMARY:Interview — ${c.fullName} for ${j.title}`,
      `LOCATION:${(i.location || "TBD").replace(/\n/g, " ")}`,
      `DESCRIPTION:Interview with ${c.fullName} (${c.email}) for ${j.title} at ${j.company}. Mode: ${i.mode || "in_person"}.`,
      "END:VEVENT", "END:VCALENDAR",
    ];
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="interview-${i.id}.ics"`);
    res.send(lines.join("\r\n"));
  } catch (err) { next(err); }
});

// ── Offer letter PDF generation ──────────────────────────────────────
router.get("/placements/:id/offer-letter.pdf", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).send("");
    const user = (req as any).user;
    const [row] = await storage.db
      .select({ placement: placements, application: applications, candidate: candidates, job: jobs })
      .from(placements)
      .innerJoin(applications, eq(placements.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(placements.id, req.params.id)).limit(1);
    if (!row) return res.status(404).send("");

    const p = row.placement, c = row.candidate, j = row.job;
    // Candidate can download their own offer; agents/employers/admin can download any.
    const isOwner = c.userId === user.id;
    if (!isOwner && !["agent", "employer", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).send("");
    }

    res.setHeader("Content-Type", "application/pdf");
    // v0.4.16: inline so mobile browsers preview the PDF in-place instead
    // of silently downloading it. The "Download" intent in the UI is
    // served by an explicit download link with `download` attribute on
    // web, and by the system PDF viewer's share/save on mobile.
    res.setHeader("Content-Disposition", `inline; filename="offer-letter-${c.fullName.replace(/\s+/g, "-").toLowerCase()}.pdf"`);

    // If this request was authenticated via ?token= query (mobile media
    // download path), tighten cache + referrer headers so the token in
    // the URL doesn't get cached by intermediaries or bounced to other
    // origins via the Referer header on subsequent navigations.
    if ((req as any).isMobileQueryAuth) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Referrer-Policy", "no-referrer");
    }

    const doc = new PDFDocument({ size: "A4", margin: 56 });
    doc.pipe(res);

    doc.font("Helvetica-Bold").fontSize(20).fillColor("#1d4ed8").text("HireStream", { continued: false });
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text("HPSEDC Overseas Placement Portal — Government of Himachal Pradesh");
    doc.moveDown(1.5);

    doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a").text("LETTER OF OFFER", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#64748b").text(`Reference: ${p.id}    Date: ${new Date().toLocaleDateString("en-IN")}`, { align: "center" });
    doc.moveDown(1.5);

    doc.fillColor("#0f172a").fontSize(11).font("Helvetica");
    doc.text(`Dear ${c.fullName},`);
    doc.moveDown(0.5);
    doc.text(
      `On behalf of ${j.company}, we are pleased to offer you the position of ${j.title} based in ${j.location}, ${p.country}. This offer is extended through the HPSEDC Overseas Placement Portal.`,
      { align: "justify" }
    );
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Offer Details");
    doc.font("Helvetica");
    doc.moveDown(0.3);
    const kv = (k: string, v: string) => { doc.text(`${k}: `, { continued: true }).font("Helvetica-Bold").text(v).font("Helvetica"); };
    kv("Position", j.title);
    kv("Employer", j.company);
    kv("Location", `${j.location}, ${p.country}`);
    kv("Compensation", p.salary || "As per contract");
    kv("Start date", p.startDate ? new Date(p.startDate).toLocaleDateString("en-IN") : "To be confirmed");
    doc.moveDown();

    doc.font("Helvetica-Bold").text("Next steps");
    doc.font("Helvetica").moveDown(0.3);
    doc.text("1. Log in to your HireStream account and Accept or Decline this offer.", { indent: 10 });
    doc.text("2. On acceptance, your agency will begin the visa documentation process.", { indent: 10 });
    doc.text("3. Attend the mandatory Pre-Departure Orientation (PDO) when scheduled.", { indent: 10 });
    doc.text("4. Complete PBBY (Pravasi Bharatiya Bima Yojana) insurance enrolment before departure.", { indent: 10 });
    doc.moveDown();

    doc.fontSize(9).fillColor("#64748b")
      .text("This offer is issued under the Emigration Act, 1983. Any concerns or grievances can be raised via the HireStream Grievances portal or directly with HPSEDC.", { align: "justify" });

    doc.moveDown(2);
    doc.font("Helvetica").fontSize(11).fillColor("#0f172a");
    doc.text("With regards,");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("HPSEDC");
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text("Himachal Pradesh State Electronics Development Corporation");

    doc.end();
  } catch (err) { next(err); }
});

// ── Edit placement details (v0.4.14.0) ──────────────────────────────
// Auto-created placements get defaults from the parent job (country,
// salary). This endpoint lets the employer / agent refine country,
// salary, and startDate before the candidate accepts. Ownership is
// enforced via the parent job — same model as application status.
router.patch("/placements/:id", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (!["employer", "agent", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { country, salary, startDate } = req.body ?? {};
    const updates: any = {};
    if (country !== undefined) {
      if (typeof country !== "string" || !country.trim()) {
        return res.status(400).json({ success: false, message: "country must be a non-empty string" });
      }
      updates.country = country.trim();
    }
    if (salary !== undefined) updates.salary = salary || null;
    if (startDate !== undefined) {
      if (startDate === null || startDate === "") {
        updates.startDate = null;
      } else {
        const d = new Date(startDate);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: "startDate must be a valid date" });
        }
        updates.startDate = d;
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No editable fields supplied (country/salary/startDate)" });
    }

    // Ownership check — placement is owned via its application's job.
    const [row] = await db
      .select({ placement: placements, job: jobs })
      .from(placements)
      .innerJoin(applications, eq(placements.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(placements.id, req.params.id))
      .limit(1);
    if (!row) return res.status(404).json({ success: false, message: "Placement not found" });

    const isAdmin = user.role === "admin" || user.role === "superadmin";
    if (!isAdmin) {
      const owns = (user.role === "agent" && row.job.agentId === user.id)
                 || (user.role === "employer" && row.job.employerId === user.id);
      if (!owns) {
        return res.status(403).json({ success: false, message: "You can only edit placements on your own jobs." });
      }
    }

    const [updated] = await db.update(placements)
      .set(updates)
      .where(eq(placements.id, req.params.id))
      .returning();

    logger.info(`placement ${req.params.id} edited by ${user.role} ${user.id}: ${JSON.stringify(updates)}`);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ── Upload appointment letter URL to a placement (FRS 3.5) ───────────
// Minimal endpoint: expects a URL string (employer uploads elsewhere and stores link).
// For full file upload, a multer-backed endpoint would be added later.
router.patch("/placements/:id/appointment-letter", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (!["employer", "agent", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const { appointmentLetterUrl } = req.body ?? {};
    if (!appointmentLetterUrl) return res.status(400).json({ success: false, message: "appointmentLetterUrl required" });
    const [row] = await storage.db.update(placements)
      .set({ appointmentLetterUrl })
      .where(eq(placements.id, req.params.id)).returning();
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// ── My placements (employer/agent, scoped to their jobs) ─────────────
// v0.4.14: employer scope was missing derivative jobs (where employer_id
// is NULL because the agent picked up the requisition). Now also matches
// placements whose job's parent requisition is owned by the employer —
// same ownership pattern as application status PATCH (FRS §2.2).
router.get("/placements", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (!["employer", "agent", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (user.role === "admin" || user.role === "superadmin") {
      const rows = await storage.db
        .select({ placement: placements, application: applications, candidate: candidates, job: jobs })
        .from(placements)
        .innerJoin(applications, eq(placements.applicationId, applications.id))
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .innerJoin(jobs, eq(applications.jobId, jobs.id));
      return res.json({ success: true, data: rows });
    }

    if (user.role === "agent") {
      const rows = await storage.db
        .select({ placement: placements, application: applications, candidate: candidates, job: jobs })
        .from(placements)
        .innerJoin(applications, eq(placements.applicationId, applications.id))
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(eq(jobs.agentId, user.id));
      return res.json({ success: true, data: rows });
    }

    // Employer: direct ownership OR derivative job whose parent requisition is theirs.
    // Use a single query with a self-join on the parent requisition.
    const parentJobs = alias(jobs, "parent_jobs");
    const rows = await storage.db
      .select({ placement: placements, application: applications, candidate: candidates, job: jobs })
      .from(placements)
      .innerJoin(applications, eq(placements.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(parentJobs, eq(jobs.parentRequisitionId, parentJobs.id))
      .where(or(eq(jobs.employerId, user.id), eq(parentJobs.employerId, user.id)));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── Post-placement welfare check-ins (30/60/90) ──────────────────────
router.patch("/placements/:id/welfare", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (!["agent", "employer", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const { milestone, status, notes } = req.body ?? {};
    if (!["30", "60", "90"].includes(String(milestone))) return res.status(400).json({ success: false, message: "milestone must be 30, 60, or 90" });
    if (!["ok", "concerns", "no_response", "not_applicable"].includes(status)) return res.status(400).json({ success: false, message: "invalid status" });

    const set: any = {};
    set[`welfare${milestone}Day`] = status;
    set[`welfare${milestone}DayAt`] = new Date();
    set[`welfare${milestone}DayNotes`] = notes || null;

    const [row] = await storage.db.update(placements).set(set).where(eq(placements.id, req.params.id)).returning();
    logger.info(`Welfare ${milestone}-day recorded for placement ${req.params.id}: ${status}`);
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// ── Candidate compliance fields (ECR, PDO, PBBY, passport) ───────────
router.patch("/candidates/:id/compliance", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (!["agent", "employer", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
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

    const [row] = await storage.db.update(candidates).set(set).where(eq(candidates.id, req.params.id)).returning();
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// ── Agent-scoped reports / BI ────────────────────────────────────────
router.get("/reports", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    if (!["agent", "employer", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const db = storage.db;

    // All jobs owned by this user (agent or employer)
    const myJobs = user.role === "agent"
      ? await db.select().from(jobs).where(eq(jobs.agentId, user.id))
      : user.role === "employer"
      ? await db.select().from(jobs).where(eq(jobs.employerId, user.id))
      : await db.select().from(jobs);

    const jobIds = myJobs.map((j: any) => j.id);
    const allApps = jobIds.length === 0 ? [] : await db.select({
      application: applications, job: jobs,
    }).from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(user.role === "agent" ? eq(jobs.agentId, user.id) : user.role === "employer" ? eq(jobs.employerId, user.id) : undefined as any);

    // Funnel counts
    const funnelKeys = ["submitted", "reviewed", "shortlisted", "interview_scheduled", "selected", "placed", "rejected"];
    const funnel: Record<string, number> = {};
    for (const k of funnelKeys) funnel[k] = 0;
    for (const r of allApps) {
      const s = r.application.status || "submitted";
      funnel[s] = (funnel[s] || 0) + 1;
    }

    // Placements + average time-to-placement
    const myPlacements = jobIds.length === 0 ? [] : await db
      .select({ p: placements, a: applications })
      .from(placements)
      .innerJoin(applications, eq(placements.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(user.role === "agent" ? eq(jobs.agentId, user.id) : user.role === "employer" ? eq(jobs.employerId, user.id) : undefined as any);

    const timesToPlaceMs: number[] = myPlacements
      .filter((r: any) => r.p.status === "accepted" || r.p.status === "active" || r.p.status === "completed")
      .map((r: any) => {
        const applied = r.a.appliedAt ? new Date(r.a.appliedAt).getTime() : 0;
        const placed = r.p.startDate ? new Date(r.p.startDate).getTime() : Date.now();
        return placed - applied;
      })
      .filter((n: number) => n > 0);
    const avgTimeToPlaceDays = timesToPlaceMs.length
      ? Math.round((timesToPlaceMs.reduce((s: number, n: number) => s + n, 0) / timesToPlaceMs.length) / 86400_000)
      : 0;

    // Conversion: submitted → placed
    const conversionPct = funnel.submitted + funnel.reviewed + funnel.shortlisted + funnel.interview_scheduled + funnel.selected + funnel.placed > 0
      ? Math.round((funnel.placed / (funnel.submitted + funnel.reviewed + funnel.shortlisted + funnel.interview_scheduled + funnel.selected + funnel.placed + funnel.rejected)) * 100)
      : 0;

    // Top countries by placement
    const countryMap: Record<string, number> = {};
    for (const r of myPlacements) countryMap[r.p.country] = (countryMap[r.p.country] || 0) + 1;
    const topCountries = Object.entries(countryMap).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    // Monthly applications for trend
    const byMonth: Record<string, number> = {};
    for (const r of allApps) {
      const d = r.application.appliedAt ? new Date(r.application.appliedAt) : null;
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    }
    const trend = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, count]) => ({ month, count }));

    res.json({
      success: true,
      data: {
        jobs: { total: myJobs.length, active: myJobs.filter((j: any) => j.status === "active").length },
        applicants: { total: allApps.length, funnel, conversionPct },
        placements: { total: myPlacements.length, avgTimeToPlaceDays, topCountries },
        trend,
      },
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────
// Sprint 2 / PWS §3 + §7 — Requisition pool + pick-up
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/agent/requisitions
 * Lists open employer requisitions visible to the current agent, respecting
 * the system-wide pairing mode and per-requisition pin.
 */
router.get("/requisitions", async (req, res, next) => {
  try {
    const userRole = (req.user as any)?.role;
    const userId = (req.user as any)?.id;
    if (userRole !== "agent" && userRole !== "admin" && userRole !== "superadmin") {
      return res.status(403).json({ success: false, error: { code: 403, message: "Agents only" } });
    }
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const pairingMode = await getSetting<string>("requisition.pairing_mode");
    const conditions: any[] = [
      eq(jobs.visibility, "agents_only"),
      eq(jobs.status, "active"),
    ];

    // In pinned_only mode, an agent sees a requisition only if pinned to them.
    // In open mode, agents see reqs with no pin OR pinned to them.
    if (userRole === "agent") {
      if (pairingMode === "pinned_only") {
        conditions.push(eq(jobs.pinnedAgentId, userId));
      } else {
        conditions.push(or(isNull(jobs.pinnedAgentId), eq(jobs.pinnedAgentId, userId))!);
      }
    }
    // admin / superadmin see all agents_only reqs without ownership filter.

    const rows = await db.select().from(jobs).where(and(...conditions)).orderBy(desc(jobs.createdAt));

    // Annotate each requisition with whether the current agent has already
    // picked it up. Lets the UI grey out / relabel the Pick Up button so
    // users don't think a second click will do something new.
    let pickedUpMap: Record<string, string> = {};
    if (userRole === "agent" && rows.length > 0) {
      const reqIds = rows.map((r: any) => r.id);
      const existing = await db.select({ id: jobs.id, parent: jobs.parentRequisitionId })
        .from(jobs)
        .where(and(eq(jobs.agentId, userId), inArray(jobs.parentRequisitionId, reqIds)));
      for (const e of existing as any[]) pickedUpMap[e.parent] = e.id;
    }
    const annotated = rows.map((r: any) => ({
      ...r,
      pickedUpByMe: !!pickedUpMap[r.id],
      myDerivativeJobId: pickedUpMap[r.id] ?? null,
    }));
    res.json({ success: true, data: annotated, pairingMode });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/agent/applicants
 *
 * Aggregate "all my applicants" across every job the agent owns. The existing
 * per-job endpoint (/jobs/:id/applicants) forces the agent to click each job
 * separately to see who's where; agents with N open requisitions had no
 * single-pane view. Mirrors /employer/review-queue in spirit but scoped to
 * agent-owned jobs and unfiltered by status so the UI can group / chip as it
 * wants.
 */
router.get("/applicants", async (req, res, next) => {
  try {
    const userRole = (req.user as any)?.role;
    const userId = (req.user as any)?.id;
    if (userRole !== "agent" && userRole !== "admin" && userRole !== "superadmin") {
      return res.status(403).json({ success: false, error: { code: 403, message: "Agents only" } });
    }
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });

    // All jobs the agent owns (derivative + direct agent-posted). Pull company
    // + priority too so the UI can filter by those dimensions without a second
    // round-trip.
    const myJobs = await db.select({
      id: jobs.id, title: jobs.title, country: jobs.country,
      company: jobs.company, priority: jobs.priority,
    }).from(jobs).where(eq(jobs.agentId, userId));
    if (myJobs.length === 0) {
      return res.json({ success: true, data: [], jobCount: 0 });
    }
    const jobIds = myJobs.map((j: any) => j.id);
    const jobMeta: Record<string, { title: string; country: string | null; company: string | null; priority: string | null }> = {};
    for (const j of myJobs as any[]) jobMeta[j.id] = { title: j.title, country: j.country, company: j.company, priority: j.priority };

    const rows = await db
      .select({ application: applications, candidate: candidates })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(inArray(applications.jobId, jobIds))
      .orderBy(desc(applications.appliedAt));

    // Time-in-stage derivation (same as per-job endpoint).
    const appIds = rows.map((r: any) => r.application.id);
    const stageEntries: Record<string, Date> = {};
    if (appIds.length > 0) {
      const auditRows = await db
        .select({ resourceId: auditLog.resourceId, createdAt: auditLog.createdAt })
        .from(auditLog)
        .where(and(
          eq(auditLog.action, "application.status_change"),
          inArray(auditLog.resourceId, appIds),
        ))
        .orderBy(desc(auditLog.createdAt));
      for (const ar of auditRows as any[]) {
        if (!stageEntries[ar.resourceId]) stageEntries[ar.resourceId] = new Date(ar.createdAt);
      }
    }

    const applicants = rows.map((r: any) => {
      const stageEnteredAt = stageEntries[r.application.id] ?? r.application.appliedAt;
      const daysInStage = stageEnteredAt ? Math.floor((Date.now() - new Date(stageEnteredAt).getTime()) / 86_400_000) : null;
      const jm = jobMeta[r.application.jobId] ?? { title: "(unknown job)", country: null, company: null, priority: null };
      return {
        applicationId: r.application.id,
        status: r.application.status,
        matchScore: r.application.matchScore,
        appliedAt: r.application.appliedAt,
        stageEnteredAt,
        daysInStage,
        jobId: r.application.jobId,
        jobTitle: jm.title,
        jobCountry: jm.country,
        jobCompany: jm.company,
        jobPriority: jm.priority,
        candidate: {
          id: r.candidate.id,
          fullName: r.candidate.fullName,
          email: r.candidate.email,
          phone: r.candidate.phone,
          location: r.candidate.location,
          experience: r.candidate.experience,
          skills: r.candidate.skills,
          photoUrl: r.candidate.photoUrl,
        },
      };
    });

    res.json({ success: true, data: applicants, total: applicants.length, jobCount: myJobs.length });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/agent/requisitions/:id/pickup
 * Creates a derivative agent job linked to the employer requisition.
 * Inherits title/company/location/country/description/skills but sets
 * agentId=self, visibility=public, parentRequisitionId=<req.id>.
 */
router.post("/requisitions/:id/pickup", async (req, res, next) => {
  try {
    const userRole = (req.user as any)?.role;
    const userId = (req.user as any)?.id;
    if (userRole !== "agent") {
      return res.status(403).json({ success: false, error: { code: 403, message: "Only agents can pick up requisitions" } });
    }
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    // Agent must be a verified agency
    const [agency] = await db.select().from(recruitmentAgents).where(eq(recruitmentAgents.userId, userId)).limit(1);
    if (!agency || !agency.verified) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Only verified agencies can pick up requisitions" } });
    }

    const [req0] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!req0) return res.status(404).json({ success: false, error: { code: 404, message: "Requisition not found" } });
    if (req0.visibility !== "agents_only") {
      return res.status(400).json({ success: false, error: { code: 400, message: "Not an employer requisition" } });
    }
    if (req0.status !== "active") {
      return res.status(400).json({ success: false, error: { code: 400, message: "Requisition is not active" } });
    }

    // Pairing-mode enforcement
    const pairingMode = await getSetting<string>("requisition.pairing_mode");
    if (pairingMode === "pinned_only" && req0.pinnedAgentId !== userId) {
      return res.status(403).json({ success: false, error: { code: 403, message: "This requisition is pinned to another agent" } });
    }
    if (req0.pinnedAgentId && req0.pinnedAgentId !== userId) {
      return res.status(403).json({ success: false, error: { code: 403, message: "This requisition is pinned to another agent" } });
    }

    // Prevent duplicate pickup by same agent
    const [existing] = await db.select().from(jobs)
      .where(and(eq(jobs.parentRequisitionId, req0.id), eq(jobs.agentId, userId))).limit(1);
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 409, message: "You already picked up this requisition", existingJobId: existing.id } });
    }

    const [derivative] = await db.insert(jobs).values({
      title: req0.title,
      company: req0.company,
      location: req0.location,
      country: req0.country,
      salary: req0.salary,
      description: req0.description,
      requirements: req0.requirements,
      skills: req0.skills,
      experience: req0.experience,
      targetHires: req0.targetHires,
      hiringDeadline: req0.hiringDeadline,
      priority: req0.priority,
      agentId: userId,
      parentRequisitionId: req0.id,
      visibility: "public",
      status: "active",
    }).returning();

    // PWS §5 — fire event so the employer knows their req was picked up
    try {
      const { fireEvent } = await import("../services/event-notifications.service");
      const { employers } = await import("@shared/schema");
      const [emp] = req0.employerId
        ? await db.select().from(employers).where(eq(employers.userId, req0.employerId)).limit(1)
        : [];
      await fireEvent("requisition.picked_up", {
        job: req0,
        agent: { id: agency.id, userId: userId, agencyName: agency.agencyName },
        employer: emp ? { id: emp.id, userId: emp.userId!, companyName: emp.companyName } : undefined,
        actorUserId: userId,
        actorRole: "agent",
      });
    } catch (e: any) { logger.warn(`fireEvent(requisition.picked_up) failed: ${e?.message}`); }

    logger.info(`Requisition ${req0.id} picked up by agent ${userId} → derivative ${derivative.id}`);

    // Auto-match candidates against the newly public derivative (non-blocking)
    try {
      const { fireAutoMatchForJob } = await import("../services/auto-match.service");
      fireAutoMatchForJob(derivative).catch(() => {});
    } catch {}

    res.status(201).json({ success: true, data: derivative });
  } catch (err) { next(err); }
});

// ── Per-agent candidate tags (private to the agent) ──────────────────
// GET returns the current agent's tags for this candidate.
router.get("/candidates/:id/tags", async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!["agent", "admin", "superadmin"].includes(user.role)) return res.status(403).json({ success: false });
    const { candidateAgentTags } = await import("@shared/schema");
    const { and } = await import("drizzle-orm");
    const rows = await storage.db!.select().from(candidateAgentTags)
      .where(and(eq(candidateAgentTags.candidateId, req.params.id), eq(candidateAgentTags.agentUserId, user.id)));
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post("/candidates/:id/tags", async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (user.role !== "agent") return res.status(403).json({ success: false });
    const tag = String(req.body?.tag ?? "").trim().toLowerCase().slice(0, 40);
    if (!tag || !/^[a-z0-9][a-z0-9-]*$/.test(tag)) {
      return res.status(400).json({ success: false, message: "Tag must be a short slug: letters, digits, dashes." });
    }
    const { candidateAgentTags } = await import("@shared/schema");
    // Dedupe via unique constraint — ignore the duplicate case.
    try {
      const [row] = await storage.db!.insert(candidateAgentTags).values({
        candidateId: req.params.id, agentUserId: user.id, tag,
      }).returning();
      res.json({ success: true, data: row });
    } catch (e: any) {
      if (String(e?.code) === "23505") return res.json({ success: true, deduped: true });
      throw e;
    }
  } catch (err) { next(err); }
});

router.delete("/candidates/:id/tags/:tagId", async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (user.role !== "agent") return res.status(403).json({ success: false });
    const { candidateAgentTags } = await import("@shared/schema");
    const { and } = await import("drizzle-orm");
    await storage.db!.delete(candidateAgentTags)
      .where(and(
        eq(candidateAgentTags.id, req.params.tagId),
        eq(candidateAgentTags.agentUserId, user.id),
      ));
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
