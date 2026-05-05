# Agentryx Verify

**UAT sign-off portal** for scope-to-delivery traceability across multi-stage reviewer pipelines.

Production: https://verify.agentryx.dev

---

## What it is

Agentryx Verify tracks acceptance of delivered software against a formal scope document (FRS, SOW, etc.). Currently used to sign off [HireStream](https://github.com/microaistudio/hirestream) deliverables, but designed as a **standalone product** that can be used for any project with multi-party review.

### The review workflow it supports

```
 DELIVERY  →  INTERNAL REVIEW  →  CONTRACTOR  →  CLIENT STAGING  →  CLIENT FINAL
 (Agentryx)   (Agentryx QA)      (HTIS)          (HPSEDC STG)       (HPSEDC UAT)
```

Each stakeholder is a separate login with role-scoped access. They see only their stage's pipeline and make Pass / Partial / Fail decisions on each requirement.

### Key features

- **Multiple projects per instance** — each project is a separately sign-offable scope (e.g. `hirestream-v1.4` for FRS contracted scope + `hirestream-v1.5-extras` for beyond-FRS enhancements).
- **4-stage approval pipeline** per project: Agentryx Internal → HTIS → HPSEDC Staging → HPSEDC Final UAT.
- **Role-scoped reviewers** — HTIS reviewer only sees the HTIS tab; cross-stage decisions are hidden from non-admins (prevents bias).
- **Per-requirement**: how-to-test instructions, expected result, sign-off decision (Pass / Partial / Fail / Clear), discussion thread, issue log.
- **Project dashboard** — overall approval %, role-card breakdowns (Candidate / Agency / Employer / Officer / Cross-cutting), per-section progress bars.
- **Export** — CSV + PDF of the full sign-off matrix per project.
- **Audit log** — every sign-off change recorded with reviewer + timestamp.

## Companion project

[microaistudio/hirestream](https://github.com/microaistudio/hirestream) — the first product tracked by Verify. Kept in a separate repo because:

- Different ownership (HireStream is a deliverable to HPSEDC; Verify is Agentryx-owned).
- Different deploy cadence.
- Verify is reusable for other HPSEDC / MEA / state-government projects — keeping it decoupled preserves that optionality.

Both run on the same VM today but are fully independent (separate DB, process, nginx vhost).

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + wouter + TanStack Query |
| Backend | Node.js 20 + Express + express-session + bcryptjs |
| Database | PostgreSQL 14+ via Drizzle ORM |
| PDF | PDFKit (sign-off report export) |
| Process | PM2 + nginx + Let's Encrypt |

## Repository structure

```
AgentryxVerify/
├── client/                  React frontend
│   └── src/pages/           Home, Login, ProjectView (main sign-off surface)
├── server/                  Express backend
│   ├── config/              db, env
│   └── routes/              auth, projects, export
├── shared/
│   └── schema.ts            Drizzle ORM schema (projects, requirements, signoffs, reviewers, comments, issues, magic_links, audit_log)
├── scripts/
│   ├── seed.ts              Seeds the HireStream FRS compliance matrix (145 items)
│   └── seed-v15-extras.ts   Seeds the beyond-FRS enhancements as a second project (83 items, 6 role-aligned sections)
├── dist/                    built output
└── .env                     DATABASE_URL, SESSION_SECRET, APP_URL, ALLOW_EMAIL_LOGIN
```

## Local development

```bash
# 1. Prerequisites: Node 20+, PostgreSQL 14+

# 2. Clone + install
git clone https://github.com/microaistudio/agentryx-verify.git
cd agentryx-verify
npm install

# 3. Create the database
sudo -u postgres psql <<'SQL'
CREATE USER hirestream WITH PASSWORD 'hirestream';
CREATE DATABASE agentryx_verify OWNER hirestream;
SQL

# 4. Environment
cat > .env <<'ENV'
NODE_ENV=development
PORT=5002
DATABASE_URL=postgresql://hirestream:hirestream@localhost:5432/agentryx_verify
SESSION_SECRET=dev-only-change-me
APP_URL=http://localhost:5002
ALLOW_EMAIL_LOGIN=true
ENV

# 5. Push schema + seed both projects
npx drizzle-kit push --force
npx tsx scripts/seed.ts           # FRS contracted scope (145 rows)
npx tsx scripts/seed-v15-extras.ts # Beyond-FRS enhancements (83 rows, 6 sections)

# 6. Start dev
npm run dev
```

Open http://localhost:5002

## Demo accounts (after seeding)

| Username | Password | Role | Scope |
|---|---|---|---|
| `admin` | `ulan@2026` | Admin | All 4 pipelines + cross-stage visibility |
| `agentryx` | `ulan` | Agentryx Internal | Only the Agentryx stage |
| `htis` | `test123` | HTIS Reviewer | Only the HTIS stage |
| `hpsedc` | `test456` | HPSEDC Staging | Only the Staging stage |
| `uat` | `test789` | HPSEDC Final UAT | Only the Final UAT stage |

Non-admin reviewers see exclusively their own tab — other stages are hidden for unbiased review.

## Production deploy

Follow the staging-VM setup guide in the HireStream repo: [`A.PMD/Deployment Package/02_Staging_VM_Setup.md`](https://github.com/microaistudio/hirestream/blob/main/A.PMD/Deployment%20Package/02_Staging_VM_Setup.md) — includes the Verify service setup as step 5.

Updating after a git push:

```bash
git pull
npm install
npm run build
pm2 restart agentryx-verify --update-env
```

## Extending to track a new project

1. Write a seed script similar to `scripts/seed-v15-extras.ts`
2. Define the requirement rows with itemRef, section, description, testSteps, expectedResult
3. Run the script — it creates a new row in the `projects` table
4. Invite reviewers via the Admin UI (or add them to the seed script)

The data model (projects, requirements, signoffs, reviewers) is generic — nothing is hardcoded to HireStream.

## License

Private. © Agentryx. See repo owner for licensing terms if you're interested in adapting this for your own projects.

## Contact

[agentryx.dev](https://agentryx.dev) · Subhash Thakur · `subhash.thakur2010@gmail.com`
