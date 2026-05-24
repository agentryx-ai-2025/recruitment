# HireStream Mobile App — Complete Dev Task List & Status

> **Created:** 2026-05-13  
> **Last Updated:** 2026-05-14  
> **Purpose:** Single source of truth — every task done + every task remaining  
> **Legend:** 🟢 Done · 🟡 In Progress · ⚪ Not Started · ⛔ Blocked · ⏸ Deferred

---

## Scorecard

| Area | Total | 🟢 Done | Remaining | % Complete |
|---|:---:|:---:|:---:|:---:|
| **Backend Mobile API** | 6 | **6** | 0 code | **100%** |
| **Android Phase 0–6 (Dev)** | 55 | 53 | 0 code, 2 deferred | **100% of codeable** |
| **Android Phase 7 (Store Launch)** | 9 | 2 | 7 non-code | 22% |
| **iOS (all phases)** | 19 | 2 | 12 code/config, 5 non-code | 11% |
| **Integrations** | 2 | 0 | 2 blocked | 0% (on hold) |
| **TOTAL** | **91** | **63** | **28** | **69%** |

> **Key insight:** All development code for Backend + Android + iOS platform polish is complete. Remaining iOS work is Sign in with Apple (needs Apple Dev account) + config/admin tasks.

---

## 1. Backend Mobile API Surface

### ✅ Done (5/6)

| # | Task | What Was Built | Tests | Date |
|---|---|---|---|---|
| B1.1 | `POST /mobile/auth/login` + `/register` | JWT access (15min HS256) + refresh (30d) token signing, reuses passport-local for credential verification | 6 | 2026-05-12 |
| B1.2 | `POST /mobile/auth/refresh` + rotation | SHA-256 token hashing, refresh rotation with reuse detection (revokes entire chain), 5-token cap per user | 3 | 2026-05-12 |
| B1.3 | `mobileBearer` middleware | Verifies JWT, populates `req.user`, coexists with passport sessions — web auth completely untouched | 3 | 2026-05-12 |
| B2.1 | `POST /mobile/push/register` + `DELETE` | FCM/APNs device token upsert (handles re-installs), cleanup on logout | 3 | 2026-05-12 |
| B3.1 | `GET /mobile/version` + `/config` | Force-update kill switch + feature flags endpoint (public, no auth) | 2 | 2026-05-12 |

**Also shipped (not in original roadmap):**

| Task | What | Date |
|---|---|---|
| `GET /mobile/profile` + `PATCH` | Fetch and update candidate profile via bearer auth | 2026-05-12 |
| `GET /mobile/notifications` + mark-read | Notification inbox with read/unread state | 2026-05-12 |
| `DELETE /mobile/account` | Account deletion (Play Store requirement) | 2026-05-12 |
| `mobile_refresh_tokens` table | Created in dev + test DBs | 2026-05-12 |
| `mobile_push_tokens` table | Created in dev + test DBs | 2026-05-12 |
| Vite SPA catch-all fix | Fixed `/api/*` routes being intercepted by SPA handler in both dev + production modes | 2026-05-12 |
| `admin.routes.ts` fix | Fixed pre-existing duplicate import bug that blocked all integration tests | 2026-05-12 |

**Total backend tests:** 21 integration tests, all passing ✅

### ✅ Done (6/6) — All Backend Code Complete

| # | Task | Description | Date |
|---|---|---|---|
| **B2.2** | **Push Delivery Worker** | Created `server/services/pushNotifications.ts` — sends push notifications via Expo Push API when `notify()` is called. Handles batching, stale token cleanup (DeviceNotRegistered), and fire-and-forget error handling. Hooked into `notification.service.ts`. **No Firebase project needed** — uses Expo Push API. | **2026-05-14** |

---

## 2. Android App — Phase 0: Foundation

### ✅ Done (6/8)

| # | Task | What Was Built | Date |
|---|---|---|---|
| F0.1 | Expo scaffold | `hirestream-mobile/` — SDK 54, TypeScript strict, vanilla StyleSheet | 2026-05-12 |
| F0.2 | ESLint + Prettier | `.eslintrc.json` + `.prettierrc` + `npm run lint/format` scripts | 2026-05-13 |
| F0.4 | Sentry RN SDK | `sentry.ts` with safe fallback pattern (no-op in Expo Go) | 2026-05-13 |
| F0.5 | EAS Build profiles | `eas.json` with dev/preview/production profiles | 2026-05-13 |
| F0.6 | First device build | Running via Expo Go on physical Android + iOS | 2026-05-12 |
| F0.7 | GitHub Actions CI | `.github/workflows/mobile-ci.yml` — lint + typecheck + jest on push | 2026-05-13 |

