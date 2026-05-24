import { Router } from "express";
import { db } from "../config/db";
import { reviewers, magicLinks, projects, projectReviewers, auditLog } from "@shared/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

export const authRouter = Router();

// Username-or-email + password login.
authRouter.post("/login", async (req, res) => {
  const { username, email, password } = req.body ?? {};
  const identifier = String(username ?? email ?? "").toLowerCase().trim();
  if (!identifier || !password) return res.status(400).json({ error: "username and password required" });
  const looksLikeEmail = identifier.includes("@");
  const [r] = await db.select().from(reviewers).where(
    looksLikeEmail ? eq(reviewers.email, identifier) : eq(reviewers.username, identifier)
  );
  if (!r || !r.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, r.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  req.session.reviewerId = r.id;
  await db.insert(auditLog).values({ reviewerId: r.id, action: "auth.login", meta: { method: "password" } });
  res.json({ ok: true, reviewer: { id: r.id, username: r.username, email: r.email, name: r.name, role: r.role, organization: r.organization } });
});

// POST /api/auth/request-link  { email, projectSlug? }
// Returns the magic link in dev (no SMTP). In prod, emails it.
authRouter.post("/request-link", async (req, res) => {
  const { email, projectSlug } = req.body ?? {};
  if (!email) return res.status(400).json({ error: "email required" });

  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.email, email));
  if (!reviewer) return res.status(404).json({ error: "Reviewer not registered" });

  let projectId: string | undefined;
  if (projectSlug) {
    const [p] = await db.select().from(projects).where(eq(projects.slug, projectSlug));
    if (p) projectId = p.id;
  }

  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await db.insert(magicLinks).values({ token, reviewerId: reviewer.id, projectId, expiresAt });

  const link = `${env.APP_URL}/auth/consume?token=${token}${projectSlug ? `&p=${projectSlug}` : ""}`;

  // TODO: send email when SMTP is configured. For now, return the link.
  res.json({ ok: true, link, devOnly: !env.SMTP_HOST });
});

// GET /auth/consume?token=...
authRouter.get("/consume", async (req, res) => {
  const token = String(req.query.token ?? "");
  if (!token) return res.status(400).send("Missing token");

  const [link] = await db.select().from(magicLinks).where(
    and(eq(magicLinks.token, token), gt(magicLinks.expiresAt, new Date()), isNull(magicLinks.consumedAt))
  );
  if (!link) return res.status(401).send("Invalid or expired link");

  await db.update(magicLinks).set({ consumedAt: new Date() }).where(eq(magicLinks.id, link.id));

  req.session.reviewerId = link.reviewerId;
  req.session.projectId = link.projectId ?? undefined;

  await db.insert(auditLog).values({
    projectId: link.projectId,
    reviewerId: link.reviewerId,
    action: "auth.login",
    meta: { method: "magic_link" },
  });

  // Redirect to project page if we know it
  const slug = String(req.query.p ?? "");
  res.redirect(slug ? `/p/${slug}` : "/");
});

// POST /api/auth/logout
authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me — returns the current reviewer minus the password hash.
// The hash should never reach the browser even though it's bcrypted; this was
// a v0.2.0 leak fixed in v0.2.1.
authRouter.get("/me", async (req, res) => {
  if (!req.session.reviewerId) return res.json({ reviewer: null });
  const [r] = await db.select({
    id: reviewers.id,
    username: reviewers.username,
    email: reviewers.email,
    name: reviewers.name,
    organization: reviewers.organization,
    role: reviewers.role,
    createdAt: reviewers.createdAt,
  }).from(reviewers).where(eq(reviewers.id, req.session.reviewerId));
  res.json({ reviewer: r ?? null });
});

// Email-only login for seeded reviewers.
// Gated by ALLOW_EMAIL_LOGIN=true in production (low-stakes reviewer portal
// where the trust boundary is the reviewer's email having been pre-seeded).
// In dev, always available.
authRouter.post("/dev-login", async (req, res) => {
  const allowed = env.NODE_ENV !== "production" || env.ALLOW_EMAIL_LOGIN === "true";
  if (!allowed) return res.status(404).json({ error: "Not available" });
  const { email } = req.body ?? {};
  const [r] = await db.select().from(reviewers).where(eq(reviewers.email, email));
  if (!r) return res.status(404).json({ error: "No reviewer with that email" });
  req.session.reviewerId = r.id;
  res.json({ ok: true, reviewer: r });
});
