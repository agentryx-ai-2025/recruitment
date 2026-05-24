# 02 — Mobile Strategy & Stack Decision

**Status:** Draft recommendation pending HPSEDC review · **Date:** 2026-05-12

---

## 1. The strategic question

We need iOS + Android per FRS §2.8. We have a TypeScript/React/Node monorepo already shipped (HireStream + Verify). We have one mobile engineer (or one shared full-stack engineer doing mobile). We need to close this scope to make HPSEDC + STIS sign off the contract.

**The stack choice gates everything downstream** — effort, hiring, push notifications, library availability, CI/CD, store submission overhead.

---

## 2. Stack alternatives — head-to-head

| Approach | Language(s) | One codebase? | Push notifications | Performance | Ramp cost (given existing team) | Long-term maintenance |
|---|---|---|---|---|---|---|
| **A. React Native + Expo** | TypeScript | ✅ | FCM + APNs via `expo-notifications` | Near-native (JS bridge with new architecture / Fabric) | **Low** — team already writes TypeScript + React | Single codebase. Active community. |
| B. Flutter | Dart | ✅ | FCM + APNs via `firebase_messaging` | Native (compiled to AOT) | High — Dart is new to the team | Single codebase. Strong UI consistency. |
| C. Native Kotlin (Android) + Swift (iOS) | Kotlin / Swift | ❌ | FCM / APNs native SDKs | Best | High — two separate codebases, two skill stacks | Two codebases, two builds, two test plans |
| D. Capacitor / Ionic wrap of the existing web app | TypeScript / React | ✅ (literally reuses web bundle) | Push via `@capacitor/push-notifications` | Mediocre (web rendering) | **Lowest** — almost zero new code | Single codebase but limited native feel |
| E. PWA only (no app store) | — | ✅ | Web Push (no iOS push reliability) | Web | Lowest | **Fails FRS** — Play/App Store presence not satisfied |

### Why we recommend A — React Native + Expo

1. **Codebase + skills reuse.** The team writes TypeScript + React daily for HireStream + Verify. React Native is the same paradigm. Same TSC, same lint, same prettier. The mental model carries over.
2. **Shared types.** We can symlink `hirestream/shared/api-types.ts` (or publish it as a workspace package) so the mobile app's API client uses the **same type definitions** as the backend. This is a meaningful safety net against API drift.
3. **Expo's managed-then-bare path.** Start in Expo managed for the first 2–3 weeks (free OTA updates, no native build setup). When we need custom native modules (e.g., a specific DigiLocker SDK), we "expo eject" to bare workflow without restarting the project.
4. **First-class FCM + APNs.** `expo-notifications` handles both with a single configuration; `@react-native-firebase` is the bare-workflow alternative when we eject.
5. **EAS Build** (Expo Application Services) gives us hosted Android `.aab` and iOS `.ipa` builds with code signing handled — we don't need a Mac in CI for iOS builds.
6. **Mature library ecosystem** for everything FRS asks for: camera (`expo-camera`), document picker (`expo-document-picker`), file upload, secure storage (`expo-secure-store`), deep linking, accessibility primitives.

### Why we are NOT recommending the alternatives

- **Flutter (B)** is excellent but Dart is a new language for the team. Adds 3–4 weeks of ramp + reduces post-launch maintainability with our current staffing.
- **Native (C)** doubles the engineering surface. Justified only if performance or platform-specific APIs are critical — for a job-listing + apply + notify app, they are not.
- **Capacitor (D)** is the cheapest path *but* the FRS requires app store presence and a "real" app. Capacitor-wrapped web apps are often rejected by Apple under guideline 4.2 ("Minimum Functionality") if they don't add value beyond the web. We'd be gambling on App Store review.
- **PWA only (E)** fails the FRS — §2.8 specifically requires "iOS and Android applications." A PWA is not an application in App Store terms.

---

## 3. Recommended stack (full)

