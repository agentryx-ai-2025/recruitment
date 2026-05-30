#!/usr/bin/env node
/**
 * Deep smoke / health harness — repeatable, environment-agnostic.
 *
 * Runs against ANY running Agentryx Verify instance. Three layers:
 *   1. AUTH       — every role logs in; bad creds + unauthenticated are rejected.
 *   2. ROUTE      — every role's GET endpoints respond without 5xx.
 *   3. AUTHZ      — negative matrix: a role is DENIED (401/403) on another
 *                   role's protected endpoints.
 *
 * Usage:
 *   node scripts/deep-smoke.mjs
 *   DEEP_URL=http://localhost:5000 node scripts/deep-smoke.mjs
 *   npm run smoke
 *
 * Exit code 1 if any FAIL.
 */

const BASE = (process.env.DEEP_URL || "https://verify-stg.agentryx.dev").replace(/\/$/, "");

const ROLES = {
  admin:          { u: process.env.DEEP_U_ADMIN          || "admin",    p: process.env.DEEP_PW_ADMIN          || "admin" },
  agentryx:       { u: process.env.DEEP_U_AGENTRYX       || "agentryx", p: process.env.DEEP_PW_AGENTRYX       || "ulan" },
  htis:           { u: process.env.DEEP_U_HTIS           || "htis",     p: process.env.DEEP_PW_HTIS           || "test123" },
  hpsedc_staging: { u: process.env.DEEP_U_HPSEDC_STAGING || "hpsedc",   p: process.env.DEEP_PW_HPSEDC_STAGING || "test456" },
  hpsedc_final:   { u: process.env.DEEP_U_HPSEDC_FINAL   || "uat",      p: process.env.DEEP_PW_HPSEDC_FINAL   || "test789" },
};

// A route is allowed for a role if the path (without /api) matches any of their allowlist regexes.
const ROLE_ALLOWLIST = {
  common: [
    /^\/auth\/.*/,
    /^\/__routes/
  ],
  admin: [
    /^\/projects\/.*/,
    /^\/feedback\/.*/,
    /^\/sprints\/.*/,
    /^\/export\/.*/
  ],
  agentryx: [
    /^\/projects\/.*/,
    /^\/feedback\/.*/,
    /^\/sprints\/.*/,
    /^\/export\/.*/
  ],
  htis: [
    /^\/projects\/.*/,
    /^\/feedback\/.*/,
    /^\/sprints\/.*/,
    /^\/export\/.*/
  ],
  hpsedc_staging: [
    /^\/projects\/.*/,
    /^\/feedback\/.*/,
    /^\/sprints\/.*/,
    /^\/export\/.*/
  ],
  hpsedc_final: [
    /^\/projects\/.*/,
    /^\/feedback\/.*/,
    /^\/sprints\/.*/,
    /^\/export\/.*/
  ]
};

const pass = [], warn = [], fail = [];

async function login(u, p) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  });
  const cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  return { status: r.status, cookie };
}
async function get(path, cookie) {
  try {
    const r = await fetch(`${BASE}/api${path}`, { headers: cookie ? { Cookie: cookie } : {} });
    let body = {};
    try { body = await r.json(); } catch { /* non-json */ }
    return { status: r.status, body };
  } catch (e) { return { status: -1, body: { error: String(e) } }; }
}

