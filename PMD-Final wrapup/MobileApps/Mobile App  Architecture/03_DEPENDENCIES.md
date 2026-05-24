# 05 — Backend API Adaptations for Mobile

**Repo affected:** `hirestream/` · **Effort:** ~1 senior dev-week · **Can run in parallel with mobile P0/P1**

The HireStream backend currently authenticates via **passport-local + express-session** (cookie-based). Mobile apps don't handle cookies cleanly, and we should not entangle the existing web session contract with a new mobile auth flow. The approach is to add a **parallel JWT/bearer-token surface** at `/api/v1/mobile/*` that produces the same `req.user` downstream, so all existing route handlers continue to work unchanged.

---

## 1. Authentication strategy

### Current state (web)

```
Browser → POST /api/v1/auth/login (email + password)
       → passport-local verifies
       → express-session creates server-side session row (table: session)
       → Set-Cookie: connect.sid=...
       → subsequent requests carry cookie → req.user populated by passport.session()
```

### Mobile additive strategy

```
Mobile app → POST /api/v1/mobile/auth/login (email + password)
          → reuse passport-local strategy to verify
          → instead of creating a session, sign a JWT (access token, 15min TTL)
          → also sign a refresh token (30day TTL, stored hashed in mobile_refresh_tokens table)
          → return { accessToken, refreshToken, user }
          → mobile stores both in expo-secure-store
          → subsequent requests: Authorization: Bearer <accessToken>
          → new middleware mobileBearer() verifies + populates req.user
```

### Why both — not a wholesale migration

- Wholesale migration would touch every web route handler. Risky.
- The two strategies coexist behind a unified `req.user` so route handlers are agnostic.
- Sessions remain the canonical web flow (existing single-session-enforcement logic, the `session` table, the v0.8.3 multi-device handling all stay intact).

### New tables

```sql
CREATE TABLE mobile_refresh_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    text NOT NULL,                  -- bcrypt or SHA-256 of refresh token
  device_id     text,                            -- e.g. "android-PixelOS-abc123"
  user_agent    text,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  rotated_to    uuid REFERENCES mobile_refresh_tokens(id)  -- chain for refresh rotation
);

CREATE INDEX mobile_refresh_user_idx ON mobile_refresh_tokens (user_id, revoked_at);
CREATE INDEX mobile_refresh_hash_idx ON mobile_refresh_tokens (token_hash);

CREATE TABLE mobile_push_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform      text NOT NULL CHECK (platform IN ('android', 'ios')),
  token         text NOT NULL UNIQUE,            -- the FCM or APNs token
  device_id     text,
  app_version   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mobile_push_user_idx ON mobile_push_tokens (user_id);
```

### Token shapes

```ts
// Access token (JWT, signed with HS256 + JWT_SECRET env var)
{
  "sub": "<userId>",
  "role": "candidate" | "agent" | "employer" | "admin",
  "iat": 1715432000,
  "exp": 1715432900,   // +15 min
  "typ": "mobile_access"
}

// Refresh token: 256-bit random string (no claims), hashed in DB
```

### Refresh rotation

```
Mobile calls POST /api/v1/mobile/auth/refresh with { refreshToken }
   → server looks up token_hash
   → if revoked or expired → 401, mobile forces logout
   → else: revoke current row (set revoked_at + rotated_to), insert new refresh row, sign new access token
   → return { accessToken, refreshToken }
```

If a revoked refresh token is presented (reuse detection), revoke the **entire chain** for that user-device — they've been compromised.

---

## 2. New endpoints

All under `/api/v1/mobile/*`:

| Method | Path | Purpose | Returns |
|---|---|---|---|
| POST | `/mobile/auth/login` | Email + password login | `{ accessToken, refreshToken, user }` |
| POST | `/mobile/auth/register` | New candidate registration | Same shape as login |
| POST | `/mobile/auth/refresh` | Rotate refresh + access tokens | `{ accessToken, refreshToken }` |
| POST | `/mobile/auth/logout` | Revoke current refresh token | `{ ok: true }` |
| POST | `/mobile/auth/forgot-password` | Sends reset email | `{ ok: true }` |
| POST | `/mobile/auth/sso/him-access/start` | Returns HIM Access OAuth URL for WebView | `{ url, state }` |
| POST | `/mobile/auth/sso/him-access/complete` | Exchanges OAuth code → bearer tokens | `{ accessToken, refreshToken, user }` |
| POST | `/mobile/push/register` | Stores FCM/APNs token for the logged-in user | `{ ok: true }` |
| DELETE | `/mobile/push/register` | Removes current device's token (on logout / opt-out) | `{ ok: true }` |
| GET | `/mobile/version` | App version check — returns `{ minSupported, latest, forceUpdate }` for kill-switching old clients | `{ ... }` |
| GET | `/mobile/config` | Feature flags exposed to mobile (e.g. multilingual enabled, photo upload enabled) | `{ flags: { ... } }` |

---

## 3. Middleware

New file: `server/auth/mobileBearer.ts`

```ts
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function mobileBearer(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();          // skip; falls through to session
  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.typ !== "mobile_access") return next();
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user) return res.status(401).json({ error: "user_not_found" });
    if (user.deletedAt) return res.status(401).json({ error: "user_deleted" });
    (req as any).user = user;
    return next();
  } catch (e: any) {
    if (e.name === "TokenExpiredError") return res.status(401).json({ error: "token_expired" });
    return res.status(401).json({ error: "invalid_token" });
  }
}
```

Mounted **before** `passport.session()` in `server/routes.ts:60–64`:

```ts
app.use(mobileBearer);           // populate req.user from Bearer if present
app.use(passport.initialize());
app.use(passport.session());     // populate from session cookie if no Bearer
```