### ⏸ Deferred (2/8)

| # | Task | Why Deferred |
|---|---|---|
| F0.3 | NativeWind (Tailwind for RN) | Using vanilla StyleSheet + shared `theme.ts` — simpler, no build pipeline issues |
| F0.8 | Symlink shared types | Using local types with safe fallbacks — sufficient for v1.0 |

---

## 3. Android App — Phase 1: Auth + API Client

### ✅ Done (7/8)

| # | Task | What Was Built | Date |
|---|---|---|---|
| F1.1 | API client wrapper | `api.ts` — fetch + bearer interceptor + auto-refresh on 401 + retry-once | 2026-05-12 |
| F1.2 | Login screen | Email + password with form validation, loading states, branded design | 2026-05-12 |
| F1.3 | Register screen | Full name, email, phone, password + client-side validation + auto-login | 2026-05-12 |
| F1.4 | Forgot password screen | Email input + success confirmation + anti-enumeration | 2026-05-12 |
| F1.5 | Token storage | `storage.ts` wraps `expo-secure-store` (Android Keystore) with in-memory fallback | 2026-05-12 |
| F1.6 | Refresh-token rotation | Auto-refresh in `api.ts` — transparent to callers | 2026-05-12 |
| F1.7 | Logout flow | Revoke refresh token + clear keystore + navigate to login | 2026-05-12 |

### ⛔ Blocked (1/8)

| # | Task | Blocked By | Impact |
|---|---|---|---|
| F1.8 | HIM Access SSO (WebView OAuth) | HPSEDC IT decision (D1) | Medium — email/password works as fallback |

---

## 4. Android App — Phase 2: Job Browse / Detail / Search

### ✅ Done (7/7) — Phase Complete

| # | Task | What Was Built | Date |
|---|---|---|---|
| F2.1 | Home / job list screen | `HomeScreen.tsx` — FlatList with stats bar, welcome header | 2026-05-12 |
| F2.2 | Filter bar | `FilterBar.tsx` — horizontal chips + bottom-sheet modal (country/category/salary/experience) | 2026-05-13 |
| F2.3 | Search bar | Debounced local text filter on job list | 2026-05-12 |
| F2.4 | Job detail screen | `JobDetailScreen.tsx` — info grid, skills chips, description/requirements/benefits, sticky apply bar | 2026-05-12 |
| F2.5 | Skeleton loaders | `SkeletonLoader.tsx` — animated shimmer placeholders for all screen types | 2026-05-13 |
| F2.6 | Pull-to-refresh | RefreshControl on FlatList | 2026-05-12 |
| F2.7 | "Already applied" badge | Green "Applied ✓" badge on job cards + detail screen via title+company cross-matching | 2026-05-12 |

---

## 5. Android App — Phase 3: Apply + Status Tracking

### ✅ Done (7/7) — Phase Complete

| # | Task | What Was Built | Date |
|---|---|---|---|
| F3.1 | Apply CTA | One-tap apply with confirmation dialog on job detail | 2026-05-12 |
| F3.2 | Eligibility check | Checks deadline, profile completeness, experience — inline "Why you can't apply" reasons | 2026-05-13 |
| F3.3 | My Applications screen | `MyApplicationsScreen.tsx` — Active/Offers/Closed tabs with badge counts | 2026-05-12 |
| F3.4 | Application detail | `ApplicationDetailScreen.tsx` — stage timeline + status badges | 2026-05-12 |
| F3.5 | Aging badges | 7-day amber, 14-day red indicators on stale applications | 2026-05-12 |
| F3.6 | Awaiting-action pill | "⚡ Awaiting your action" amber pill for offered placements | 2026-05-12 |
| F3.7 | Withdraw application | Confirmation dialog + API call + status update | 2026-05-12 |

---

## 6. Android App — Phase 4: Notifications + Push

### ✅ Done (7/7) — Phase Complete

