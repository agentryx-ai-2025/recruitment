import { Router } from "express";
import { db } from "../config/db";
import { projects, requirements, signoffs, reviewers } from "@shared/schema";
import { and, asc, eq } from "drizzle-orm";
import PDFDocument from "pdfkit";

export const exportRouter = Router();

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

exportRouter.get("/projects/:slug/csv", async (req, res) => {
  const [project] = await db.select().from(projects).where(eq(projects.slug, req.params.slug));
  if (!project) return res.status(404).json({ error: "Not found" });

  const reqs = await db.select().from(requirements)
    .where(eq(requirements.projectId, project.id))
    .orderBy(asc(requirements.section), asc(requirements.sortOrder));

  const sos = await db.select({
    requirementId: signoffs.requirementId, level: signoffs.level, decision: signoffs.decision,
    comment: signoffs.comment, signedAt: signoffs.signedAt,
    reviewerName: reviewers.name, reviewerOrg: reviewers.organization,
  }).from(signoffs).leftJoin(reviewers, eq(reviewers.id, signoffs.reviewerId));

  const byReq = new Map<string, Record<string, any>>();
  for (const s of sos) {
    if (!byReq.has(s.requirementId)) byReq.set(s.requirementId, {});
    byReq.get(s.requirementId)![s.level] = s;
  }

  const header = [
    "ID", "Section", "Section Title", "Requirement", "Status", "Evidence",
    "Agentryx Decision", "Agentryx Reviewer", "Agentryx Date",
    "HTIS Decision", "HTIS Reviewer", "HTIS Date",
    "STG Decision", "STG Reviewer", "STG Date",
    "Final Decision", "Final Reviewer", "Final Date",
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of reqs) {
    const m = byReq.get(r.id) || {};
    const a = m["agentryx"] || {}; const h = m["htis"] || {}; const s = m["hpsedc_staging"] || {}; const f = m["hpsedc_final"] || {};
    lines.push([
      r.itemRef, r.section, r.sectionTitle, r.description, r.status, r.evidence,
      a.decision, a.reviewerName, a.signedAt,
      h.decision, h.reviewerName, h.signedAt,
      s.decision, s.reviewerName, s.signedAt,
      f.decision, f.reviewerName, f.signedAt,
    ].map(csvEscape).join(","));
  }
  const fname = `${project.slug}-compliance-${new Date().toISOString().slice(0,10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
  res.send(lines.join("\n"));
});

exportRouter.get("/projects/:slug/pdf", async (req, res) => {
  const [project] = await db.select().from(projects).where(eq(projects.slug, req.params.slug));
  if (!project) return res.status(404).json({ error: "Not found" });

  const reqs = await db.select().from(requirements)
    .where(eq(requirements.projectId, project.id))
    .orderBy(asc(requirements.section), asc(requirements.sortOrder));

  const sos = await db.select().from(signoffs);
  const reqIds = new Set(reqs.map(r => r.id));
  const projectSignoffs = sos.filter(s => reqIds.has(s.requirementId));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition",
    `attachment; filename="${project.slug}-signoff-${new Date().toISOString().slice(0,10)}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  doc.fontSize(20).text("Agentryx Verify — Sign-Off Report", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(14).text(project.name);
  doc.fontSize(10).fillColor("#666")
     .text(`Build: ${project.buildRef}    Generated: ${new Date().toISOString()}`);
  doc.moveDown();
  doc.fillColor("#000");

  // Section grouping
  const bySection = new Map<number, typeof reqs>();
  for (const r of reqs) {
    if (!bySection.has(r.section)) bySection.set(r.section, [] as any);
    bySection.get(r.section)!.push(r);
  }

  const decisionGlyph = (d?: string) =>
    d === "accepted" ? "✓" : d === "rejected" ? "✗" : d === "waived" ? "~" : "·";

  for (const [secNum, items] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
    doc.moveDown(0.5).fontSize(13).fillColor("#1d2570")
       .text(`Section ${secNum}: ${items[0].sectionTitle}`);
    doc.fillColor("#000").fontSize(9);

    for (const r of items) {
      const so = projectSignoffs.filter(s => s.requirementId === r.id);
      const a = so.find(s => s.level === "agentryx");
      const h = so.find(s => s.level === "htis");
      const s = so.find(s => s.level === "hpsedc_staging");
      const f = so.find(s => s.level === "hpsedc_final");
      const line = `${r.itemRef.padEnd(6)} [${r.status[0].toUpperCase()}]  ${r.description.slice(0, 90)}`;
      doc.text(line, { continued: false });
      doc.fillColor("#888").text(
        `         AGX:${decisionGlyph(a?.decision)}  HTIS:${decisionGlyph(h?.decision)}  STG:${decisionGlyph(s?.decision)}  FINAL:${decisionGlyph(f?.decision)}`
      ).fillColor("#000");
    }
  }

  doc.end();
});