All existing route handlers that read `req.user` continue to work — they don't care how the user was authenticated.

---

## 4. Push notification delivery worker

New file: `server/services/pushNotifications.ts`

```ts
import admin from "firebase-admin";                          // FCM
import { JWT } from "google-auth-library";
// APNs handled by FCM v1 multi-platform endpoint, OR @parse/node-apn for direct APNs

import { db } from "../db";
import { mobilePushTokens, notifications } from "@shared/schema";
import { eq } from "drizzle-orm";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FCM_PROJECT_ID!,
    clientEmail: process.env.FCM_CLIENT_EMAIL!,
    privateKey: process.env.FCM_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  }),
});

export async function sendPushForNotification(notificationId: string) {
  const [n] = await db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1);
  if (!n || !n.userId) return;
  const tokens = await db.select().from(mobilePushTokens).where(eq(mobilePushTokens.userId, n.userId));
  if (!tokens.length) return;

  const message = {
    notification: { title: n.title, body: n.body },
    data: { notificationId: n.id, type: n.type, link: n.link ?? "" },
    tokens: tokens.map((t) => t.token),
  };
  const resp = await admin.messaging().sendEachForMulticast(message);

  // Cleanup invalid tokens
  for (let i = 0; i < resp.responses.length; i++) {
    const r = resp.responses[i];
    if (!r.success && (r.error?.code === "messaging/registration-token-not-registered"
                    || r.error?.code === "messaging/invalid-registration-token")) {
      await db.delete(mobilePushTokens).where(eq(mobilePushTokens.token, tokens[i].token));
    }
  }
}
```

This is **called from the existing notification-creation path** in `notification.routes.ts` and `server/services/notifications.ts` immediately after a new notification row is inserted. Single line addition:

```ts
const [n] = await db.insert(notifications).values({...}).returning();
sendPushForNotification(n.id).catch((e) => console.error("push failed", e));   // fire-and-forget
return n;
```

FCM in v1 mode delivers to both Android (FCM native) and iOS (FCM → APNs bridge). Means **one SDK, one config, both platforms** — major simplification.

---

## 5. Environment variables (new)

| Variable | Purpose | Example |
|---|---|---|
| `JWT_SECRET` | Signs/verifies mobile access tokens | 64-char random hex |
| `JWT_ACCESS_TTL_SEC` | Access token lifetime | `900` (15 min) |
| `JWT_REFRESH_TTL_SEC` | Refresh token lifetime | `2592000` (30 days) |
| `FCM_PROJECT_ID` | Firebase project ID | `hpsedc-placement` |
| `FCM_CLIENT_EMAIL` | Service account email | `firebase-adminsdk-xxx@...iam.gserviceaccount.com` |
| `FCM_PRIVATE_KEY` | Service account private key | escaped multi-line |
| `MOBILE_MIN_SUPPORTED_VERSION` | Force-update kill switch | `1.0.0` |
| `MOBILE_LATEST_VERSION` | Latest version for soft prompt | `1.0.2` |

All loaded via the existing dotenv setup. No code changes to `server/index.ts` for env handling.

---

## 6. Security considerations

1. **Token storage on device** — bearer tokens in `expo-secure-store` (backed by Android Keystore + iOS Keychain). Never `AsyncStorage`.
2. **Refresh rotation + reuse detection** — covered above.
3. **Brute-force on mobile login** — reuse the existing `authLimiter` rate limiter on `/api/v1/mobile/auth/login` (it's already mounted at `app.use("/api/v1/auth", authLimiter, ...)` for web).
4. **Account deletion** — when `DELETE /api/v1/me` is called (existing) or its new mobile variant, also revoke all mobile_refresh_tokens + mobile_push_tokens for that user.
5. **Single-session-per-user setting** — when this is ON (`auth.single_session_per_user`), a mobile login should revoke other mobile refresh tokens for that user. Web sessions are independent.
6. **CSRF** — bearer tokens are immune (no cookies). For mobile, CSRF protection is N/A.
7. **TLS pinning** — optional in v1.0, recommended in v1.1. Use `react-native-ssl-pinning` post-eject.
8. **JWT secret rotation** — keep a `JWT_SECRET` and `JWT_SECRET_PREVIOUS` so we can rotate without invalidating active sessions during a 24-hour window.

---

## 7. Migration + rollout

1. Add migration `xxxx_mobile_auth_and_push.sql` creating the two new tables.
2. Ship the new middleware behind no flag — Bearer header is opt-in.
3. Ship the new routes behind no flag — they coexist with web auth.
4. Ship `firebase-admin` as a new dependency.
5. Smoke-test on staging using the curl pattern from `E2E_Workflow__Final_STG.md` adapted for bearer auth.
6. Add Verify items in `agentryx-verify` project for the mobile API: M1.1 login, M1.2 refresh, M1.3 logout, M1.4 push register, M1.5 push delivery (the existing `seed-v15-extras.ts` style upsert).
7. Pipeline test: extend the existing 58-test pipeline to add a 17th "mobile bearer auth" suite — login, refresh rotation, reuse detection, push token register/revoke.

---

## 8. Backend exit criteria

- [ ] All 11 new endpoints documented + curl-tested on staging
- [ ] `mobileBearer` middleware + route handlers green in jest (target: 12+ tests)
- [ ] Pipeline suite still green (58 → 70+ after new mobile tests)
- [ ] FCM dev project configured, a test push delivered to a real Android device
- [ ] An APNs auth key uploaded to FCM, a test push delivered to a real iPhone (via TestFlight build)
- [ ] Migrations applied cleanly on staging DB
- [ ] Verify items M1.1–M1.10 seeded and ready for STIS signoff
- [ ] Release notes row in HireStream changelog: `v1.0.0 (api-mobile-surface)`
