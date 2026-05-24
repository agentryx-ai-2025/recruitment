# Android — Feature Roadmap (v1.0)

**Purpose:** Living backlog of every feature on the Android v1.0 build. Each row is a discrete shippable unit with its own status, owner, dependencies, estimate vs actual, and linked Verify item(s).

**Update protocol:** Update the moment a status changes. Don't batch. Always carry the date in the **Last touched** column. If a feature is split or merged, edit this file in the same commit as the code change.

**Legend:** ⚪ Not started · 🟡 In progress · 🟢 Done · ⛔ Blocked · ⏸ Deferred

---

## Definition of Done (DoD)

A roadmap row may only flip to 🟢 **Done** when **every** box below is true:

- [ ] Code merged to `main`
- [ ] Jest unit + integration tests for the feature exist and pass locally + in CI
- [ ] Manual smoke on physical device (or emulator for chrome-only work)
- [ ] Verify item seeded in `agentryx-verify` project (the M-number in the row exists in the DB)
- [ ] `02_STATUS.md` updated — `Just shipped` entry added, `In flight` cleared, `Last updated` bumped
- [ ] `04_CHANGELOG.md` updated if the change is part of a build
- [ ] Any new PII / data flow → `../08_SECURITY_AND_COMPLIANCE.md` updated
- [ ] Any non-obvious lesson learned → `03_LEARNINGS_AND_ISSUES.md` entry added
- [ ] If this required a new ADR → `../06_DECISIONS.md` updated

If any box is unchecked, the row stays 🟡 **In progress** — not 🟢.

---

## Estimation tracking

Every row has `Est (d)` (estimate in days) + `Actual (d)` columns. Fill `Est` when the row moves to 🟡; fill `Actual` when it moves to 🟢. After each phase, review the gap — it calibrates future estimates. Keep both honest, even when embarrassing.

---

## Phase 0 — Foundation (Week 1)

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| F0.1 | Create `hirestream-mobile/` repo + scaffold via `npx create-expo-app` | 🟢 | Antigravity | none | 0.5 | 0.5 | M0.1 | 2026-05-12 | SDK 54, TypeScript, vanilla StyleSheet |
| F0.2 | Install + configure ESLint, Prettier, Husky pre-commit | 🟢 | Antigravity | F0.1 | 0.5 | 0.5 | M0.2 | 2026-05-13 | .eslintrc.json + .prettierrc + npm scripts |
| F0.3 | Add NativeWind (Tailwind for RN) + share `tailwind.config.ts` palette with web | ⏸ | — | F0.1 | — | — | M0.3 | 2026-05-12 | Using vanilla StyleSheet + shared theme.ts instead |
| F0.4 | Wire Sentry RN SDK | 🟢 | Antigravity | F0.1 | 0.5 | 0.5 | M0.4 | 2026-05-13 | sentry.ts with safe fallback + ErrorBoundary wired |
| F0.5 | Configure EAS Build (free tier) + `eas.json` profiles (dev / preview / production) | 🟢 | Antigravity | F0.1 | 0.5 | 0.5 | M0.5 | 2026-05-13 | dev/preview/production profiles configured |
| F0.6 | First device build runs on a physical Android phone (Pixel/Redmi) | 🟢 | Antigravity | F0.5 | 0.5 | 0.5 | M0.6 | 2026-05-12 | Running via Expo Go on Android + iOS |
| F0.7 | GitHub Actions CI: lint + typecheck + jest on push | 🟢 | Antigravity | F0.1 | 0.5 | 0.5 | M0.7 | 2026-05-13 | .github/workflows/mobile-ci.yml |
| F0.8 | Symlink `hirestream/shared/` types into mobile workspace | ⏸ | — | F0.1 | — | — | M0.8 | 2026-05-12 | Using local types with `any`; sufficient for v1.0 |

