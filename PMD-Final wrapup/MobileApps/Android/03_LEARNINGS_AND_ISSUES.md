# Android — Learnings & Issues Log

> **Purpose:** Capture the non-obvious problems we hit, what caused them, and what we should remember next time. Reverse-chronological — newest at top. Anything mundane (a typo, a quick test fix) does **not** belong here; only things that surprised us or cost us time.

**Update protocol:** Add an entry the same day the lesson lands. Don't wait until end-of-sprint. Don't curate or polish; ugly raw entries beat clean missing entries. If a pattern emerges across multiple entries, lift it into the **Standing lessons** section at the top of this file.

---

## Standing lessons (lifted from repeated entries)

_Empty for now — patterns will accumulate as the build proceeds. Examples of what belongs here once we have data:_

> *"OEM-specific battery management on Indian Android skins (Xiaomi MIUI, OPPO ColorOS, Vivo FuntouchOS) silently kills FCM background delivery. Always include onboarding step to whitelist app in battery settings."* — would graduate here after we've hit it 2–3 times.

---

## Entries

### YYYY-MM-DD · Template — copy this for new entries

> **Severity:** S1 (caused work-stoppage) / S2 (cost half-day+) / S3 (annoyance, worth remembering)
>
> **What happened:** One paragraph of plain English. What we were trying to do, what went wrong, who noticed.
>
> **Root cause:** The actual technical / process reason, not the symptom.
>
> **Resolution:** What we did to fix it. Include version numbers, file:line if relevant.
>
> **Lesson:** What we should remember. **This is the part future-us re-reads.** Make it directive — "always X" or "never Y", not just descriptive.
>
> **Related:** Roadmap rows affected, Verify items, links to commits.

---

### 2026-05-12 · Mobile scope was at risk of being missed entirely

> **Severity:** S2
>
> **What happened:** STIS + HPSEDC raised the missing mobile app as the open scope during UAT of the web product. The mobile app is **literally in the FRS title page** and §2.8, but it was deprioritized through the build because the web product absorbed all engineering attention. We came close to declaring the contract "done" without the mobile artifact.
>
> **Root cause:** No tracking artifact for FRS §2.8 in the active dev plan. The FRS evidence matrix in `hirestream-v1.4` (Verify) covers detailed requirements (1.4, 1.6, etc.) but did not have a row for the platform-level §2.8 "iOS and Android applications" requirement — so it stayed invisible until UAT.
>
> **Resolution:** Built this planning folder (`/PMD-Final wrapup/MobileApps/`) with 7 top-level docs + this platform folder. Added a memory entry (`project_mobile_app_scope.md`) so the scope cannot be lost again.
>
> **Lesson:** **Every platform-level requirement in the FRS needs its own Verify row, not just the feature-level requirements.** Title-page and §2 commitments are easy to skip past because they sound abstract — they are not. They are contract.
>
> **Related:** Will be tracked by Verify project `hirestream-mobile-v1.0` once seeded.

---

### 2026-05-12 · `drizzle-kit push` is interactive — can't pipe in CI

> **Severity:** S3
>
> **What happened:** When adding `mobile_refresh_tokens` and `mobile_push_tokens` tables, `npx drizzle-kit push` asked interactive questions ("Is X table created or renamed?") and hung in headless mode. Piping `echo -e "\n"` only partially worked — it created one table per run.
>
> **Root cause:** drizzle-kit push uses interactive prompts for ambiguous schema changes (new table vs rename). It has no `--yes` / `--accept-data-loss` flag for table creation.
>
> **Resolution:** Created tables directly with `psql` using raw SQL DDL. Applied to both dev and test databases.
>
> **Lesson:** **For schema additions, have the raw DDL ready as a fallback.** `drizzle-kit push` is great for iterative dev but can't be fully automated in CI/CD for new table creation. For migrations, use `drizzle-kit generate` + `drizzle-kit migrate` instead of `push`.
>
> **Related:** B1.2, B2.1

