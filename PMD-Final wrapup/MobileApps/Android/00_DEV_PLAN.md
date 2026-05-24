# 03 — Android Development Plan (v1.0)

**Status:** Detailed plan · **Owner:** TBD (Subhash + 1 mobile engineer) · **Date:** 2026-05-12

This is the operational plan for the Android v1.0 build. iOS reuses ~85% of the work here — see [04_iOS_Dev_Plan.md](04_iOS_Dev_Plan.md) for the delta.

---

## 1. Scope guardrails

| In scope (v1.0) | Out of scope (v1.0) |
|---|---|
| Candidate role only | Agency, Employer, Admin roles |
| English UI | Hindi + other languages |
| Email/password + OTP login | HIM Access SSO native (use WebView) |
| Document upload via camera or gallery | DigiLocker integration (deep link to existing web) |
| Push notifications via FCM | In-app messaging, voice/video |
| Application status tracking | Real-time chat with agent |
| Job browse + filter + apply | Saved searches digest UI (web stays canonical) |
| Profile view + edit | Profile photo upload (defer to v1.1 if tight) |
| Notification inbox | MIS / analytics dashboards |
| In-app account deletion (store requirement) | Multi-account / family sharing |

---

## 2. Phased milestones

| Phase | Duration | Exit criteria | Key risks |
|---|---|---|---|
| **P0 — Foundation** | Week 1 | Repo scaffolded with Expo, EAS configured, first device build runs on a physical Android phone, CI on push, Sentry wired | EAS account setup, Expo SDK version churn |
| **P1 — Auth + API client** | Week 2 | Login screen works against staging backend, bearer token stored in Keystore, /me returns the candidate profile | Backend JWT endpoint must ship in parallel — see [05](03_DEPENDENCIES.md) |
| **P2 — Job browse + detail + search** | Week 3 | Candidate can open the app, see jobs, filter by country/skill/salary/experience, open detail | Pagination, image loading on slow networks |
| **P3 — Apply flow + status tracking** | Week 4 | One-tap apply works end-to-end, "My Applications" screen shows live status with the same stage names as web (submitted → reviewed → …) | API contract drift between web and mobile |
| **P4 — Notifications + Push** | Week 5 | FCM device-token registration works, push delivers within 30s of a backend event, in-app inbox lists notifications | FCM project setup, server key management |
| **P5 — Profile + Documents** | Week 6 | Candidate can edit profile fields, upload CV/passport from camera or gallery, see existing docs | Magic-byte validation matches server, file-size enforcement client-side |
| **P6 — Polish + store readiness** | Week 7 | Splash, icon, onboarding, error states, empty states, accessibility audit clean, privacy policy page, in-app delete-account flow | Last-mile UX issues, store rejection risk |
| **P7 — Play Store internal track + STIS testing** | Week 8 | App live on Play Store internal track with 5–10 testers, smoke + UAT complete | Play Store review (~3–7 days first time) |

**Total: 8 weeks for a single mobile engineer**, including the backend adaptation work which can largely run in parallel with P0–P1.

---

## 3. Screen inventory — 12 screens for v1.0

| # | Screen | Backend endpoint(s) | Notes |
|---|---|---|---|
| 1 | **Splash** | — | Logo + version, navigates by auth state |
| 2 | **Onboarding** (3 cards) | — | Skippable; explains find-jobs / apply / get-notified |
| 3 | **Login** | `POST /api/v1/mobile/auth/login` | Email + password; "Forgot?" link to web; SSO buttons |
| 4 | **Register** | `POST /api/v1/mobile/auth/register` | Reuses web wizard fields; can defer detailed profile to first login |
| 5 | **Forgot password** | `POST /api/v1/mobile/auth/forgot-password` | Email link to a web reset page |
| 6 | **Home / Job list** | `GET /api/v1/jobs?...` | Top filters (country, skill, salary, experience), search bar, infinite scroll |
| 7 | **Job detail** | `GET /api/v1/jobs/:id` | Description, requirements, salary range, agent badge, "Apply" CTA |
| 8 | **My Applications** | `GET /api/v1/applications/me` | Grouped Active / Offers / Closed (same as web v0.9.0) |
| 9 | **Application detail** | `GET /api/v1/applications/:id` | Stage timeline, aging indicator, agent contact, scorecard if released |
| 10 | **Notifications** | `GET /api/v1/notifications` | Inbox with mark-as-read; tap to deep-link into job/app |
| 11 | **Profile** | `GET /api/v1/me` + `PATCH /api/v1/me` | Personal, education, work, preferences, photo, documents — sectioned |
| 12 | **Settings** | `GET /api/v1/me/settings` + `DELETE /api/v1/me` | Language, notifications toggle, logout, **delete account** |

Tab bar: Home · My Applications · Notifications · Profile (4 tabs)

---