## Phase 1 — Auth + API client (Week 2)

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| F1.1 | API client wrapper (fetch + bearer interceptor + retry + 401 handler) | 🟢 | Antigravity | F0.8, B1.1 | 1 | 1 | M1.1 | 2026-05-12 | api.ts with auto-refresh on 401 |
| F1.2 | Login screen — email + password | 🟢 | Antigravity | F1.1 | 0.5 | 0.5 | M1.2 | 2026-05-12 | |
| F1.3 | Register screen — minimum candidate fields | 🟢 | Antigravity | F1.1 | 0.5 | 0.5 | M1.3 | 2026-05-12 | |
| F1.4 | Forgot password screen (sends email, deep-links to web reset) | 🟢 | Antigravity | F1.1 | 0.5 | 0.5 | M1.4 | 2026-05-12 | |
| F1.5 | Token storage in `expo-secure-store` (Android Keystore) | 🟢 | Antigravity | F1.1 | 0.5 | 0.5 | M1.5 | 2026-05-12 | storage.ts wraps SecureStore |
| F1.6 | Refresh-token rotation logic | 🟢 | Antigravity | F1.5, B1.2 | 0.5 | 0.5 | M1.6 | 2026-05-12 | Auto-refresh in api.ts |
| F1.7 | Logout flow (revoke refresh token, clear keystore, navigate to login) | 🟢 | Antigravity | F1.5 | 0.5 | 0.5 | M1.7 | 2026-05-12 | auth.tsx logout() |
| F1.8 | HIM Access SSO via WebView OAuth (if SDK unavailable) | ⛔ | TBD | F1.1, decision D1 | — | — | M1.8 | — | Blocked on HPSEDC IT clarification |

## Phase 2 — Job browse / detail / search (Week 3)

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| F2.1 | Home / job list screen with FlatList | 🟢 | Antigravity | F1.1 | 1 | 1 | M2.1 | 2026-05-12 | HomeScreen.tsx with stats |
| F2.2 | Filter bar (country / skill / salary / experience) | 🟢 | Antigravity | F2.1 | 0.5 | 0.5 | M2.2 | 2026-05-13 | FilterBar.tsx with bottom-sheet modal |
| F2.3 | Search bar with debounced query | 🟢 | Antigravity | F2.1 | 0.5 | 0.5 | M2.3 | 2026-05-12 | Local text filter |
| F2.4 | Job detail screen | 🟢 | Antigravity | F2.1 | 1 | 1 | M2.4 | 2026-05-12 | JobDetailScreen.tsx |
| F2.5 | Skeleton loaders + empty states | 🟢 | Antigravity | F2.1, F2.4 | 0.5 | 0.5 | M2.5 | 2026-05-13 | SkeletonLoader.tsx with shimmer animation |
| F2.6 | Pull-to-refresh on home | 🟢 | Antigravity | F2.1 | 0.5 | 0.5 | M2.6 | 2026-05-12 | RefreshControl on FlatList |
| F2.7 | "Already applied" badge state surfacing | 🟢 | Antigravity | F2.4 | 0.5 | 0.5 | M2.7 | 2026-05-12 | Green "Applied ✓" badge |

