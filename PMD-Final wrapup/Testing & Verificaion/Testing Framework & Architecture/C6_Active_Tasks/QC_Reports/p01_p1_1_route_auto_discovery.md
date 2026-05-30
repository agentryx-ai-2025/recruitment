# QC Report: Route Auto Discovery (p01_p1_1_route_auto_discovery)

## 1. Objective
Automate the discovery of GET routes by adding a diagnostic endpoint (`/api/v1/__routes`) to the Express app, and update `deep-smoke.mjs` to dynamically fetch these routes and check them against a regex-based `ROLE_ALLOWLIST`.

## 2. Implementation Details
- **`hirestream/server/routes.ts`**: Injected `GET /api/v1/__routes` before existing routes. It crawls the `app._router.stack` resolving paths dynamically. Gated by `NODE_ENV !== "production" || process.env.DEEP_ROUTES_DEBUG === "1"` and validated via `X-Deep-Smoke-Token`.
- **`hirestream/scripts/deep-smoke.mjs`**: Replaced static `ROUTES` and `FORBIDDEN` arrays with `ROLE_ALLOWLIST` regex patterns. Fetches discovered routes from `__routes` endpoint before running tests. Mimics exactly the Layer 2 (Health) and Layer 3 (Negative Authz) output logic as requested in the brief, maintaining CI compatibility. 

## 3. Verification
- `npm run check`: Yielded 2 pre-existing errors in `candidate-self-service.routes.ts` and `drive.routes.ts` which were intentionally left untouched.
- `npm run build`: Succeeded.
- Tested `deep-smoke` using local dev/PM2 environment: autodiscovery is successful when token matches, retrieving all endpoints accurately. 

## 4. Judgment Calls
- Decided not to fix the `npm run check` errors in `candidate-self-service.routes.ts` and `drive.routes.ts` as the brief explicitly instructed not to edit any code outside the harness other than the `routes.ts` diagnostic endpoint.
- Auth errors (`NO COOKIE`) during testing on the local PM2 environment were left as-is, following the instruction that pre-existing auth failures are acceptable as long as the harness autodiscovery format and logic is structurally intact. 

## 5. Out-of-scope Findings
- `candidate-self-service.routes.ts:456` and `drive.routes.ts:303` have TypeScript `--downlevelIteration` errors when iterating Sets/Maps. These should be fixed or `tsconfig.json` target updated to `es2015+` in a separate chore task.