## 4. Technical decisions specific to Android

| Area | Decision |
|---|---|
| Minimum API level | API 24 (Android 7.0) — covers >95% of installed devices |
| Target API level | API 35 (Android 15) — required by Play Store as of Aug 2025 |
| Permissions requested at runtime | `INTERNET`, `POST_NOTIFICATIONS` (API 33+), `CAMERA`, `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` (legacy) |
| Signing | EAS-managed upload key + Google Play app signing |
| Distribution | Internal track → Closed beta → Production. Country availability: India + GCC corridor countries (per FRS overseas placement use case) |
| Crash reporting | Sentry Android SDK auto-wired via Expo plugin |
| Network security config | Cleartext disabled; pin `*.agentryx.dev` and HPSEDC prod domain |
| File provider for camera + document upload | `expo-file-system` handles this for us |
| Background fetch | None in v1.0 — push wakes the app when needed |
| Deep link scheme | `hpsedc://placement/...` + universal links on `placement.hpsedc.gov.in` (TBD with HPSEDC) |

---

## 5. Backend dependencies (this team or parallel team)

The mobile build cannot start P1 (Auth) until these ship. Tracked in [03_DEPENDENCIES.md](03_DEPENDENCIES.md):

1. `POST /api/v1/mobile/auth/login` — email/password → bearer token + refresh token
2. `POST /api/v1/mobile/auth/refresh` — refresh-token rotation
3. `POST /api/v1/mobile/auth/logout` — invalidates token
4. `POST /api/v1/mobile/push/register` — saves an FCM device token tied to the user
5. `DELETE /api/v1/mobile/push/register` — on logout
6. JWT middleware that sits alongside the existing `requireAuth` (sessions) and grants the same `req.user` shape
7. Push delivery worker — listen for `notifications.created` and fanout to all FCM tokens for that user

These are ~1 senior backend dev-week. Can run in parallel with P0/P1.

---

## 6. CI / CD pipeline

```
GitHub Actions or GitLab CI
   ├── on push to main → lint + typecheck + jest
   ├── on tag v* → EAS Build (production profile) → Play Store internal track via EAS Submit
   └── on PR → preview build via Expo dev clients (QR code in PR comment)
```

The HireStream VM does **not** run mobile builds. Mobile builds run on EAS hosted infra. Only the backend changes deploy to the existing pm2 instance.

---

## 7. Test strategy

| Layer | Approach | Tools |
|---|---|---|
| Unit (lib + components) | Component logic, formatters, API client | Jest + RN Testing Library |
| Integration (screen) | Each screen renders with mocked API responses | Jest + RN Testing Library + MSW |
| E2E (smoke) | The 16-step Flow A from `E2E_Workflow__Final_STG.md` adapted for mobile — register, apply, see status update, receive push | Detox on a local emulator + CI |
| Manual smoke | Full Verify project `hirestream-mobile-v1.0` driven by STIS testers | The existing Agentryx Verify app |
| Accessibility | TalkBack walk-through on each screen | TalkBack on a physical device |
| Performance | Cold start <3s on a mid-tier Android (Redmi 9, Moto G), API responses <2s p95 | Sentry transactions + Flipper |

---

## 8. Play Store submission checklist

(Belongs in P7. Captured here to avoid scrambling at the end.)

- [ ] Google Play Developer account ($25 one-time fee or HPSEDC's existing account)
- [ ] Privacy policy URL (a page on hirestream-stg.agentryx.dev or HPSEDC site)
- [ ] In-app account deletion flow (verifiable from the listing) ✅ already in scope
- [ ] Data safety form (what we collect, how, why)
- [ ] Content rating questionnaire (will be PEGI 3 / IARC equivalent)
- [ ] Target audience + content (18+ — this is a job platform)
- [ ] App icon (512×512 PNG) + feature graphic (1024×500 PNG)
- [ ] 4–8 screenshots per supported device class (phone + 7" tablet at minimum)
- [ ] Short description (80 chars) + full description (4,000 chars)
- [ ] App access (test credentials for the Play Store reviewer)
- [ ] Bundle signed with the upload key + uploaded to Play Console
- [ ] Internal track tested by 5+ testers before promoting to closed beta

---

## 9. What "Android v1.0 done" looks like

- [ ] Live on the Play Store production track
- [ ] All 12 screens fully implemented
- [ ] All 17 P0 features from [01_SCOPE.md §2](01_SCOPE.md) pass on a physical device
- [ ] Push notification delivers within 30 seconds of a backend event
- [ ] Sentry shows <1% crash-free-session loss in the first 7 days
- [ ] Verify project `hirestream-mobile-v1.0` reaches 100% Agentryx-Internal pass rate
- [ ] HPSEDC + STIS sign off in writing
- [ ] One row added to the HireStream release notes: `v1.0.0 (mobile-android)`