---

### 2026-05-12 · Pre-existing duplicate `import { storage }` broke all tests

> **Severity:** S2
>
> **What happened:** Running the mobile auth test suite failed with `Duplicate identifier 'storage'` in `admin.routes.ts`. This was a pre-existing bug — `storage` was imported at line 7 AND line 167, and `eq`/`and` were re-imported with aliases `_eq`/`_and`. This broke ALL integration tests, not just ours.
>
> **Root cause:** The notification templates block (line 165–168) was added in a later sprint and accidentally duplicated the top-of-file imports instead of extending them.
>
> **Resolution:** Removed the duplicate imports at line 166–168, added `notificationTemplates` to the existing line-8 import, and replaced `_and`/`_eq` with `and`/`eq` throughout.
>
> **Lesson:** **ts-jest strict mode catches import collisions that runtime JS doesn't.** The web app ran fine because ESM deduplicates, but TypeScript compilation (which Jest uses) correctly flags duplicates. Always run `tsc --noEmit` as part of CI.
>
> **Related:** All integration tests

---

### 2026-05-12 · mobileBearer must run BEFORE passport.session()

> **Severity:** S3 (design decision, not a bug — but would have cost time if wrong)
>
> **What happened:** The mobile bearer middleware needs to populate `req.user` from JWT before passport's `session()` middleware runs. If passport.session() runs first and finds no session cookie, it sets `req.user = undefined`, and when mobileBearer later sets it, some express internals (like `req.isAuthenticated()`) don't recognize the override.
>
> **Root cause:** passport.session() deserializes from cookie first; if no cookie → `req.isAuthenticated()` returns false regardless of later `req.user` assignment.
>
> **Resolution:** Placed `app.use(mobileBearer)` before `app.use(passport.initialize())` + `app.use(passport.session())`. The middleware silently falls through when no Bearer header is present, so session auth is unaffected.
>
> **Lesson:** **Middleware order is part of the architecture spec.** Document it in `routes.ts` with a comment. Future engineers adding new auth strategies must preserve this order.
>
> **Related:** B1.3

---

_Future entries below this line — newest at top._

---

## Anticipated learnings (pre-build hypotheses, will be replaced by real entries)

These are placeholder predictions of issues we **expect** to hit, lifted from industry experience and the risk register in [../04_EFFORT_TIMELINE_RISKS.md](../04_EFFORT_TIMELINE_RISKS.md). They are **not** real entries — they exist so the engineer knows what to be alert for. Replace each with a real dated entry when (if) the issue actually fires:

1. **FCM delivery on Xiaomi/OPPO/Vivo skins** — aggressive battery management will silently drop pushes. Onboarding workaround needed.
2. **HIM Access OAuth in WebView** — WebView cookie storage on Android 12+ is partitioned; SSO sessions may not persist across app restarts. May need a custom token-exchange flow.
3. **`expo-secure-store` quota on older Android (API 24–26)** — Keystore has size limits on some OEM ROMs; if our refresh token + access token exceed limits, fall back to encrypted SQLite.
4. **Play Store target API ratchet** — Google bumps target API yearly in late summer. Whoever owns the app after launch needs a calendar reminder.
5. **Hindi font rendering** — Devanagari shaping is fine on stock Android but some custom OEM fonts have ligature issues. Test on Samsung One UI specifically before the v1.1 Hindi launch.
6. **`expo-document-picker` returning content:// URIs** — multer on the backend needs to handle the upload stream correctly; magic-byte validation is server-side, but client should also check before upload to save bandwidth.
7. **EAS Build queue times** — free tier builds can queue 15–60 minutes during peak hours. Plan around it; upgrade to paid plan once we're doing multiple builds per day.
8. **Detox flakiness on emulators** — keep E2E suite small and deterministic; don't try to E2E-test everything.
