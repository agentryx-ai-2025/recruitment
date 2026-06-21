This lists the **HireStream-specific** hardware, software, network and access requirements for deployment on government infrastructure (**Staging + Production**). It assumes the IT team's standard policies — OS hardening, NTP, logging, base monitoring, firewall hygiene — are already in place; only items specific to this application are stated.

> **Air-gapped.** The VMs are isolated from the internet, accessed via SSH through a Windows jump host. So the software in §2 must be **pre-installed (or available on an internal package mirror)**; HTIS delivers the application and its dependencies as a **pre-built artifact via the jump host** — no online build runs on the server.

> **Assumptions — please confirm:** HP State Data Centre hosting; PROD sized to the FRS target of 5,000 concurrent users; one VM per environment (application + PostgreSQL co-located); 99.9% uptime via a single VM + standard backups (a standby DB replica can be added if a penalty-backed SLA applies).

## 1. Hardware

| Resource | Staging (STG) | Production (PROD) |
|----------|---------------|-------------------|
| vCPU | 4 | **8** |
| RAM | 8 GB | **16 GB** |
| Disk (SSD) | 100 GB | **200 GB** (expandable) |
| Apps hosted | HireStream + Verify + DB | HireStream + DB |

*Separate VMs. Candidate document uploads grow disk over time — please allow online disk expansion, or provide object storage.*

## 2. Software to pre-install / stage on disk (air-gapped — exhaustive)

As the server has **no internet access**, every item below must be **pre-installed, or staged on local disk / an internal apt mirror**, before handover. Versions match our dev & staging environment.

| Category | Software | Version | Purpose |
|----------|----------|---------|---------|
| Operating system | **Ubuntu Server LTS** | **24.04 LTS** (Noble) | Base OS — same as our other deployments |
| Base & build | build-essential (gcc, g++, make), python3 | distro | Native module builds (e.g. bcrypt) |
| Base & build | git, curl, wget, unzip, tar, rsync | distro | Deployment / artifact transfer |
| Base & build | ca-certificates, openssl | distro | TLS / crypto |
| Runtime | **Node.js** | 20.x LTS (20.20+) | Application runtime |
| Runtime | **PM2** (global npm) | 6.x | Process manager — clustering + auto-restart |
| Database | **PostgreSQL** server + client + contrib | 16.x (16.14+) | Primary database |
| Web / proxy | **Nginx** | 1.24+ | TLS reverse proxy, static serving, rate limiting |
| Optional | Redis | 7.x | Session store / cache |

> **PM2** is a global npm package — it (and the build tools) must also be available **offline**. Our application's own npm dependencies are bundled into the delivered artifact, so those are **not** needed from IT.

## 3. Network & integration egress

**Ports:** 443 (HTTPS in) · 80 → 443 redirect · 22 (SSH, **from jump host only**) · Node ↔ PostgreSQL on localhost.

Internet egress is blocked, but the portal needs **outbound reachability to these government services** (via the internal network or a firewall exception) — otherwise the integrations cannot function:

- HIM Parivar / HIM Access SSO · Aadhaar / UIDAI · DigiLocker · Government Email (SMTP) · Government SMS gateway

> Please advise which are reachable on the internal government network vs require firewall exceptions.

## 4. TLS certificates

Air-gapped, so Let's Encrypt / ACME is not possible. Please provide CA-issued certificates (full chain + private key) for:

- **PROD** domain: `__________________________`  ·  **STG** domain: `__________________________`

## 5. Access required

| # | Access | Detail |
|---|--------|--------|
| 1 | SSH via jump host | Named service account with **sudo** (app, PM2, Nginx) |
| 2 | File transfer via jump host | SCP/SFTP path for the app artifact + updates |
| 3 | PostgreSQL | Database + role able to create schema / extensions |
| 4 | Backup target | Location for DB dumps + VM snapshots |

## 6. Deployment & operations

HTIS builds the release on a matching platform → transfers it via the jump host → runs database migrations → restarts under PM2 (rollback = previous artifact + DB snapshot). Daily PostgreSQL dump + WAL archiving to the backup target supports the 99.9% target.

## Checklist for the IT team

- ☐ STG + PROD VMs provisioned (4 / 8 / 100 · 8 / 16 / 200)
- ☐ Ubuntu 24.04 LTS + Node 20 + PM2 + PostgreSQL 16 + Nginx (pre-installed or staged offline)
- ☐ TLS certificates provided for both domains
- ☐ Firewall: 443 / 80 / 22 + integration egress
- ☐ SSH service account + SFTP path + PostgreSQL database & role
- ☐ Backup target allocated