```
Layer                  | Choice                                                    | Rationale
-----------------------|-----------------------------------------------------------|--------------------------------------------
Language               | TypeScript                                                | Team standard
Framework              | React Native 0.76+ (new arch / Fabric enabled)            | Performance + future-proof
Tooling                | Expo SDK 52+ (bare workflow after stabilising)            | Fastest dev loop + EAS Build
Navigation             | Expo Router (file-based) OR React Navigation 7            | Expo Router preferred for new projects
State                  | TanStack Query (server state) + Zustand (UI state)        | Same paradigm as web; minimal cognitive load
Forms                  | react-hook-form + zod resolvers                           | Same as web — share schemas with backend
Styling                | NativeWind (Tailwind for RN)                              | Same utility classes as web
HTTP client            | fetch + ky/axios wrapper with bearer-token interceptor    | Standard
Auth storage           | expo-secure-store (Keychain / Keystore)                   | OS-level encryption
Push                   | expo-notifications → FCM (Android) + APNs (iOS)           | One library, two platforms
File picker            | expo-document-picker + expo-image-picker                  | Camera + gallery + file system
Deep links             | Expo Router URLs / expo-linking                           | hpsedc:// scheme + universal links
i18n                   | i18next + react-i18next                                   | English + Hindi (FRS multilingual)
Crash reporting        | Sentry RN SDK                                             | Same Sentry as web (Phase 11 of roadmap)
Analytics              | None in v1.0 (or PostHog if HPSEDC OKs)                   | Defer until product-market questions arise
Build / CI             | EAS Build (Expo Application Services)                     | Hosted Mac builds for iOS — no on-prem Mac needed
Code signing           | EAS managed credentials                                   | Avoids manual cert wrangling
Testing                | Jest + React Native Testing Library                       | Same Jest as backend
E2E testing            | Detox (Android first, iOS later)                          | Industry standard for RN
```

---

## 4. Repository & workspace decision

**Recommendation:** new sibling workspace, not a subdirectory of `hirestream/`.

```
~/Projects/Recruitment/
├── hirestream/             ← existing web + API
├── agentryx-verify/        ← existing test signoff
└── hirestream-mobile/      ← NEW — React Native app
    ├── app/                ← screens (Expo Router file-based)
    ├── components/
    ├── lib/
    │   ├── api-client.ts   ← bearer-token fetch wrapper
    │   ├── auth.ts
    │   └── push.ts
    ├── shared/             ← symlink → ../hirestream/shared/
    ├── app.json
    ├── package.json
    └── eas.json
```

**Why a sibling repo, not a sub-app inside `hirestream/`:**
- Independent build cadence (mobile releases via store, not pm2)
- Different dependency tree (RN ≠ web React)
- Different test runner config
- Cleaner Verify project separation (`hirestream-mobile-v1.0` becomes its own Verify project)
- Easier to delegate to a dedicated mobile engineer without giving them write access to the web backend

**Why not a totally separate repo (GitHub-level):**
- Shared `shared/` types — would need a published npm package, premature
- Co-located development on the same VM, same backups
- One PMD folder for the whole HPSEDC engagement

---

## 5. Build and release flow

```
1. Developer pushes to hirestream-mobile/main
        ↓
2. EAS Build kicks off — produces signed .aab (Android) + .ipa (iOS)
        ↓
3. EAS Submit pushes to Play Store internal track (Android) + TestFlight (iOS)
        ↓
4. Internal testers (Subhash + 2 STIS testers) test for 3–5 days
        ↓
5. Promote to closed beta (HPSEDC + select candidates)
        ↓
6. Promote to production (Play Store production track + App Store)
        ↓
7. Mobile-specific Verify project items signed off → "mobile-v1.0 closed"
```

OTA updates: enable `expo-updates` so that **JS-only bug fixes ship without a store resubmission** within 30 minutes. Native changes (e.g., new permissions, new SDK versions) still require a store build.

---

## 6. Decisions to confirm with HPSEDC before kickoff

| # | Decision | Default if unconfirmed |
|---|---|---|
| 1 | Stack approved? | React Native + Expo (this doc) |
| 2 | Repo location approved? | `hirestream-mobile/` sibling |
| 3 | Play Store + App Store account ownership? | Agentryx accounts, transferred to HPSEDC at signoff |
| 4 | App name + bundle ID? | `gov.hpsedc.placement` / `gov.hpsedc.placement.ios` |
| 5 | Brand assets (icon, splash, colours)? | Reuse HireStream web brand |
| 6 | Multilingual scope for v1.0? | English-only, Hindi in v1.1 |
| 7 | HIM Access mobile SDK available? | If no → in-app WebView OAuth |
| 8 | Aadhaar verification on mobile? | Deep link / WebView, not native |

All of these are non-blocking for planning. They block implementation in the order shown.