async function run() {
  console.log(`\nDEEP SMOKE — ${BASE}\n${"=".repeat(60)}`);
  const cookies = {};

  console.log("\n[1] AUTH");
  for (const [role, { u, p }] of Object.entries(ROLES)) {
    const s = await login(u, p);
    if (s.status === 200 && s.cookie) { cookies[role] = s.cookie; pass.push(`auth ${role}`); console.log(`  ok    login ${role}`); }
    else { fail.push(`auth ${role} -> ${s.status}${s.cookie ? "" : " NO COOKIE"}`); console.log(`  FAIL  login ${role} -> ${s.status}`); }
  }
  const badLogin = await login("htis", "wrong-password-xyz");
  if (badLogin.status === 401) { pass.push("auth reject bad password"); console.log("  ok    bad password -> 401"); }
  else { fail.push(`bad password -> ${badLogin.status} (expected 401)`); console.log(`  FAIL  bad password -> ${badLogin.status}`); }
  const unauth = await get("/projects", "");
  if (unauth.status === 401) { pass.push("auth reject unauthenticated"); console.log("  ok    unauthenticated /projects -> 401"); }
  else { fail.push(`unauthenticated /projects -> ${unauth.status} (expected 401)`); console.log(`  FAIL  unauthenticated -> ${unauth.status}`); }

  let discoveredRoutes = [];
  try {
    const adminToken = process.env.DEEP_SMOKE_TOKEN || "test123";
    const res = await fetch(`${BASE}/api/__routes`, { headers: { "X-Deep-Smoke-Token": adminToken } });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      discoveredRoutes = json.data.map(r => r.path.replace(/^\/api/, ""));
    } else {
      fail.push(`Route autodiscovery failed: ${res.status}`);
      console.log(`\nFAIL  __routes -> ${res.status} ${JSON.stringify(json)}`);
    }
  } catch (e) {
    fail.push(`Route autodiscovery error: ${e.message}`);
    console.log(`\nFAIL  __routes -> ${e.message}`);
  }

  const layer2Logs = [];
  const layer3Logs = [];
  
  for (const role of Object.keys(ROLES)) {
    if (!cookies[role]) { 
      layer2Logs.push(`  -- skip ${role} (no session)`); 
      layer3Logs.push(`  -- skip ${role} (no session)`); 
      continue; 
    }
    const allowlist = (ROLE_ALLOWLIST[role] || []).concat(ROLE_ALLOWLIST.common || []);
    let matchCount = 0;
    
    for (const ep of discoveredRoutes) {
      const isMatch = allowlist.some(re => re.test(ep));
      const r = await get(ep, cookies[role]);

      if (isMatch) {
        matchCount++;
        if (r.status >= 500 || r.status === -1) { fail.push(`${role} GET ${ep} -> ${r.status}`); layer2Logs.push(`  FAIL  ${role} ${ep} -> ${r.status}`); }
        else if (r.status >= 400) { warn.push(`${role} GET ${ep} -> ${r.status}`); layer2Logs.push(`  warn  ${role} ${ep} -> ${r.status}`); }
        else if (r.body && r.body.success === false) { fail.push(`${role} GET ${ep} -> 200 but success:false`); layer2Logs.push(`  FAIL  ${role} ${ep} -> 200 success:false`); }
        else { pass.push(`${role} GET ${ep}`); layer2Logs.push(`  ok    ${role} GET ${ep}`); }
      } else {
        if (r.status === 401 || r.status === 403) { pass.push(`authz ${role} denied ${ep}`); layer3Logs.push(`  ok    ${role} denied ${ep} (${r.status})`); }
        else if (r.status >= 500) { fail.push(`authz ${role} ${ep} -> ${r.status} (server error)`); layer3Logs.push(`  FAIL  ${role} ${ep} -> ${r.status}`); }
        else { fail.push(`authz LEAK: ${role} reached ${ep} -> ${r.status} (expected 401/403)`); layer3Logs.push(`  FAIL  LEAK ${role} reached ${ep} -> ${r.status}`); }
      }
    }
    layer2Logs.push(`  ... ${role}: ${matchCount} endpoints checked`);
  }

  console.log("\n[2] ROUTE HEALTH (per role)");
  layer2Logs.forEach(l => { if (!l.startsWith("  ok")) console.log(l); });

  console.log("\n[3] AUTHZ NEGATIVE (role must be DENIED on others' endpoints)");
  layer3Logs.forEach(l => { if (!l.startsWith("  --")) console.log(l); });

  console.log(`\n${"=".repeat(60)}\nSUMMARY  pass=${pass.length}  warn=${warn.length}  FAIL=${fail.length}`);
  if (warn.length) { console.log("\n4xx (often expected — empty/forbidden-by-design):"); warn.forEach((w) => console.log("  - " + w)); }
  if (fail.length) { console.log("\nFAILURES:"); fail.forEach((f) => console.log("  - " + f)); }
  console.log(fail.length ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  process.exit(fail.length ? 1 : 0);
}

run();
