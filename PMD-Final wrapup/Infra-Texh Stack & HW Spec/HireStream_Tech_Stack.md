HireStream — the HPSEDC Overseas Placement Portal & Mobile Application — is a secure, bilingual, cloud-native platform built on a modern, proven, open-source technology stack. This sheet summarises the technologies used and how they fit together.

```
ARCH
```

## Web front-end

| Area | Technology |
|------|------------|
| Core | **React 18** + **Vite** + **TypeScript** |
| Routing & data | Wouter (routing), TanStack Query (server-state & caching) |
| Forms & validation | React Hook Form + **Zod** (schema validation) |
| UI & styling | Radix UI / shadcn components, **Tailwind CSS**, Recharts (charts) |
| Localisation | **i18next** — bilingual English + Hindi |

## Back-end & API

| Area | Technology |
|------|------------|
| Runtime | **Node.js** + **Express** + **TypeScript** |
| API | Versioned **REST** API (`/api/v1`), JSON over HTTPS |
| Data access | **Drizzle ORM** + drizzle-zod (schema-derived validation) |
| Background jobs | node-cron (digests, SLA checks), Winston (structured logging) |

## Database & storage

| Area | Technology |
|------|------------|
| Database | **PostgreSQL** — ~36 relational tables + an immutable audit log |
| Files | Namespaced document/photo storage; uploads verified by file type & magic-bytes (PDF / JPG / PNG) |

## Security

| Area | Technology |
|------|------------|
| Access control | **Role-Based Access Control** (Candidate / Agency / Employer / Admin) |
| Authentication | passport + express-session (PostgreSQL-backed, rolling idle timeout), **OTP** (otplib), **JWT** for mobile, bcrypt password hashing |
| Hardening | Helmet security headers, rate limiting, input validation, encrypted integration credentials, full audit trail |

## Mobile application

| Area | Technology |
|------|------------|
| Apps | **React Native + Expo** — Android & iOS, consuming the same REST API |
| Features | Mobile auth (refresh tokens), push notifications, offline-tolerant config |

## Documents & communications

| Area | Technology |
|------|------------|
| Generation | PDFKit (PDF), QRCode, Archiver (bulk ZIP export) |
| Messaging | In-app notifications, Nodemailer (email), pluggable SMS adapters |

## External integrations — pluggable & admin-configurable

> **HIM Access SSO · Aadhaar / UIDAI · DigiLocker · Email & SMS gateways** — all designed as adapters and activated from the admin console once production credentials are provided. No code change required to switch providers.

## Infrastructure & deployment

| Area | Technology |
|------|------------|
| Hosting | **Linux** · **Nginx** (TLS reverse proxy) · **PM2** process management |
| Cloud | Deployable to government cloud / **State Data Centre**; stateless API scales horizontally |
| Targets | Page load **< 3s** · **5,000** concurrent users · **99.9%** uptime · data backups + health monitoring |

## Standards & compliance

- **GIGW** — accessibility for *divyangjans*, State-Government header uniformity
- **HTTPS / TLS** encryption in transit; sensitive data encrypted at rest
- **ISO 27001**-aligned security practices; GDPR / PDPA-equivalent data protection

## Why this stack

- **Modern & proven** — industry-standard, actively maintained open-source technologies.
- **Secure by design** — RBAC, encryption, hardened sessions, and complete audit trails.
- **Scalable & cloud-ready** — stateless API and horizontal scaling for growth.
- **Maintainable** — TypeScript end-to-end, modular design, documented for handover.