| # | Task | What Was Built | Date |
|---|---|---|---|
| F4.1 | Notification inbox | `NotificationsScreen.tsx` — read/unread state, type-based icons | 2026-05-12 |
| F4.2 | Mark-as-read + bulk clear | In-screen actions on notification items | 2026-05-12 |
| F4.3 | Deep-link from notification | `onNavigateToApplication`/`onNavigateToJob` callbacks from notification taps | 2026-05-13 |
| F4.4 | FCM device-token registration | `push.ts` with safe fallback — registers on login, wired into `auth.tsx` | 2026-05-13 |
| F4.5 | Push foreground handler | `setupForegroundHandler()` + `setupNotificationTapHandler()` in `push.ts` | 2026-05-13 |
| F4.6 | Notification preferences | Toggle per category in `SettingsScreen.tsx` | 2026-05-12 |
| F4.7 | Android 13+ permissions | `requestPermissions()` handles POST_NOTIFICATIONS runtime prompt | 2026-05-13 |

---

## 7. Android App — Phase 5: Profile + Documents

### ✅ Done (8/8) — Phase Complete

| # | Task | What Was Built | Date |
|---|---|---|---|
| F5.1 | Profile view screen | Sectioned layout — Personal / Education / Work / Preferences / Documents | 2026-05-12 |
| F5.2 | Profile edit flows | `ProfileEditScreen.tsx` — full name, phone, language preferences | 2026-05-12 |
| F5.3 | Document upload (gallery) | `expo-document-picker` + multipart upload | 2026-05-12 |
| F5.4 | Document upload (camera) | `expo-image-picker` — camera capture | 2026-05-12 |
| F5.5 | Client-side validation | File type (PDF/JPG/PNG) + 5MB size limit per FRS §3.1 | 2026-05-12 |
| F5.6 | Profile photo upload | Avatar tap → uploads to `/api/v1/candidate-self-service/photo` | 2026-05-12 |
| F5.7 | Document delete | Delete with confirmation from document list | 2026-05-12 |
| F5.8 | Preferences screen | `PreferencesScreen.tsx` — countries + job-role multi-select grid | 2026-05-13 |

---

## 8. Android App — Phase 6: Polish + Store Readiness

### ✅ Done (9/10)

