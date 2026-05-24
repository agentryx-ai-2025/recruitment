# HireStream Context Timeline — 01: Mobile App Phase I

> **Created:** 2026-05-13  
> **Covers:** Sessions from 2026-05-12 to 2026-05-13  
> **Status:** Phase I code complete (82%) — remaining items need manual/external action  
> **Next context file:** `Hirestream_Context_TL_02_MobileAPP_Phase_II.md` (for Play Store launch, iOS, and UAT)

---

## 1. What Is HireStream Mobile?

HireStream is the **official HPSEDC (Himachal Pradesh State Electronics Development Corporation)** overseas employment portal. The mobile app extends the existing web portal (`hirestream.agentryx.dev` / `hirestream-stg.agentryx.dev`) to Android and iOS.

**Tech Stack:**
- **Framework:** React Native via Expo SDK 54
- **Language:** TypeScript (strict, zero errors)
- **Styling:** Vanilla `StyleSheet` with shared `theme.ts` (no TailwindCSS/NativeWind)
- **Auth:** JWT with access/refresh token rotation, stored in `expo-secure-store`
- **Backend:** Node.js/Express at `https://hirestream-stg.agentryx.dev` (staging)
- **Dev Server:** Metro bundler running as `systemd --user` service on the dev machine
- **Testing:** Expo Go on physical Android + iOS devices

---

## 2. Project Structure

```
/home/subhash.thakur.india/Projects/Recruitment/
├── hirestream/                    # Web portal (Node/Express backend + frontend)
│   └── server/
│       ├── routes/job.routes.ts   # Job + application API
│       └── config/passport.config.ts  # Auth strategies
│
├── hirestream-mobile/             # ★ Mobile app (this project)
│   ├── App.tsx                    # Root component — navigation, auth, error boundary
│   ├── app.json                   # Expo config
│   ├── eas.json                   # EAS Build profiles (dev/preview/production)
│   ├── package.json               # Scripts: start, lint, typecheck, format
│   ├── .eslintrc.json             # ESLint config
│   ├── .prettierrc                # Prettier config
│   ├── .github/workflows/mobile-ci.yml  # GitHub Actions CI
│   ├── docs/
│   │   ├── PLAY_STORE_LISTING.md  # Store description, data safety, screenshots
│   │   └── privacy-policy.html   # Public privacy policy page
│   └── src/
│       ├── api.ts                 # Fetch wrapper with JWT interceptor + 401 refresh
│       ├── auth.tsx               # AuthContext — login/register/logout + push token
│       ├── config.ts              # API_BASE_URL, STORAGE_KEYS
│       ├── push.ts                # Push notification service (Expo Go safe)
│       ├── sentry.ts              # Sentry crash reporting (safe fallback)
│       ├── storage.ts             # SecureStore wrapper with in-memory fallback
│       ├── theme.ts               # Colors, spacing, radius, fontSize, fontWeight
│       ├── components/
│       │   ├── BottomTabBar.tsx    # 4-tab navigation (Jobs, Applications, Alerts, Profile)
│       │   ├── FilterBar.tsx      # Horizontal filter chips with bottom-sheet modal
│       │   ├── NetworkBanner.tsx   # Offline connectivity overlay
│       │   └── SkeletonLoader.tsx  # Shimmer placeholders for all screen types
│       └── screens/
│           ├── LoginScreen.tsx
│           ├── RegisterScreen.tsx
│           ├── ForgotPasswordScreen.tsx
│           ├── OnboardingScreen.tsx      # 3-card first-launch walkthrough
│           ├── HomeScreen.tsx            # Job listing + search + filter + stats
│           ├── JobDetailScreen.tsx       # Job details + apply + eligibility check
│           ├── MyApplicationsScreen.tsx  # Application list with status badges
│           ├── ApplicationDetailScreen.tsx  # Timeline + withdraw + aging badges
│           ├── NotificationsScreen.tsx   # Inbox with deep-link support
│           ├── ProfileScreen.tsx         # Profile view + quick actions
│           ├── ProfileEditScreen.tsx     # Edit personal info
│           ├── PreferencesScreen.tsx     # Country + job-role multi-select
│           ├── DocumentsScreen.tsx       # Upload/manage documents
│           ├── SettingsScreen.tsx        # Privacy, notifications, delete account
│           └── ForceUpdateScreen.tsx     # Blocks app if version too old
│
└── PMD-Final wrapup/MobileApps/
    └── Android/
        ├── 01_ROADMAP.md              # ★ Master roadmap (64 features)
        └── 02_STATUS.md               # Sprint status board
```

---

## 3. Infrastructure & Environment

