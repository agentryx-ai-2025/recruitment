# Deep / repeatable testing

Run these anytime — before a release, after a big change, or to re-verify a deployed
environment. Three independent layers; each catches a different class of problem.

| Command | What it is | What it catches | Needs |
|---|---|---|---|
| `npm run smoke` | `scripts/deep-smoke.mjs` against a **running** server | broken routes (5xx/404), route-shadowing, missing role guards / privilege escalation | a running instance |
| `npm run test:deep` | `npm test` + `npm run smoke` | the combined gate | both of the above |

## The smoke harness (`scripts/deep-smoke.mjs`)

Environment-agnostic — point it at any running instance:

```bash
npm run smoke                                   # staging (default)
DEEP_URL=http://localhost:5000 npm run smoke    # local dev server
DEEP_URL=https://prod.example npm run smoke     # any environment
```

Credentials default to the seed accounts; override per role with `DEEP_PW_<ROLE>` /
`DEEP_U_<ROLE>` env vars. Exits non-zero on any failure (CI / pre-release gate friendly).

Three layers:
1. **AUTH** — every role logs in; bad password and unauthenticated requests are rejected.
2. **ROUTE HEALTH** — every role's GET endpoints return non-5xx with the `{success:true}`
   envelope.
3. **AUTHZ NEGATIVE MATRIX** — each role is **denied** (401/403) on endpoints belonging to
   other roles, so privilege-escalation / "role X reads role Y's data" regressions surface.

## Extending it

- New endpoint a role should read → add the path to that role's list in `ROLE_ALLOWLIST`.
- New endpoint a role must **not** reach → it will automatically be blocked since we use allowlisting.

## Known gaps (next layers to build)

The current harness is read-only (GET). Not yet covered, in rough priority order:
- **Mutation smoke** — POST/PATCH/DELETE happy-paths + validation rejections (best as Jest
  against the test DB, to avoid mutating shared state).
- **Data-isolation** — ensuring roles can only see data belonging to them or data they have access to.
- **Input-boundary** — empty/oversized/malformed payloads, error-path responses.