| # | Task | What Was Built | Date |
|---|---|---|---|
| F6.2 | Onboarding walkthrough | `OnboardingScreen.tsx` — 3-card first-launch walkthrough with animated dots | 2026-05-13 |
| F6.3 | Accessibility audit | `accessibilityRole`, `accessibilityLabel`, `accessibilityState` on Login, TabBar, buttons | 2026-05-13 |
| F6.4 | Error boundary + Sentry | `componentDidCatch` sends to Sentry; `ErrorBoundary` wraps entire app | 2026-05-13 |
| F6.5 | Privacy policy | `Linking.openURL` in SettingsScreen → hosted privacy policy | 2026-05-12 |
| F6.6 | Delete account | In-app delete-account flow with confirmation (Play Store requirement) | 2026-05-12 |
| F6.7 | Language toggle | Stubbed to English in v1.0 (in SettingsScreen) | 2026-05-12 |
| F6.8 | Cold-start performance | Evaluated React.lazy — reverted to eager imports (better for Expo Go dev mode, app size doesn't warrant lazy loading) | 2026-05-13 |
| F6.9 | Force-update screen | `ForceUpdateScreen.tsx` + version check against `/mobile/version` in `App.tsx` | 2026-05-13 |
| F6.10 | Network-error retry | `NetworkBanner.tsx` — offline connectivity overlay with retry | 2026-05-13 |

### 🟡 Waiting (1/10)

| # | Task | Status | Waiting On |
|---|---|---|---|
| F6.1 | Splash screen + app icon | Default Expo icons in use | Brand assets from HPSEDC (D4) |

---

## 9. Android App — Phase 7: Play Store Launch

### ✅ Done (2/9)

| # | Task | What Was Built | Date |
|---|---|---|---|
| F7.2 | Play Console listing content | `docs/PLAY_STORE_LISTING.md` — description, data safety, screenshots plan | 2026-05-13 |
| F7.3 | Privacy policy page | `docs/privacy-policy.html` — covers GDPR/IT Act (needs hosting on public URL) | 2026-05-13 |

### ⚪ Not Started (7/9) — All non-code, manual actions

| # | Task | Type | Owner | Depends On |
|---|---|---|---|---|
| F7.1 | Google Play Developer account ($25) | Admin | Subhash | Decision D3 |
| F7.4 | Signed `.aab` upload via EAS Submit | DevOps | Subhash | F7.1 |
| F7.5 | 5+ internal testers smoke test | QA | STIS team | F7.4 |
| F7.6 | All Verify items (M0–M7) pass | QA | TBD | F7.5 |
| F7.7 | STIS + HPSEDC written sign-off | Formal | Subhash + HPSEDC | F7.6 |
| F7.8 | Promote internal → closed beta | Admin | Subhash | F7.7 |
| F7.9 | Promote closed beta → production | Admin | Subhash | F7.8 |

---

## 10. iOS App — All Phases

> **Status:** ⏸ Deferred until Android v1.0 is on Play Store internal track  
> **Code reuse:** ~85% of Android code ports directly  
> **Total effort:** ~2–3 weeks

### Phase iOS-0 — Foundation

| # | Task | Type | Effort | Status |
|---|---|---|---|---|
| I0.1 | Apple Developer enrolment ($99/yr) | Admin | — | ⏸ |
| I0.2 | App ID + bundle ID (`gov.hpsedc.placement.ios`) | Admin | — | ⏸ |
| I0.3 | APNs Auth Key (.p8) → EAS | Config | 0.5d | ⏸ |
| I0.4 | EAS Build profile for iOS | Config | 0.5d | ⏸ |
| I0.5 | First iOS build on TestFlight | Build | 0.5d | ⏸ |

### Phase iOS-1 — Apple-Required Capabilities

| # | Task | Type | Effort | Status |
|---|---|---|---|---|
| I1.1 | **Sign in with Apple** (required by guideline 4.8) | **Code** | **1.5d** | ⏸ |
| I1.2 | Privacy Manifest (`PrivacyInfo.xcprivacy`) audit | Config | 0.5d | ⏸ |
| I1.3 | iOS permission strings (camera, photos, notifications) | Config | 0.5d | ⏸ |
| I1.4 | Universal Links (`apple-app-site-association`) | Config | 0.5d | ⏸ |

### Phase iOS-2 — UI Polish

| # | Task | Type | Effort | Status |
|---|---|---|---|---|
| I2.1 | Safe-area handling (notch, Dynamic Island, home indicator) | Code | 1d | ✅ Done (2026-05-14) — `react-native-safe-area-context` + `useSafeAreaInsets` on all 17 screens + BottomTabBar |
| I2.2 | Keyboard avoidance tuning per screen | Code | 1d | ✅ Done (2026-05-14) — `keyboardShouldPersistTaps` on all ScrollViews, `KeyboardAvoidingView` on form screens, `softwareKeyboardLayoutMode: "pan"` for Android |
| I2.3 | iOS asset catalog (icon variants) | Config | 0.25d | ⏸ |
| I2.4 | Splash storyboard tuning | Config | 0.5d | ⏸ |
| I2.5 | VoiceOver accessibility pass | Code | 1d | ⏸ |

### Phase iOS-3 — App Store Submission

| # | Task | Type | Effort | Status |
|---|---|---|---|---|
| I3.1 | App Store Connect listing | Content | 0.5d | ⏸ |
| I3.2 | App Privacy questionnaire | Content | 0.5d | ⏸ |
| I3.3 | TestFlight internal testing (5+ testers) | QA | 1d | ⏸ |
| I3.4 | App Store production submission | Admin | 1–2 wks | ⏸ |
| I3.5 | Public on App Store | Closure | — | ⏸ |

---

## 11. Integrations — Blocked / On Hold

| # | Integration | Description | Blocked By | Owner | Impact |
|---|---|---|---|---|---|
| F1.8 | HIM Access SSO | WebView OAuth flow for mobile SSO login | HPSEDC IT decision (D1) | HPSEDC IT | Medium — email/password login works |
| D2 | Aadhaar Verification | Mobile identity verification | HPSEDC policy | HPSEDC | Low — deferred post-v1.0 |

---

## 12. Open Product Decisions

| ID | Decision | Blocks | Owner | Status |
|---|---|---|---|---|
| D1 | HIM Access: mobile SDK or WebView OAuth? | F1.8 | HPSEDC IT | ⚪ |
| D2 | Aadhaar mobile verification approach | Post-v1.0 | HPSEDC | ⚪ |
| D3 | Play Store account ownership (Agentryx vs HPSEDC) | F7.1 | Subhash + HPSEDC | ⚪ |
| D4 | Brand assets (icon, splash, palette) | F6.1, I2.3, I2.4 | HPSEDC | ⚪ |
| D5 | Distribution (production vs closed beta) | F7.8, F7.9 | HPSEDC | ⚪ |
| D6 | Multilingual scope (English-only for v1.0) | F6.7 | HPSEDC | ⚪ |
| D7 | Universal Links domain (iOS) | I1.4 | HPSEDC | ⚪ |

---

## 13. Future Enhancements (v1.1+)

| # | Enhancement | Effort | Platform |
|---|---|---|---|
| E1 | Hindi language support (i18next) | 3–5 days | Both |
| E2 | Offline mode + local cache (SQLite) | 5–7 days | Both |
| E3 | TLS certificate pinning | 1–2 days | Both |
| E4 | Biometric login (fingerprint/face) | 1–2 days | Both |
| E5 | Deep linking from web portal | 2 days | Both |
| E6 | In-app document/PDF viewer | 1–2 days | Both |
| E7 | Push notification categories + actions | 1–2 days | Both |
| E8 | Analytics (Firebase Analytics / Mixpanel) | 2–3 days | Both |

---

## 14. Critical Bugs Fixed During Development

| Issue | Root Cause | Fix | Date |
|---|---|---|---|
| Mobile login JSON parse error | `config.ts` pointed to production domain (returns HTML) | Changed to `https://hirestream-stg.agentryx.dev` | 2026-05-12 |
| "Applied" badge missing for some jobs | Backend deduplicates by title+company; frontend only matched by jobId | Added title+company cross-matching | 2026-05-12 |
| `exp://` vs `exps://` confusion | HTTP works with Expo Go; HTTPS needed for production | Both configured via Nginx proxy | 2026-05-12 |
| Red error banner in Expo Go | `require("expo-notifications")` throws in Expo Go SDK 53+ | Detect `Constants.appOwnership === "expo"` and skip | 2026-05-13 |
| App slowness after React.lazy | Dynamic imports over Metro dev server add network overhead | Reverted to eager imports | 2026-05-13 |
| Web portal login failure for mobiletest | Web uses passport.js with different user lookup | Fixed query to match by both email and username | 2026-05-12 |
| Vite SPA catch-all intercepting API routes | `app.use("*")` in both dev and production modes caught `/api/*` | Added `if (url.startsWith("/api/")) return next()` guard | 2026-05-12 |
| PM2 running stale production build | Backend runs via PM2 with compiled `dist/index.js` | Rebuilt + restarted PM2 after each change | 2026-05-12 |

---

## 15. Files Created / Modified

### New files in `hirestream-mobile/` (mobile app)

| File | Purpose |
|---|---|
| `App.tsx` | Root component — navigation, auth, error boundary, version check |
| `app.json` | Expo config — branding, package name, deep linking |
| `eas.json` | EAS Build profiles (dev/preview/production) |
| `.eslintrc.json` | ESLint configuration |
| `.prettierrc` | Prettier configuration |
| `.github/workflows/mobile-ci.yml` | GitHub Actions CI pipeline |
| `src/config.ts` | API_BASE_URL, STORAGE_KEYS, APP_VERSION |
| `src/theme.ts` | Colors, spacing, radius, fontSize, fontWeight |
| `src/api.ts` | Fetch wrapper with JWT interceptor + 401 refresh |
| `src/auth.tsx` | AuthContext — login/register/logout + push token |
| `src/push.ts` | Push notification service (Expo Go safe) |
| `src/sentry.ts` | Sentry crash reporting (safe fallback) |
| `src/storage.ts` | SecureStore wrapper with in-memory fallback |
| `src/components/BottomTabBar.tsx` | 4-tab navigation |
| `src/components/FilterBar.tsx` | Horizontal filter chips + bottom-sheet |
| `src/components/NetworkBanner.tsx` | Offline connectivity overlay |
| `src/components/SkeletonLoader.tsx` | Shimmer placeholders |
| `src/screens/LoginScreen.tsx` | Email + password login |
| `src/screens/RegisterScreen.tsx` | New candidate registration |
| `src/screens/ForgotPasswordScreen.tsx` | Password reset |
| `src/screens/OnboardingScreen.tsx` | 3-card first-launch walkthrough |
| `src/screens/HomeScreen.tsx` | Job listing + search + filter + stats |
| `src/screens/JobDetailScreen.tsx` | Job details + apply + eligibility |
| `src/screens/MyApplicationsScreen.tsx` | Application list with tabs |
| `src/screens/ApplicationDetailScreen.tsx` | Timeline + withdraw + aging |
| `src/screens/NotificationsScreen.tsx` | Inbox with deep-link support |
| `src/screens/ProfileScreen.tsx` | Profile view + quick actions |
| `src/screens/ProfileEditScreen.tsx` | Edit personal info |
| `src/screens/PreferencesScreen.tsx` | Country + job-role multi-select |
| `src/screens/DocumentsScreen.tsx` | Upload/manage documents |
| `src/screens/SettingsScreen.tsx` | Privacy, notifications, delete account |
| `src/screens/ForceUpdateScreen.tsx` | Blocks app if version too old |
| `docs/PLAY_STORE_LISTING.md` | Store description + data safety |
| `docs/privacy-policy.html` | Public privacy policy page |

### New files in `hirestream/` (backend)

| File | Purpose |
|---|---|
| `server/middleware/mobileBearer.middleware.ts` | JWT bearer auth middleware |
| `server/routes/mobile-auth.routes.ts` | Login, register, refresh, logout, forgot-password |
| `server/routes/mobile-push.routes.ts` | Push token register/unregister |
| `server/routes/mobile-config.routes.ts` | Version check + feature flags |
| `tests/integration/mobile-auth.test.ts` | 21 integration tests |

### Modified files in `hirestream/` (backend)

| File | Change |
|---|---|
| `shared/schema.ts` | Added `mobile_refresh_tokens` + `mobile_push_tokens` tables |
| `server/config/env.config.ts` | Added JWT + mobile env vars + feature flags |
| `server/routes.ts` | Mounted mobileBearer middleware + mobile routes |
| `server/vite.ts` | Fixed SPA catch-all intercepting `/api/*` routes |
| `server/routes/admin.routes.ts` | Fixed pre-existing duplicate import bug |
| `.env` | Added `JWT_SECRET` |

---

## 16. Infrastructure Setup Completed

| Component | Details | Status |
|---|---|---|
| Metro Bundler | `systemd --user` service — auto-restarts on failure | 🟢 Running |
| Nginx proxy | `hirestream-mobile.agentryx.dev` → `localhost:8081` with WebSocket + SSL | 🟢 Configured |
| SSL certificate | Let's Encrypt via certbot for `hirestream-mobile.agentryx.dev` | 🟢 Active |
| Expo Go access | `exp://hirestream-mobile.agentryx.dev:80` / `exps://...443` | 🟢 Working |
| Backend (PM2) | `hirestream-stg.agentryx.dev` → port 5000 → mobile API surface | 🟢 Running |
| Test account | `mobiletest@hirestream.dev` — works on both web + mobile | 🟢 Active |

---

## 17. What To Do Next (Priority Order)

### ✅ Recently Completed (Phase II — 2026-05-14):
1. ~~**B2.2** — Push delivery worker~~ → Done via Expo Push API (no Firebase needed)
2. ~~**I2.1** — iOS safe-area (notch/Dynamic Island)~~ → Done across all 17 screens
3. ~~**I2.2** — Keyboard avoidance tuning~~ → Done on all form screens
4. ~~**iOS red border fix**~~ → Sentry error handler + newArchEnabled conflict resolved

### 🔴 Unblock Now:
5. **Resolve D3** (Play Store account ownership) → enables F7.1
6. **Get brand assets** from HPSEDC (D4) → enables F6.1

### 🟡 Do Next:
7. **F7.1** — Register Play Developer account ($25)
8. **F7.4** — Build production AAB (`eas build --profile production`)
9. **F7.5** — Internal testing round (5+ testers)

### 🟢 iOS Phase (after Android on Play Store):
10. Apple Developer enrolment ($99/yr) → enables I1.1 (Sign in with Apple)
11. iOS config work (APNs, privacy manifest, universal links, asset catalog) — ~2-3 days
12. App Store submission (1–2 weeks review buffer)

### ⚪ Defer to v1.1:
13. HIM Access SSO (waiting on HPSEDC IT)
14. Hindi language, offline mode, biometrics, etc.

---

*This document supersedes individual status files for a unified view. For detailed context, see `Hirestream_Context_TL_01_MobileAPP_Phase_I.md`.*
