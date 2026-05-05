import { Router } from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { format } from "date-fns";
import { getAllSettings, updateSetting } from "../services/settings.service";
import { storage } from "../storage";
import { users, auditLog } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sensitiveLimiter } from "../middleware/rateLimit.middleware";
import { logger } from "../config/logger.config";

const router = Router();

router.use((req, res, next) => {
  const user = req.user as any;
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
});

// GET /api/v1/admin/health
router.get("/health", async (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB"
    },
    version: process.env.npm_package_version || "1.0.0"
  });
});

// GET /api/v1/admin/logs
router.get("/logs", (req, res) => {
  try {
    const logPath = path.resolve(process.cwd(), "logs/app.log");
    if (!fs.existsSync(logPath)) {
      return res.json({ logs: [] });
    }
    
    // Quick read for demonstration - in production, we'd paginate or stream a large tail
    const logContent = fs.readFileSync(logPath, "utf-8");
    const logs = logContent
      .split("\n")
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .slice(-100); // Last 100 entries
      
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to read logs" });
  }
});

// GET /api/v1/admin/config
router.get("/config", (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    logLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
    // Don't expose secrets
    hasDatabase: !!process.env.DATABASE_URL,
    hasSessionSecret: !!process.env.SESSION_SECRET
  });
});

// GET /api/v1/admin/agencies - List all agencies (for admin approval workflow)
router.get("/agencies", async (req, res) => {
  try {
    const { storage } = await import("../storage");
    const { recruitmentAgents } = await import("@shared/schema");

    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

    const agencies = await storage.db.select().from(recruitmentAgents);
    res.json({ success: true, data: agencies });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch agencies" });
  }
});

