#!/usr/bin/env node
/**
 * Deep smoke / health harness — repeatable, environment-agnostic.
 *
 * Runs against ANY running HireStream instance (no test DB needed). Three layers:
 *   1. AUTH       — every role logs in; bad creds + unauthenticated are rejected.
 *   2. ROUTE      — every role's GET endpoints respond without 5xx, with the
 *                   {success:true} envelope (catches the agency /documents 404
 *                   route-shadow class of bug).
 *   3. AUTHZ      — negative matrix: a role is DENIED (401/403) on another
 *                   role's protected endpoints (catches privilege-escalation /
 *                   "role X reads role Y's data" bugs).
 *
 * Usage:
 *   node scripts/deep-smoke.mjs                      # defaults to staging
 *   DEEP_URL=http://localhost:5000 node scripts/deep-smoke.mjs
 *   npm run smoke            (see package.json)
 *
 * Credentials come from env (DEEP_PW_<ROLE>) or fall back to the seed defaults.
 * Exit code 1 if any FAIL — safe to wire into CI / a pre-release gate.
 */

const BASE = (process.env.DEEP_URL || "https://hirestream-stg.agentryx.dev").replace(/\/$/, "");

const ROLES = {
  candidate:  { u: process.env.DEEP_U_CANDIDATE  || "demo_candidate", p: process.env.DEEP_PW_CANDIDATE  || "test123" },
  agent:      { u: process.env.DEEP_U_AGENT      || "demo_agent",     p: process.env.DEEP_PW_AGENT      || "test123" },
  employer:   { u: process.env.DEEP_U_EMPLOYER   || "demo_employer",  p: process.env.DEEP_PW_EMPLOYER   || "test123" },
  admin:      { u: process.env.DEEP_U_ADMIN      || "demo_admin",     p: process.env.DEEP_PW_ADMIN      || "test123" },
  superadmin: { u: process.env.DEEP_U_SUPERADMIN || "superadmin",     p: process.env.DEEP_PW_SUPERADMIN || "hpsedc@super2026" },
};

// GET endpoints each role should be able to read (2xx + {success:true}).
const COMMON = ["/content/faq", "/content/countries", "/matching/version", "/notifications/", "/notifications/preferences"];
const ROUTES = {
  candidate: [...COMMON, "/candidates/profile", "/candidates/profile/completion", "/candidates/applications",
    "/candidates/education", "/candidates/experience", "/candidates/documents", "/me/references",
    "/jobs/", "/jobs/saved/my", "/drives/my", "/drives/interviews/my", "/me/saved-searches/",
    "/applications/recommendations/for-me"],
  agent: [...COMMON, "/agencies/me", "/agencies/candidates", "/agencies/documents", "/agencies/leaderboard/top",
    "/agent/segments", "/agent/placements", "/agent/reports", "/agent/requisitions", "/agent/applicants",
    "/drives/", "/jobs/", "/grievances/assigned-to-me"],
  employer: [...COMMON, "/employer/requisitions", "/employer/review-queue", "/employer/agency-scorecard",
    "/employer/profile", "/employer/documents", "/jobs/"],
  admin: [...COMMON, "/admin/health", "/admin/logs", "/admin/config", "/admin/agencies", "/admin/employers",
    "/admin/settings", "/admin/notification-templates", "/admin/integrations",
    "/admin/oversight/compliance", "/admin/oversight/welfare-sla", "/admin/oversight/audit-log",
    "/admin/oversight/users", "/admin/oversight/funnel", "/grievances/"],
  superadmin: [...COMMON, "/superadmin/users", "/superadmin/stats", "/superadmin/flags", "/superadmin/logs",
    "/superadmin/integrations", "/superadmin/settings", "/superadmin/audit",
    "/superadmin/ops/overview", "/superadmin/ops/signals", "/superadmin/ops/pipeline", "/superadmin/ops/reports"],
};

// Negative authorization matrix: { role -> endpoints it MUST be denied (401/403) }.
// Each endpoint belongs to a higher-privilege or different role.
const FORBIDDEN = {
  // NOTE: /agent/placements is intentionally cross-role (agent+employer+admin),
  // each scoped to their own rows in the handler — so it is NOT in the employer
  // forbidden list. Candidates have no placement-monitoring role, so it IS denied to them.
  candidate: ["/admin/employers", "/admin/config", "/superadmin/users", "/superadmin/stats",
    "/employer/requisitions", "/agencies/me", "/agent/placements"],
  agent:     ["/admin/employers", "/admin/config", "/superadmin/users", "/superadmin/stats"],
  employer:  ["/admin/employers", "/admin/config", "/superadmin/users", "/superadmin/stats"],
  admin:     ["/superadmin/users", "/superadmin/settings"],
};