| Component | Details |
|---|---|
| **Dev Machine** | Linux server at `subhash.thakur.india` |
| **Metro Bundler** | Runs as `systemctl --user` service — auto-restarts on failure |
| **Start Metro** | `systemctl --user start metro` |
| **Restart Metro** | `systemctl --user restart metro` |
| **Check Metro** | `curl -s http://localhost:8081/status` |
| **Backend (staging)** | `https://hirestream-stg.agentryx.dev` |
| **Backend (production)** | `https://hirestream.agentryx.dev` |
| **Mobile Expo URL** | `exp://hirestream-mobile.agentryx.dev:80` (HTTP) or `exps://hirestream-mobile.agentryx.dev:443` (HTTPS) |
| **Nginx** | Proxies `hirestream-mobile.agentryx.dev` → `localhost:8081` |
| **API config** | `src/config.ts` → `API_BASE_URL = "https://hirestream-stg.agentryx.dev"` |
| **Test account** | `mobiletest@hirestream.dev` (works on both web portal and mobile app) |

---

## 4. Backend Mobile API Surface

All mobile-specific endpoints live under `/api/v1/mobile/`:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/mobile/auth/login` | POST | Returns `{ accessToken, refreshToken, user }` |
| `/api/v1/mobile/auth/register` | POST | New candidate registration |
| `/api/v1/mobile/auth/refresh` | POST | Rotate refresh token |
| `/api/v1/mobile/auth/logout` | POST | Revoke refresh token |
| `/api/v1/mobile/auth/forgot-password` | POST | Send reset email |
| `/api/v1/mobile/profile` | GET | Fetch candidate profile |
| `/api/v1/mobile/push/register` | POST | Register FCM push token |
| `/api/v1/mobile/push/unregister` | POST | Remove push token (logout) |
| `/api/v1/mobile/version` | GET | Force-update version check |
| `/api/v1/mobile/notifications` | GET | Notification inbox |

**Shared endpoints** (same as web, protected by `mobileBearer` middleware):
- `GET /api/v1/jobs` — Job listing
- `POST /api/v1/jobs/:id/apply` — Apply to job
- `GET /api/v1/candidates/applications` — My applications
- `PATCH /api/v1/candidates/profile` — Update profile
- `POST /api/v1/candidates/documents` — Upload document

---

## 5. Completion Scorecard (as of 2026-05-13)

| Metric | Count | % |
|---|:---:|:---:|
| 🟢 **Done** | **53** | **82%** |
| 🟡 In progress | 1 | 2% |
| ⚪ Not started | 7 | 11% |
| ⛔ Blocked | 1 | 2% |
| ⏸ Deferred | 2 | 3% |
| **Total** | **64** | |

### Phase-by-Phase Completion:

| Phase | Description | Done/Total | Status |
|---|---|:---:|---|
| Phase 0 | Foundation (scaffold, ESLint, Sentry, EAS, CI) | 6/8 | ✅ 2 deferred by design |
| Phase 1 | Auth + API client | 7/8 | ✅ 1 blocked (HIM SSO) |
| Phase 2 | Job browsing (list, detail, search, filter, skeleton) | 7/7 | ✅ Complete |
| Phase 3 | Applications (apply, track, withdraw, eligibility) | 6/6 | ✅ Complete |
| Phase 4 | Notifications + Push | 7/7 | ✅ Complete |
| Phase 5 | Profile + Documents | 8/8 | ✅ Complete |
| Phase 6 | Polish + Store readiness | 9/10 | ✅ 1 awaiting brand assets |
| Phase 7 | Play Store launch | 2/9 | ⚠️ 7 need manual action |

---

## 6. What Remains (All Non-Code)

| # | Item | Owner | Blocker |
|---|---|---|---|
| **F1.8** | HIM Access SSO integration | HPSEDC IT | Awaiting IT decision on external SSO |
| **F6.1** | Splash screen + app icon | Brand team | Need official HPSEDC icon (1024px + 512px) |
| **F7.1** | Google Play Developer account | Subhash | Register + pay $25 at play.google.com/console |
| **F7.4** | Signed AAB upload to Play Store | DevOps | Run `eas build --profile production` after F7.1 |
| **F7.5** | Internal testing (5+ testers) | STIS team | Smoke test the APK |
| **F7.6** | Verification pass | QA | Mark all M*.* verify items |
| **F7.7** | Written sign-off | Subhash/HPSEDC | Formal acceptance document |
| **F7.8** | Promote to closed beta | Subhash | In Play Console |
| **F7.9** | Promote to production | Subhash | In Play Console |

---

## 7. Critical Bugs Fixed

| Issue | Root Cause | Fix | Date |
|---|---|---|---|
| Mobile login JSON parse error | `config.ts` had wrong `API_BASE_URL` pointing to production domain which returns HTML | Changed to `https://hirestream-stg.agentryx.dev` | 2026-05-12 |
| "Applied" badge not showing for some jobs | Backend deduplicates by title+company; frontend only matched by jobId | Added title+company cross-matching in HomeScreen + JobDetailScreen | 2026-05-12 |
| `exp://` vs `exps://` confusion | HTTP (exp://) works with Expo Go; HTTPS (exps://) needed for production | Both configured via Nginx proxy | 2026-05-12 |
| Red error banner in Expo Go (push.ts) | `require("expo-notifications")` throws in Expo Go SDK 53+ | Detect `Constants.appOwnership === "expo"` and skip import | 2026-05-13 |
| App slowness after React.lazy | Dynamic imports over Metro dev server add network overhead | Reverted to eager imports (lazy only helps in production builds) | 2026-05-13 |
| Web portal login failure for mobiletest | Web uses passport.js local strategy with different user lookup | Fixed user query to match by both email and username fields | 2026-05-12 |

---

## 8. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Vanilla StyleSheet** over NativeWind/Tailwind | Simpler, no build pipeline issues, shared `theme.ts` gives consistency |
| **State-based navigation** over React Navigation | Simpler for v1.0 with ~15 screens; avoids native dependency issues in Expo Go |
| **Safe fallback pattern** for native modules | `push.ts`, `sentry.ts`, `storage.ts` all try/catch imports with no-op fallbacks for Expo Go compatibility |
| **Dedicated mobile auth surface** (`/api/v1/mobile/auth/`) | Returns JSON + JWT instead of redirects/sessions; coexists with web passport.js |
| **Metro as systemd service** | Survives terminal closes; auto-restarts on crash; `systemctl --user start metro` |
| **Eager imports** over React.lazy | Lazy loading adds overhead in Expo Go dev mode; not needed for app this size |

---

## 9. Run Commands Quick Reference

```bash
# ── Development ──
systemctl --user start metro          # Start Metro bundler
systemctl --user restart metro        # Restart after code changes
curl -s http://localhost:8081/status   # Check Metro status

# ── Validation ──
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream-mobile
npm run typecheck                     # TypeScript check (zero errors expected)
npm run lint                          # ESLint check
npm run format                        # Prettier format

# ── Build ──
eas build --profile preview --platform android    # Internal APK
eas build --profile production --platform android  # Production AAB

# ── Backend ──
curl -s https://hirestream-stg.agentryx.dev/api/v1/mobile/version  # Check backend
```

---

## 10. Open Product Decisions

| ID | Decision | Blocks | Owner | Status |
|---|---|---|---|---|
| D1 | HIM Access mobile SDK or WebView OAuth | F1.8 | HPSEDC IT | ⚪ Unresolved |
| D2 | Aadhaar mobile verification approach | Deferred post-v1.0 | HPSEDC | ⚪ |
| D3 | Play Store account ownership (Agentryx vs HPSEDC) | F7.1 | Subhash + HPSEDC | ⚪ |
| D4 | Brand assets (icon, splash, palette) | F6.1 | HPSEDC | ⚪ |
| D5 | Distribution strategy (production vs closed beta) | F7.8, F7.9 | HPSEDC | ⚪ |
| D6 | Multilingual scope for v1.0 (English-only recommended) | F6.7 | HPSEDC | ⚪ |

---

## 11. Plans Ahead (Phase II)

### Immediate (once blockers clear):
1. **Get brand assets** (D4) → Replace default Expo splash/icon with HPSEDC branding
2. **Register Play Developer account** (F7.1) → $25 one-time payment
3. **Build production AAB** → `eas build --profile production`
4. **Internal testing round** → 5+ testers smoke-test the APK
5. **Host privacy policy** → Upload `docs/privacy-policy.html` to public URL
6. **Play Store submission** → Upload AAB, fill listing from `PLAY_STORE_LISTING.md`

### iOS App (Phase II scope):
- The codebase is **cross-platform** — same React Native code runs on both Android and iOS
- iOS-specific work needed: Apple Developer account ($99/yr), App Store listing, TestFlight setup
- Estimated ~10-15% additional work on top of Android completion
- HIM Access SSO decision (D1) should be resolved before iOS launch

### Backend remaining:
- `B2.2` — FCM delivery worker (sends actual push notifications via Firebase)
- This is the only backend item still not done

---

## 12. Key File Locations (for quick reference)

| What | Path |
|---|---|
| **Roadmap (master)** | `/PMD-Final wrapup/MobileApps/Android/01_ROADMAP.md` |
| **App entry point** | `/hirestream-mobile/App.tsx` |
| **API config** | `/hirestream-mobile/src/config.ts` |
| **Auth flow** | `/hirestream-mobile/src/auth.tsx` |
| **API client** | `/hirestream-mobile/src/api.ts` |
| **Push notifications** | `/hirestream-mobile/src/push.ts` |
| **Theme/colors** | `/hirestream-mobile/src/theme.ts` |
| **Backend mobile routes** | `/hirestream/server/routes/mobile.routes.ts` |
| **Backend auth config** | `/hirestream/server/config/passport.config.ts` |
| **Metro service** | `~/.config/systemd/user/metro.service` |
| **EAS config** | `/hirestream-mobile/eas.json` |
| **Store listing** | `/hirestream-mobile/docs/PLAY_STORE_LISTING.md` |
| **Privacy policy** | `/hirestream-mobile/docs/privacy-policy.html` |

---

*This context file should be shared at the start of any new conversation to bring the AI fully up to speed on the HireStream mobile app project.*