// PATCH /api/v1/admin/agencies/:id/verify - Approve or reject an agency
router.patch("/agencies/:id/verify", async (req, res) => {
  try {
    const { storage } = await import("../storage");
    const { recruitmentAgents, notifications } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

    const { verified } = req.body;
    if (typeof verified !== "boolean") {
      return res.status(400).json({ success: false, message: "verified must be a boolean" });
    }

    const updated = await storage.db
      .update(recruitmentAgents)
      .set({ verified })
      .where(eq(recruitmentAgents.id, req.params.id))
      .returning();

    if (!updated || updated.length === 0) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    // M5: Notify the agent about the status change
    await storage.db.insert(notifications).values({
      userId: updated[0].userId, // Requires recruitmentAgents to have userId
      type: "agency_verified",
      title: verified ? "Agency Verified" : "Agency Verification Revoked",
      message: verified 
        ? "Congratulations! Your agency has been verified by HPSEDC. You can now post jobs."
        : "Your agency verification has been revoked by HPSEDC. Please contact support.",
      metadata: { agencyId: updated[0].id }
    });

    res.json({ success: true, data: updated[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update agency" });
  }
});

// ── System Settings (runtime configuration) ──────────────────────────
router.get("/settings", async (_req, res, next) => {
  try {
    const settings = await getAllSettings();
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

router.put("/settings/:key", async (req, res, next) => {
  try {
    const user = (req as any).user;
    const result = await updateSetting(req.params.key, req.body?.value, user?.id);
    if (!result.ok) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Job lifecycle (cron trigger, PWS §4) ─────────────────────────────
router.post("/lifecycle/run", async (_req, res, next) => {
  try {
    const { runJobLifecycleOnce } = await import("../services/job-lifecycle.service");
    const summary = await runJobLifecycleOnce();
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

// ── Notification templates (PWS §5) ──────────────────────────────────
import { notificationTemplates } from "@shared/schema";
import { storage } from "../storage";
import { and as _and, eq as _eq } from "drizzle-orm";

router.get("/notification-templates", async (_req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, message: "Database not available" });
    const rows = await db.select().from(notificationTemplates);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.put("/notification-templates/:eventKey/:recipientRole", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, message: "Database not available" });
    const { eventKey, recipientRole } = req.params;
    const body = req.body ?? {};
    // Guardrails: limit title/body length, validate role
    if (!["candidate", "agent", "employer"].includes(recipientRole)) {
      return res.status(400).json({ success: false, message: "Invalid recipient role" });
    }
    const update: any = { updatedAt: new Date() };
    if (typeof body.title === "string") update.title = String(body.title).slice(0, 200);
    if (typeof body.body === "string")  update.body  = String(body.body).slice(0, 2000);
    if (Array.isArray(body.channels))   update.channels = body.channels.filter((c: any) => typeof c === "string" && c.length <= 20).slice(0, 5);
    if (typeof body.hideEmployerName === "boolean") update.hideEmployerName = body.hideEmployerName;
    if (typeof body.enabled === "boolean") update.enabled = body.enabled;

    const result = await db.update(notificationTemplates)
      .set(update)
      .where(_and(_eq(notificationTemplates.eventKey, eventKey), _eq(notificationTemplates.recipientRole, recipientRole)))
      .returning();
    if (result.length === 0) return res.status(404).json({ success: false, message: "Template not found" });
    res.json({ success: true, data: result[0] });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════
// FRS §3.1 / §2.8 — Third-party integrations config (admin-editable)
// Lists and updates email / SMS / Aadhaar / HIM Access / DigiLocker.
// Secrets are encrypted at rest; API never returns raw secret values —
// only a flag indicating whether each secret field is set.
// ═══════════════════════════════════════════════════════════════════
router.get("/integrations", async (_req, res, next) => {
  try {
    const { listProvidersForAdmin, describeProviderFields, describeAllProviderFields } = await import("../services/provider-config.service");
    const rows = await listProvidersForAdmin();
    // `fields` is the schema for the CURRENTLY-SELECTED providerType (used by
    // the form on first paint); `fieldsByProviderType` is every provider's
    // schema so the UI can swap without a round-trip when the admin picks a
    // different Provider from the dropdown.
    const enriched = rows.map((r: any) => ({
      ...r,
      fields: describeProviderFields(r.id, r.providerType),
      fieldsByProviderType: describeAllProviderFields(r.id),
    }));
    res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
});

router.put("/integrations/:id", async (req, res, next) => {
  try {
    const { setProviderConfig } = await import("../services/provider-config.service");
    const id = req.params.id as any;
    if (!["email", "sms", "aadhaar", "himaccess", "digilocker"].includes(id)) {
      return res.status(400).json({ success: false, message: "Unknown integration id" });
    }
    const { providerType, enabled, config, secrets } = req.body ?? {};
    await setProviderConfig(id, {
      providerType: typeof providerType === "string" ? providerType : undefined,
      enabled: typeof enabled === "boolean" ? enabled : undefined,
      config: config && typeof config === "object" ? config : undefined,
      secrets: secrets && typeof secrets === "object" ? secrets : undefined,
    }, (req.user as any)?.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/integrations/:id/toggle
// Re-authenticated enable/disable. Exists as a separate endpoint (rather than
// reusing PUT) so the frontend can impose a second password prompt before a
// change with user-visible blast radius — disabling email kills password
// resets; enabling a misconfigured SMS gateway starts spamming on cost. The
// action is rate-limited with sensitiveLimiter to blunt brute-force guessing
// of the admin's password, and every call is written to audit_log with the
// from/to state + actor + IP regardless of outcome.
router.post("/integrations/:id/toggle", sensitiveLimiter, async (req, res, next) => {
  try {
    const id = req.params.id as any;
    if (!["email", "sms", "aadhaar", "himaccess", "digilocker"].includes(id)) {
      return res.status(400).json({ success: false, error: { code: 400, message: "Unknown integration id" } });
    }
    const { enabled, password } = req.body ?? {};
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ success: false, error: { code: 400, message: "enabled (boolean) is required" } });
    }
    if (!password || typeof password !== "string") {
      return res.status(400).json({ success: false, error: { code: 400, message: "password is required" } });
    }

    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = req.user as any;

    // Re-fetch the full user row so we have the password hash (req.user is a
    // projection that excludes it).
    const [fullUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!fullUser?.password) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Re-auth not available for this account" } });
    }

    const match = await bcrypt.compare(password, fullUser.password);
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";

    // Audit the attempt either way — a rejected password is interesting on its
    // own. If it passes, we add a second entry after the flip.
    await db.insert(auditLog).values({
      userId: user.id,
      action: match ? "integration.toggle.auth_ok" : "integration.toggle.auth_fail",
      resourceType: "integration",
      resourceId: id,
      details: { targetEnabled: enabled, ip },
      ipAddress: ip,
    });

    if (!match) {
      logger.warn(`integration.toggle auth failed for user=${user.id} id=${id}`);
      return res.status(401).json({ success: false, error: { code: 401, message: "Password incorrect — enabled state unchanged" } });
    }

    const { getProviderConfig, setProviderConfig } = await import("../services/provider-config.service");
    const before = await getProviderConfig(id);
    const wasEnabled = before?.enabled ?? false;

    // No-op if the requested state already matches — cheaper + clearer audit.
    if (wasEnabled === enabled) {
      return res.json({ success: true, data: { enabled, changed: false } });
    }

    await setProviderConfig(id, { enabled }, user.id);
    await db.insert(auditLog).values({
      userId: user.id,
      action: "integration.toggle.committed",
      resourceType: "integration",
      resourceId: id,
      details: { from: wasEnabled, to: enabled, ip },
      ipAddress: ip,
    });
    logger.info(`integration.toggle committed: ${id} ${wasEnabled} → ${enabled} by user ${user.id}`);
    res.json({ success: true, data: { enabled, changed: true } });
  } catch (err) { next(err); }
});

router.post("/integrations/:id/test", async (req, res, next) => {
  try {
    const id = req.params.id;
    const { recordTestResult } = await import("../services/provider-config.service");
    let result: { ok: boolean; error?: string };
    if (id === "email") {
      const { testEmailConnection } = await import("../services/email.service");
      // Optional `testEmail` body triggers a real send to that address;
      // omitting it keeps the legacy handshake-only smoke.
      const to = String(req.body?.testEmail || "").trim();
      result = await testEmailConnection(to || undefined);
    } else if (id === "sms") {
      const { testSmsConnection } = await import("../services/sms.service");
      const phone = String(req.body?.testPhone || "").trim();
      result = await testSmsConnection(phone);
    } else if (id === "aadhaar" || id === "himaccess" || id === "digilocker") {
      // These integrations require a real user flow (OAuth / eKYC consent) to
      // fully exercise. For now a test just verifies the config fields are
      // present so the admin gets immediate feedback on typos.
      const { getProviderConfig } = await import("../services/provider-config.service");
      const p = await getProviderConfig(id as any);
      if (!p?.enabled) result = { ok: false, error: "Integration is disabled." };
      else if (id === "aadhaar" && !p.config.endpoint) result = { ok: false, error: "Endpoint is required." };
      else if ((id === "himaccess" || id === "digilocker") && !p.config.clientId) result = { ok: false, error: "clientId is required." };
      else result = { ok: true };
    } else {
      return res.status(400).json({ success: false, message: "Unknown integration id" });
    }
    await recordTestResult(id as any, result.ok, result.error);
    // Forward `info` (e.g. "Sent to foo@bar.com (messageId ...)") so the UI
    // can show a useful success message instead of a bare green badge — the
    // admin needs to know WHERE the test mail went.
    res.json({
      success: result.ok,
      ...(result.error ? { error: { code: 400, message: result.error } } : {}),
      ...((result as any).info ? { info: (result as any).info } : {}),
    });
  } catch (err) { next(err); }
});

export default router;

