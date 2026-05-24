# 07 — Runbook (Incident Response)

**Purpose:** The 3-AM doc. When something is on fire in production, this is the file you open first. Every entry follows the same shape: **symptom → first check → likely cause → fix → verify**.

**Update protocol:** Append a new runbook entry the first time an incident occurs (don't wait for the second). After each real incident, refine the entry — if a step turned out to be wrong, fix it the next morning.

**Scope:** This runbook covers HPSEDC mobile (Android + iOS) and the mobile-facing backend surface. Web HireStream and Verify have their own incident handling — link out, don't duplicate.

---

## On-call essentials

| | |
|---|---|
| Primary on-call | TBD (Subhash by default until rotation defined) |
| Escalation | TBD |
| Pager channel | TBD |
| Status page | Reuse HireStream status if exists, else announce in HPSEDC channel |
| Sentry — Android | `hirestream-mobile-android` (not yet created — F0.4) |
| Sentry — iOS | `hirestream-mobile-ios` (not yet created) |
| Sentry — Backend | existing `hirestream-backend` |
| FCM console | TBD — link once project exists |
| Google Play Console | TBD — link once account exists |
| App Store Connect | TBD — link once enrolled |
| Backend pm2 | `~/Projects/Recruitment/hirestream` on staging VM `34.180.25.44`, pm2 id 0 |
| Database | Local Postgres on staging VM, `PGPASSWORD=hirestream psql -h localhost -U hirestream -d hirestream` |

---

## Incident severity matrix

| Sev | Definition | Response time | Examples |
|---|---|---|---|
| **SEV-1** | Service down or major data risk | Immediate | Login broken for all users; mass crash; PII leak; auth bypass |
| **SEV-2** | Significant degradation for many users | <1 hour | Push notifications not delivering; specific OEM (Xiaomi/OPPO) cohort broken; backend p95 latency >5s |
| **SEV-3** | Localised or non-blocking issue | <1 business day | Single screen crash on a niche device; cosmetic issue; non-critical analytics gap |

---

## Playbooks

### P1 · Mobile users can't log in

**Symptom:** Login screen returns "invalid credentials" or hangs; Sentry shows auth errors spike.

**First checks (in order):**
1. **Is the backend up?** `curl -i https://hirestream-stg.agentryx.dev/api/v1/health` (or prod equivalent). 2xx → backend OK.
2. **Are bearer tokens being rejected?** Check Sentry `hirestream-mobile-android` for `401 token_expired` or `invalid_token` cluster.
3. **Did `JWT_SECRET` rotate without `JWT_SECRET_PREVIOUS` being set?** Inspect `pm2 env 0` on the VM.
4. **Is the `session` table swelling abnormally?** `SELECT count(*) FROM session;` — should be in low thousands, not millions.
5. **Is rate limiting biting?** `authLimiter` on `/api/v1/auth` and `/api/v1/mobile/auth/login` — check redis/memory rate-limit store.

**Likely causes:**
- (a) JWT secret rotation without dual-key support → invalidates all live sessions instantly. **Fix:** restore the previous secret as `JWT_SECRET_PREVIOUS`, rebuild + restart.
- (b) Backend deployed with breaking change to `/mobile/auth/login` response shape → mobile client can't parse. **Fix:** roll back deploy, file a regression test.
- (c) Force-update kill switch activated unintentionally (`MOBILE_MIN_SUPPORTED_VERSION` raised) → mobile sees force-update screen. **Fix:** revert env var.
- (d) Single-session enforcement turned ON globally → web login kills mobile session. **Fix:** flip `auth.single_session_per_user` back OFF in admin settings; see HireStream v0.8.3 incident.

**Verify after fix:** real device login on Android + iOS; one TestFlight + one Play Store internal-track user reports success.

---

### P2 · Push notifications not delivering

**Symptom:** Users report no notifications; backend creates notification rows but devices stay silent.

**First checks:**
1. **Is FCM responding?** Backend log for `sendPushForNotification` — look for `messaging/registration-token-not-registered` or `messaging/server-error`.
2. **Are device tokens being saved?** `SELECT count(*) FROM mobile_push_tokens WHERE last_seen_at > now() - interval '7 days';` — should be roughly your DAU.
3. **Has the FCM service account expired or had its key rotated?** Check `FCM_PRIVATE_KEY` env var; test with `firebase-admin` `messaging().send()` standalone.
4. **Are Xiaomi/OPPO/Vivo users disproportionately affected?** Likely OEM battery management — see L3 standing lesson below.
5. **iOS only?** Check APNs auth key in FCM console — `.p8` keys don't expire but can be revoked if the team mistakenly regenerates.

**Likely causes:**
- (a) FCM key rotated, env var not updated → 100% failure. **Fix:** update `FCM_PRIVATE_KEY`, restart pm2.
- (b) Notification creation path not calling `sendPushForNotification` → fire-and-forget call was removed. **Fix:** restore the line in `notification.routes.ts`.
- (c) Token churn — stale tokens not cleaned up; FCM returns `not-registered` and we don't delete. **Fix:** run the cleanup script in `pushNotifications.ts`.
- (d) Android 13+ `POST_NOTIFICATIONS` permission denied by users → no notifications regardless of FCM. **Fix:** show in-app prompt to re-grant.

**Verify after fix:** trigger a test notification from admin UI to a known device; confirm receipt within 30s.

---

### P3 · Crashes spike on a specific Android skin or version

**Symptom:** Sentry shows >5% crash-free-session loss on a specific cohort (e.g. Xiaomi 11.x users).

**First checks:**
1. Sentry release-health page → filter by OS version + device manufacturer.
2. Sentry issues view → look for a single stack trace that dominates the cohort.
3. Cross-reference release timestamp — did crashes start at a specific build?

**Likely causes:**
- (a) New native module that doesn't support the cohort's API level. **Fix:** check `minSdkVersion`, rebuild.
- (b) OEM-specific permission model (e.g. MIUI auto-revoking background permissions). **Fix:** add onboarding step.
- (c) Memory pressure on low-RAM devices (Redmi 9 has 3 GB). **Fix:** profile, lazy-load heavy screens.

**Verify after fix:** ship OTA update via `expo-updates` (no store wait); watch Sentry for 24 hours.

---

### P4 · iOS app rejected by App Store

**Symptom:** App Store Connect shows "Rejected" status; rejection email cites a guideline number.

**First checks:**
1. Read the rejection reason verbatim — Apple is specific.
2. Common rejection codes:
   - **4.8** — Sign in with Apple missing when third-party SSO offered
   - **4.2** — Minimum Functionality (app feels like a thin web wrapper)
   - **5.1.1** — Data collection without proper privacy disclosure
   - **2.5.1** — Use of non-public API
   - **2.1** — App incomplete or crashes on review
3. Check Apple's screenshot if provided — they often include reproduction steps.

**Fix sequence:** Address the cited guideline, reply via Resolution Center (don't just resubmit silently), upload a new build, request review.

**Verify after fix:** wait 24–48h, hope.

---

### P5 · Backend mobile-surface 5xx errors

**Symptom:** Mobile users see "Something went wrong"; Sentry backend shows 500s on `/api/v1/mobile/*`.

**First checks:**
1. `pm2 logs 0 --lines 100` — look for stack traces.
2. Recent deploy? `git log --oneline -5` in `~/Projects/Recruitment/hirestream`.
3. DB connection issues? `pg_isready -h localhost -U hirestream` on the VM.
4. Disk full? `df -h` — uploads dir lives on `/`.

**Fix sequence:** roll back the most recent deploy if it correlates (`pm2 restart hirestream` after checkout). Else investigate the specific endpoint.

---

### P6 · Play Store listing taken down / policy violation

**Symptom:** Play Console email "Your app has been removed for policy violation."

**First checks:**
1. Read the violation reason in Play Console → Policy section.
2. Common issues: deceptive behaviour, broken functionality, intellectual property, sensitive permission misuse.

**Fix sequence:** 
- Don't appeal blindly — fix the underlying issue first.
- Submit a new build with fix + a measured appeal explaining the change.
- If the app is monetised this is urgent revenue impact; for HPSEDC it's reputational + service-continuity.

---

## Standing lessons (operational gotchas)

| ID | Lesson |
|---|---|
| L1 | Always set `JWT_SECRET_PREVIOUS` for 24h when rotating `JWT_SECRET`. Without it, every live mobile user is logged out at once. |
| L2 | Mobile crashes can be hidden in `Sentry → Issues → Resolved` if the auto-resolve heuristic misfires. Check "All" on weekly review. |
| L3 | Xiaomi MIUI, OPPO ColorOS, Vivo FuntouchOS aggressively kill background services. FCM high-priority messages bypass this; lower-priority do not. Mark interview/offer push as high-priority. |
| L4 | OTA updates via `expo-updates` can ship JS bug-fixes in 5 min, no store wait. But anything that touches native modules (new permissions, new SDK) still needs a store build. |
| L5 | Apple App Review can take 24h to 7 days. Always submit a build at least 10 days before any contractual demo date. |
| L6 | When backend env vars change, `pm2 restart hirestream` is required — `pm2 reload` does **not** pick up new env values reliably. |
| L7 | The HireStream `session` table grows monotonically without TTL cleanup. If login starts hanging, check row count; truncate sessions older than 30d if it exceeds 100k. |
| L8 | If you've deleted reviewer signoffs by accident in Verify, **there are no DB backups on the staging VM** (incident 2026-04-19). Don't `db.delete(...)` without UPSERT logic. |

---

## Quick commands

```bash
# Tail backend logs
pm2 logs 0 --lines 100

# Restart backend
cd ~/Projects/Recruitment/hirestream && pm2 restart hirestream

# Check DB connection
PGPASSWORD=hirestream psql -h localhost -U hirestream -d hirestream -c "SELECT 1;"

# Find expired sessions
PGPASSWORD=hirestream psql -h localhost -U hirestream -d hirestream -c \
  "SELECT count(*) FROM session WHERE expire < now();"

# Trigger a test push (once /api/v1/mobile/push/test endpoint exists)
curl -X POST https://hirestream-stg.agentryx.dev/api/v1/mobile/push/test \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test","body":"From runbook"}'

# Rebuild + restart after deploy
cd ~/Projects/Recruitment/hirestream && npm run build && pm2 restart hirestream
```

---

## Adding a new playbook

When you handle an incident not covered above, add a new `P-N` section the same week — fresh memory beats reconstructed memory. Use the same five-section shape (Symptom / First checks / Likely causes / Fix / Verify) so the doc stays scannable.