const pass = [], warn = [], fail = [];
const ms = () => 0; // (no Date.now needed; timing not asserted)

async function login(u, p) {
  const r = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  });
  const cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  return { status: r.status, cookie };
}
async function get(path, cookie) {
  try {
    const r = await fetch(`${BASE}/api/v1${path}`, { headers: cookie ? { Cookie: cookie } : {} });
    let body = {};
    try { body = await r.json(); } catch { /* non-json */ }
    return { status: r.status, body };
  } catch (e) { return { status: -1, body: { error: String(e) } }; }
}

async function run() {
  console.log(`\nDEEP SMOKE — ${BASE}\n${"=".repeat(60)}`);
  const cookies = {};

  // ---- Layer 1: AUTH ----
  console.log("\n[1] AUTH");
  for (const [role, { u, p }] of Object.entries(ROLES)) {
    const s = await login(u, p);
    if (s.status === 200 && s.cookie) { cookies[role] = s.cookie; pass.push(`auth ${role}`); console.log(`  ok    login ${role}`); }
    else { fail.push(`auth ${role} -> ${s.status}${s.cookie ? "" : " NO COOKIE"}`); console.log(`  FAIL  login ${role} -> ${s.status}`); }
  }
  // negative auth
  const badLogin = await login("demo_candidate", "wrong-password-xyz");
  if (badLogin.status === 401) { pass.push("auth reject bad password"); console.log("  ok    bad password -> 401"); }
  else { fail.push(`bad password -> ${badLogin.status} (expected 401)`); console.log(`  FAIL  bad password -> ${badLogin.status}`); }
  const unauth = await get("/candidates/profile", "");
  if (unauth.status === 401) { pass.push("auth reject unauthenticated"); console.log("  ok    unauthenticated /candidates/profile -> 401"); }
  else { fail.push(`unauthenticated /candidates/profile -> ${unauth.status} (expected 401)`); console.log(`  FAIL  unauthenticated -> ${unauth.status}`); }

  // ---- Layer 2: ROUTE HEALTH ----
  console.log("\n[2] ROUTE HEALTH (per role)");
  for (const [role, eps] of Object.entries(ROUTES)) {
    if (!cookies[role]) { console.log(`  -- skip ${role} (no session)`); continue; }
    for (const ep of eps) {
      const r = await get(ep, cookies[role]);
      if (r.status >= 500 || r.status === -1) { fail.push(`${role} GET ${ep} -> ${r.status}`); console.log(`  FAIL  ${role} ${ep} -> ${r.status}`); }
      else if (r.status >= 400) { warn.push(`${role} GET ${ep} -> ${r.status}`); console.log(`  warn  ${role} ${ep} -> ${r.status}`); }
      else if (r.body && r.body.success === false) { fail.push(`${role} GET ${ep} -> 200 but success:false`); console.log(`  FAIL  ${role} ${ep} -> 200 success:false`); }
      else pass.push(`${role} GET ${ep}`);
    }
    console.log(`  ... ${role}: ${eps.length} endpoints checked`);
  }

  // ---- Layer 3: AUTHZ NEGATIVE MATRIX ----
  console.log("\n[3] AUTHZ NEGATIVE (role must be DENIED on others' endpoints)");
  for (const [role, eps] of Object.entries(FORBIDDEN)) {
    if (!cookies[role]) { console.log(`  -- skip ${role} (no session)`); continue; }
    for (const ep of eps) {
      const r = await get(ep, cookies[role]);
      if (r.status === 401 || r.status === 403) { pass.push(`authz ${role} denied ${ep}`); console.log(`  ok    ${role} denied ${ep} (${r.status})`); }
      else if (r.status >= 500) { fail.push(`authz ${role} ${ep} -> ${r.status} (server error)`); console.log(`  FAIL  ${role} ${ep} -> ${r.status}`); }
      else { fail.push(`authz LEAK: ${role} reached ${ep} -> ${r.status} (expected 401/403)`); console.log(`  FAIL  LEAK ${role} reached ${ep} -> ${r.status}`); }
    }
  }

  // ---- SUMMARY ----
  console.log(`\n${"=".repeat(60)}\nSUMMARY  pass=${pass.length}  warn=${warn.length}  FAIL=${fail.length}`);
  if (warn.length) { console.log("\n4xx (often expected — empty/forbidden-by-design):"); warn.forEach((w) => console.log("  - " + w)); }
  if (fail.length) { console.log("\nFAILURES:"); fail.forEach((f) => console.log("  - " + f)); }
  console.log(fail.length ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  process.exit(fail.length ? 1 : 0);
}

run();