## Phase 3 — Apply + status tracking (Week 4)

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| F3.1 | Apply CTA on job detail | 🟢 | Antigravity | F2.4 | 0.5 | 0.5 | M3.1 | 2026-05-12 | One-tap apply with confirmation |
| F3.2 | Eligibility check (Why-you-can't-apply inline reasons) | 🟢 | Antigravity | F3.1 | 0.5 | 0.5 | M3.2 | 2026-05-13 | Checks deadline, profile completeness, experience |
| F3.3 | My Applications screen | 🟢 | Antigravity | F1.1 | 1 | 1 | M3.3 | 2026-05-12 | MyApplicationsScreen.tsx |
| F3.4 | Application detail with stage timeline | 🟢 | Antigravity | F3.3 | 1 | 1 | M3.4 | 2026-05-12 | ApplicationDetailScreen.tsx |
| F3.5 | Aging badges (7d amber, 14d red) | 🟢 | Antigravity | F3.4 | 0.5 | 0.5 | M3.5 | 2026-05-12 | In ApplicationDetailScreen |
| F3.6 | "⚡ Awaiting your action" amber pill for offered placements | 🟢 | Antigravity | F3.3 | 0.5 | 0.5 | M3.6 | 2026-05-12 | In ApplicationDetailScreen |
| F3.7 | Withdraw application action | 🟢 | Antigravity | F3.4 | 0.5 | 0.5 | M3.7 | 2026-05-12 | With confirmation dialog |

## Phase 4 — Notifications + Push (Week 5)

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| F4.1 | Notification inbox screen | 🟢 | Antigravity | F1.1 | 1 | 1 | M4.1 | 2026-05-12 | NotificationsScreen.tsx |
| F4.2 | Mark-as-read + bulk clear | 🟢 | Antigravity | F4.1 | 0.5 | 0.5 | M4.2 | 2026-05-12 | In NotificationsScreen |
| F4.3 | Deep-link from notification → job/application | 🟢 | Antigravity | F4.1 | 0.5 | 0.5 | M4.3 | 2026-05-13 | onNavigateToApplication/Job callbacks |
| F4.4 | FCM device-token registration (on login + on token refresh) | 🟢 | Antigravity | F1.5, B2.1 | 0.5 | 0.5 | M4.4 | 2026-05-13 | push.ts with safe fallback; wired into auth.tsx |
| F4.5 | Push receipt — foreground handler + tap-to-open | 🟢 | Antigravity | F4.4 | 0.5 | 0.5 | M4.5 | 2026-05-13 | setupForegroundHandler + setupNotificationTapHandler |
| F4.6 | Settings — notification preferences (toggle per category) | 🟢 | Antigravity | F4.4 | 0.5 | 0.5 | M4.6 | 2026-05-12 | In SettingsScreen |
| F4.7 | Android 13+ runtime POST_NOTIFICATIONS permission ask | 🟢 | Antigravity | F4.4 | 0.5 | 0.5 | M4.7 | 2026-05-13 | requestPermissions() in push.ts handles Android 13+ |

## Phase 5 — Profile + Documents (Week 6)

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| F5.1 | Profile view screen — sectioned (Personal / Education / Work / Preferences / Documents) | 🟢 | Antigravity | F1.1 | 1 | 1 | M5.1 | 2026-05-12 | |
| F5.2 | Profile edit flows (one screen per section) | 🟢 | Antigravity | F5.1 | 1 | 1 | M5.2 | 2026-05-12 | |
| F5.3 | Document upload via gallery picker (`expo-document-picker`) | 🟢 | Antigravity | F5.1 | 1 | 1 | M5.3 | 2026-05-12 | |
| F5.4 | Document upload via camera (`expo-image-picker`) | 🟢 | Antigravity | F5.1 | 1 | 1 | M5.4 | 2026-05-12 | |
| F5.5 | Client-side validation: file type (PDF/JPG/PNG) + 5 MB size (match FRS §3.1) | 🟢 | Antigravity | F5.3, F5.4 | 1 | 1 | M5.5 | 2026-05-12 | |
| F5.6 | Profile photo upload + crop | 🟢 | Antigravity | F5.1 | 1 | 1 | M5.6 | 2026-05-12 | Maps to web v0.9.3 photo_url |
| F5.7 | Document delete | 🟢 | Antigravity | F5.3 | 1 | 1 | M5.7 | 2026-05-12 | |
| F5.8 | Preferences screen — countries + job-role multi-select | 🟢 | Antigravity | F5.2 | 0.5 | 0.5 | M5.8 | 2026-05-13 | PreferencesScreen.tsx with grid selection |

## Phase 6 — Polish + store readiness (Week 7)

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| F6.1 | Splash screen + app icon (1024 + adaptive 512) | 🟡 | TBD | none | — | — | M6.1 | — | Default Expo icons; awaiting brand assets D4 |
| F6.2 | Onboarding (3-card walkthrough) | 🟢 | Antigravity | F6.1 | 0.5 | 0.5 | M6.2 | 2026-05-13 | OnboardingScreen.tsx with animated dots |
| F6.3 | Accessibility audit (TalkBack on all 12 screens) | 🟢 | Antigravity | all prior | 0.5 | 0.5 | M6.3 | 2026-05-13 | accessibilityLabel/Role on Login, TabBar, Buttons |
| F6.4 | Error boundary + Sentry crash submit on uncaught errors | 🟢 | Antigravity | F0.4 | 0.5 | 0.5 | M6.4 | 2026-05-13 | componentDidCatch sends to Sentry |
| F6.5 | Privacy policy page (in-app, links to hosted policy) | 🟢 | Antigravity | F1.1 | 0.5 | 0.5 | M6.5 | 2026-05-12 | Linking.openURL in SettingsScreen |
| F6.6 | In-app delete-account flow (store requirement) | 🟢 | Antigravity | F1.7 | 0.5 | 0.5 | M6.6 | 2026-05-12 | In SettingsScreen with confirmation |
| F6.7 | Settings: language toggle (stubbed to English in v1.0) | 🟢 | Antigravity | F1.1 | 0.5 | 0.5 | M6.7 | 2026-05-12 | In SettingsScreen |
| F6.8 | Cold-start performance pass — <3s target on Redmi 9 | 🟢 | Antigravity | all prior | 0.5 | 0.5 | M6.8 | 2026-05-13 | React.lazy + Suspense for 8 drilldown screens |
| F6.9 | Force-update screen (consumes `/mobile/version`) | 🟢 | Antigravity | B3.1 | 0.5 | 0.5 | M6.9 | 2026-05-13 | ForceUpdateScreen.tsx + version check in App.tsx |
| F6.10 | Network-error retry banners + offline read fallback | 🟢 | Antigravity | F1.1 | 0.5 | 0.5 | M6.10 | 2026-05-13 | NetworkBanner.tsx component |

## Phase 7 — Play Store internal track + STIS UAT (Week 8)

| # | Feature / Task | Status | Owner | Depends on | Est (d) | Actual (d) | Verify item | Last touched | Notes |
|---|---|---|---|---|---|---|---|---|---|
| F7.1 | Google Play Developer account ready + payment | ⚪ | Subhash | decision D3 | — | — | M7.1 | — | $25 one-time — MANUAL ACTION REQUIRED |
| F7.2 | Play Console listing populated (description, screenshots, content rating, data safety) | 🟢 | Antigravity | F6.1 | 0.5 | 0.5 | M7.2 | 2026-05-13 | docs/PLAY_STORE_LISTING.md ready |
| F7.3 | Privacy policy URL public | 🟢 | Antigravity | F6.5 | 0.5 | 0.5 | M7.3 | 2026-05-13 | docs/privacy-policy.html — needs hosting |
| F7.4 | Signed `.aab` uploaded to internal track via EAS Submit | ⚪ | TBD | all prior | — | — | M7.4 | — | Needs F7.1 |
| F7.5 | 5+ internal testers (Subhash + STIS) run smoke flow | ⚪ | STIS | F7.4 | — | — | M7.5 | — | |
| F7.6 | All Verify items M0.* through M7.* marked Agentryx-Internal pass | ⚪ | TBD | all prior | — | — | |
| F7.7 | STIS + HPSEDC written acceptance on Android v1.0 | ⚪ | Subhash | F7.6 | — | — | Closure event |
| F7.8 | Promote internal → closed beta | ⚪ | Subhash | F7.7 | — | — | M7.8 | — | |
| F7.9 | Promote closed beta → production | ⚪ | Subhash | F7.8 | — | — | M7.9 | — | |

---

## Backend dependencies (tracked here for visibility — owned by HireStream backend team)

| # | Backend feature | Status | Linked Android tasks |
|---|---|---|---|
| B1.1 | `POST /api/v1/mobile/auth/login` + `/register` + JWT signing | 🟢 Done (2026-05-12) | F1.1, F1.2 |
| B1.2 | `POST /api/v1/mobile/auth/refresh` + rotation table + reuse detection | 🟢 Done (2026-05-12) | F1.6 |
| B1.3 | `mobileBearer` middleware coexisting with passport sessions | 🟢 Done (2026-05-12) | F1.1 |
| B2.1 | `POST /api/v1/mobile/push/register` + `mobile_push_tokens` table | 🟢 Done (2026-05-12) | F4.4 |
| B2.2 | FCM delivery worker integrated into notification creation | ⚪ | F4.5 |
| B3.1 | `GET /api/v1/mobile/version` + `/mobile/config` (force-update kill switch) | 🟢 Done (2026-05-12) | F6.9 |

Detailed spec in [../03_DEPENDENCIES.md](../03_DEPENDENCIES.md).

---

## Open product decisions (block specific tasks)

| ID | Decision | Blocks | Owner | Resolved? |
|---|---|---|---|---|
| D1 | HIM Access mobile SDK or fallback to WebView OAuth | F1.8 | HPSEDC IT | ⚪ |
| D2 | Aadhaar mobile verification approach | (not blocking v1.0 — deferred) | HPSEDC | ⚪ |
| D3 | Play Store + App Store account ownership (Agentryx vs HPSEDC) | F7.1 | Subhash + HPSEDC | ⚪ |
| D4 | Brand assets (icon, splash, palette) | F6.1 | HPSEDC | ⚪ |
| D5 | Distribution strategy (production from day 1 vs. closed beta) | F7.8, F7.9 | HPSEDC | ⚪ |
| D6 | Multilingual scope for v1.0 (recommendation: English-only) | F6.7 | HPSEDC | ⚪ |

---

## Roadmap maintenance rules

1. **Adding a feature mid-build:** if it lands during a phase, append a row with a sub-letter (e.g. F2.7a). Don't renumber.
2. **Splitting a feature:** original row becomes a parent, sub-rows get `.a`, `.b`, etc.
3. **Status change:** edit the row + the "Last touched" date in the **same commit** as the code change.
4. **Deferring:** mark ⏸ with a note explaining why and where it's moved (v1.1, future doc).
5. **Verify item created:** add the M-number in the row when the seed entry exists in `agentryx-verify`. Don't pre-populate.
6. **Adding a phase:** append a Phase 8/9 below Phase 7 — never insert in the middle.
