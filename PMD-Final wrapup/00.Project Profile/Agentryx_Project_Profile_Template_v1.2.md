<!--
AGENTRYX PROJECT PROFILE — STANDARD TEMPLATE & AUTHORING GUIDE
Machine-readable source of truth. Version 1.2.
This file is the canonical spec an authoring agent ingests to produce a project profile.
The companion PDF is the human-facing render of this same content.
-->

# Agentryx Project Profile — Standard Template & Authoring Guide
**Version 1.2 · Internal standard · Author: Agentryx AI Labs**

> **What changed in v1.2 (from v1.1).** v1.1 was implicitly written around AI / computer-vision
> engagements (its Technology-Stack groups and tag taxonomy assumed CLIP / FAISS / vision work).
> v1.2 **generalises the template to any engagement type** — AI/ML, full-stack product, platform,
> data, GovTech, advisory — without changing the section structure. Specifically: §5 Technology
> Stack now uses a **superset of categories, of which you use only those that apply** (AI/ML,
> Vision/CV and Vector & data are now optional); Appendix A gains **non-AI tag categories**
> (web/product, integrations & payments, workflow/BPM, data & integrity, DevOps/release, security,
> QA); and the guidance notes say so explicitly. Sections, design principles, and the quality
> checklist are unchanged. Two worked examples are referenced: an AI/CV one (Vardhman) and a
> full-stack/GovTech one (HP Tourism eServices Portal).

---

## Purpose

This document defines the standard format for an **Agentryx Project Profile** — a concise (2–3 page) case study of a delivered or in-progress project. Each profile records **what was built, the capabilities and expertise it demonstrates, and the technology and architecture used.**

Profiles are written to be read two ways: by **people** (clients, partners, evaluators) who need to grasp our experience in seconds, and by **AI assistants**, so a chatbot can answer *"What can Agentryx do, and with what stack?"* directly from these files. Give this spec to the agent working on any project — **of any type, AI or not** — and it returns a complete, consistent profile for the Agentryx profile library — reusable to evaluate our capability, to scope and estimate new work, and to feed promotional material without rebuilding anything.

## How to use this template (for the authoring agent)

- Produce **one profile per project**, 2–3 pages (≈ 900–1,500 words); 4 pages is acceptable for a large multi-module platform.
- Complete **every section in the order given**, and keep the section headings **exactly as written** — consistent structure is what makes AI retrieval reliable.
- Write in the **third person**, factual and evidence-led ("Agentryx designed, built and deployed…"). No marketing fluff.
- Lead with the **front-matter** and the **Snapshot** — they carry the highest retrieval value.
- Name technologies, capabilities and outcomes **explicitly**; never imply them.
- **The profile suits any engagement type.** For a non-AI project, the AI/ML, Vision/CV and Vector & data stack groups simply don't apply — omit them and use the categories that fit (see §5). Do not invent AI content to fill a template slot.
- **Label any figure** that is projected or modelled rather than measured.
- Author in **Markdown** (this format is the master); export a **PDF** for human sharing.
- When needed, generate two variants from one master: a **Public** version (sections 0–9, client anonymised) and an **Internal** version (adds section 10 and commercial detail).
- Before declaring done, run the **Quality Checklist** at the end.

## Design principles

1. **Dual-readability** — a human skims the top and gets it in 30 seconds; an AI parses the labelled sections, front-matter and tags.
2. **Self-contained sections** — each can be retrieved and understood on its own.
3. **Explicit over implied** — state the tech, the capability, the result.
4. **Consistent structure** — identical headings across every project.

---

## The format

Each profile contains the sections below. For each, the *Purpose / Include / Guidance* notes tell the agent exactly what to produce.

### 0 · Metadata header (YAML front-matter)

A machine-readable block at the very top of every profile, so AI/RAG systems parse the facts perfectly. Use this exact key set:

```yaml
---
project:            # official or internal name / codename
client_sector:      # named, or a descriptor if NDA-restricted
industry:           # e.g. textiles & apparel, manufacturing, GovTech / e-governance
engagement_type:    # R&D | product build | platform | data | advisory (combine as needed)
duration_status:    # e.g. 2025–2026 · in delivery / completed
team:               # size & roles
delivery_model:     # on-prem | cloud | hybrid | air-gapped
descriptor:         # one quotable sentence
tags: []            # 8–15 keywords — see Appendix A
confidentiality:    # Public | Internal
version:            # vX.Y
date:               # DD Mon YYYY
---
```

### 1 · Snapshot
- **Purpose.** A 3–4 sentence, fully self-contained summary.
- **Include.** What it is, the problem, what we built, and the result.
- **Guidance.** Write so it stands alone if it is the only thing an AI retrieves.

### 2 · The Challenge
- **Purpose.** Establish why the work mattered.
- **Include.** The client's situation, the pain, and the constraints — scale, data quality, on-prem/air-gapped requirements, legacy systems, regulatory rules.
- **Guidance.** Be concrete about the hard constraints; they justify the design choices later.

### 3 · What We Built (the solution)
- **Purpose.** The narrative of the delivered work.
- **Include.** The approach, the system, and the key modules or features shipped.
- **Guidance.** Describe outcomes of building, not a task list; keep it readable.

### 4 · Architecture & How It Works
- **Purpose.** Show the engineering depth.
- **Include.** The technical architecture, the data/flow, and the key design decisions *with their rationale* (e.g. on-prem for data sovereignty; config-in-DB because policy changes by order).
- **Guidance.** Make it diagram-ready; one clear paragraph per layer or stage.

### 5 · Technology Stack
- **Purpose.** An explicit, categorised list so an AI can match specific tech.
- **Include.** Group under the categories that **fit the project** — use only those that apply, omit the rest:
  - **Frontend** · **Backend** · **Data** · **Integrations** · **Infra & deployment** · **Security & compliance** · **QA & testing** *(use for any project)*
  - **AI/ML models** · **Vision/CV** · **Vector & data** *(use for AI/ML/CV projects)*
  - **Hardware** *(if any)*
- **Guidance.** Name real tools (React, FastAPI/Express, PostgreSQL, Drizzle, Docker — or CLIP, FAISS, pgvector, vLLM), not generic categories. A profile that has no AI/Vision/Vector lines is correct, not incomplete.

### 6 · Capabilities & Expertise Demonstrated  *(Capability → Evidence)*
- **Purpose.** The explicit capability claim — the heart of the profile.
- **Include.** Each competency as a **Capability → Evidence** pair: the capability, then where on this project it was proven.
- **Guidance.** Phrase each capability as something an evaluator can match against a need; back every claim with concrete evidence. Capabilities span engineering, integration, workflow, data, security, release engineering, product/UX and advisory — not only AI.

### 7 · Hard Problems Solved / Innovations
- **Purpose.** The differentiators.
- **Include.** The genuinely difficult problems and how they were solved; any novel approach or proprietary method.
- **Guidance.** Two to four items; show the insight, not just the feature.

### 8 · Outcomes & Impact
- **Purpose.** The value delivered.
- **Include.** Results, business impact and metrics where available (efficiency, accuracy, cost, revenue, ROI, adoption, throughput).
- **Guidance.** Clearly label any figure that is projected or modelled vs measured.

### 9 · Roadmap & Evolution  *(optional)*
- **Purpose.** Show long-horizon, strategic thinking.
- **Include.** The phases delivered and the direction ahead.
- **Guidance.** Keep brief; it signals partnership beyond a one-off build.

### 10 · Reusable IP & Assets  *(optional · internal)*
- **Purpose.** Capture transferable value for future bids.
- **Include.** Frameworks, components, models, engines, methodologies or accelerators created that carry over.
- **Guidance.** Internal/partner versions only — omit from public-facing profiles.

### References / Artifacts
List supporting artifacts (decks, demos, repos, reports) with links where available. Builds credibility and gives an AI pointers to deeper material.

---

## Quality checklist (run before declaring done)

- [ ] Front-matter complete, all keys filled, 8–15 tags present.
- [ ] Snapshot is self-contained (makes sense with nothing else).
- [ ] Every technology **named** specifically — no generic categories.
- [ ] §5 uses **only the stack categories that apply** (no empty AI/Vision lines on a non-AI project).
- [ ] Every capability in §6 backed by **evidence** (Capability → Evidence).
- [ ] Architecture explains key decisions **and why**.
- [ ] Every number labelled **measured vs projected/modelled**.
- [ ] Hard-problems section shows **insight**, not just features.
- [ ] Length 2–3 pages (4 for a large platform); third person; no marketing fluff.
- [ ] Confidentiality + version + date set; Public/Internal variant correct.
- [ ] Section headings **verbatim** from this template.

## Conventions

- **Length** — 2–3 pages (≈ 900–1,500 words); up to 4 for a large multi-module platform.
- **Tone** — third person, factual, evidence-led.
- **Client naming** — name the client unless NDA-restricted; then use a sector descriptor.
- **Confidentiality** — mark each profile Public or Internal.
- **Versioning** — "vX.Y · date" on every profile.
- **Numbers** — always distinguish measured from projected/modelled.

---

## Appendix A · Tag taxonomy

Draw 8–15 tags per profile from these categories; add new tags as the work warrants. Tags power AI matching of capability to need. **Use the rows that fit the project** — AI rows for AI work, the web/integration/ops rows for product & platform work.

| Category | Example tags |
|---|---|
| **AI / ML** | CLIP, vision transformer, embeddings, fine-tuning, RAG, LLM, on-prem LLM, classification, zero-shot |
| **Vision / CV** | image similarity, semantic segmentation, GLCM texture, colour science (CIELAB / ΔE2000), motif detection |
| **Vector & data** | FAISS, pgvector, PostgreSQL, HNSW, vector search, metadata extraction |
| **Backend** | FastAPI, Express, Node.js, Python, TypeScript, REST, background jobs, Drizzle ORM |
| **Frontend** | React, Next.js, Vite, wouter, TailwindCSS, design system, dashboarding |
| **Data & integrity** | PostgreSQL, schema design, migrations, atomic counters, reconciliation, audit log |
| **Integrations & payments** | payment-gateway integration, eChallan, treasury/banking, third-party API, PDF generation, e-signature |
| **Workflow / BPM** | approval pipeline, role-based routing, state machine, status lifecycle, correction loops |
| **Infra / deploy** | on-prem, air-gapped, Docker, GPU inference, vLLM, MinIO, hybrid cloud, PM2, release engineering |
| **Security & compliance** | RBAC, SSO/JWT, data sovereignty, configurable policy engine, regulatory rules |
| **QA / testing** | test automation, E2E, smoke tests, regression suite, two-gate completion |
| **Domain** | textiles, apparel, sourcing, ESG, manufacturing, GovTech, e-governance, tourism, public services |
| **Capability** | solution architecture, cost modelling, enterprise integration, data strategy, MLOps, DevOps |

---

## Appendix B · Blank skeleton (copy-paste)

```markdown
---
project:
client_sector:
industry:
engagement_type:
duration_status:
team:
delivery_model:
descriptor:
tags: []
confidentiality:
version:
date:
---

# PROJECT PROFILE — [Project name]

## 1. Snapshot
[3-4 sentences, self-contained]

## 2. The Challenge
[situation, pain, constraints]

## 3. What We Built
[approach, system, key modules]

## 4. Architecture & How It Works
[layers, data flow, key decisions + why]

## 5. Technology Stack
# use only the categories that apply:
- Frontend:
- Backend:
- Data:
- Integrations:
- Infra & deployment:
- Security & compliance:
- QA & testing:
- AI/ML models:        (AI projects)
- Vision/CV:           (AI projects)
- Vector & data:       (AI projects)
- Hardware:            (if any)

## 6. Capabilities & Expertise Demonstrated
- [Capability] -> [evidence on this project]
- [Capability] -> [evidence on this project]

## 7. Hard Problems Solved / Innovations
- [problem -> how solved / why it was hard]

## 8. Outcomes & Impact
[results / metrics; label measured vs projected]

## 9. Roadmap & Evolution        (optional)
[phases, direction]

## 10. Reusable IP & Assets       (optional / internal)
[frameworks, components, engines, accelerators]

## References / Artifacts
[decks, demos, repos, reports]
```

---

## Appendix C · Worked examples (gold standard)

Two reference profiles bracket the range of Agentryx work. Use them as the quality bar.

- **AI / computer-vision:** *Vardhman AI-Powered Sourcing Platform* — an on-prem CLIP + 4-pillar fabric-matching engine (FAISS/pgvector, on-prem LLMs). The canonical AI example; full text retained from v1.1 below.
- **Full-stack / GovTech:** *HP Tourism eServices Portal* — a configuration-driven, multi-service e-governance platform (React/TypeScript, Node/Express, PostgreSQL/Drizzle, HimKosh payment integration, air-gapped 4-environment delivery). The canonical **non-AI, full-stack/product** example; see `HP-Tourism-eServices-Portal_Project-Profile_v1.0.md` in this folder.

*The Vardhman profile, authored to this template, follows.*

```yaml
---
project: Vardhman AI-Powered Sourcing Platform (AI Hub working names: Sutra / Sutradhar / Cortex)
client_sector: Vardhman Group — textiles & apparel (one of India's largest vertically-integrated textile manufacturers; supplies global brands)
industry: Textiles & apparel manufacturing; fabric sourcing
engagement_type: R&D + product build + solution & cost advisory
duration_status: 2025–2026 · in delivery (Phase 1 foundation built; phased rollout)
team: ~8–13 across solution architecture, ML/CV, GenAI/LLM, full-stack, DevOps, UX, project management
delivery_model: On-prem (data sovereignty)
descriptor: An on-prem AI sourcing platform that turns a fabric image into the right match across a 70,000-SKU catalogue in seconds, powered by a proprietary, explainable 4-pillar matching engine.
tags: [CLIP, vision transformer, image similarity, 4-pillar engine, colour science, CIELAB, ΔE2000, GLCM texture, FAISS, pgvector, on-prem LLM, RAG, FastAPI, React, Docker, GPU inference, textiles, sourcing, ESG, solution architecture, cost modelling]
confidentiality: Internal
version: v1.0
date: [date]
---
```

**1. Snapshot.** Vardhman's sourcing teams narrowed a 70,000+ fabric catalogue using a slow spreadsheet-and-thumbnail workflow — 8–14 minutes per query, with no visual AI. Agentryx designed and is delivering an on-prem AI sourcing platform that matches fabrics visually in under a second, pairing the CLIP visual backbone with a proprietary, explainable **4-pillar engine** (Colour · Pattern · Texture · Finish) and auto-extracted metadata. It is delivered in phases — a visual foundation, a capture + engine uplift, and an on-prem AI Hub of modular capsules — with all data kept inside Vardhman's firewall.

**2. The Challenge.** 70,000+ fabrics sat across 100–200 metadata fields that were mostly blank or decades old; there was no visual AI, so every "find a similar fabric" was human-eyed. The live image library was Photoshop-rendered exports (zero camera EXIF), which caps achievable accuracy on texture and finish. Hard constraints: strict **on-prem / data sovereignty** (global-brand confidentiality), a conservative enterprise buyer, and a need for **sub-second** performance at full catalogue scale alongside a legacy content system (FCMS).

**3. What We Built.** *Phase 1 (Foundation):* sub-second visual match on the full 70K library; the proprietary 4-pillar DNA engine on a CLIP backbone; a SpotLight discovery mode; a live calibrator; **per-match pillar bars** that show *why* each fabric ranked (explainability); saved searches, Excel/CSV/PDF export, role-based access; and continuous auto metadata backfill. *Phase 2:* studio capture stations plus engine uplift — colour calibration, cross-polarised finish separation, motif-scale measurement, textile-tuned embeddings. *Phase 4:* an on-prem AI Hub of modular capsules (natural-language sourcing, tech-pack parsing, RSL compliance pre-check, Customer 360, duplicate detection). One engine, four persona cockpits (Designer, Sourcing, Buyer, Admin).

**4. Architecture & How It Works.** A multi-engine design. An OpenCLIP/CLIP vision transformer produces a 512-dimension visual fingerprint; on top, the proprietary 4-pillar engine extracts **733 signals** (Colour: ΔE2000 / LAB clusters; Pattern: Gabor / LBP / FFT; Texture: full GLCM; Finish: specular geometry) exposed through **70 tunable knobs**. Retrieval runs on a hybrid **FAISS HNSW + pgvector** index for sub-second results at 2× scale. The backend is FastAPI; the frontend React/Next.js. Everything runs on a 4-machine on-prem cluster (application, data, AI inference with GPUs, DR/staging). The Phase-4 AI Hub adds a self-hosted LLM stack (~32B reasoning + 7B vision-language + 3B composer) served via vLLM. Key decisions: **on-prem** for data sovereignty; CLIP as a backbone with a **proprietary explainable layer on top** (versus a black-box score); and deferring the expensive GPU box to Phase 4 to keep entry cost low.

**5. Technology Stack.**
- **AI/ML:** OpenCLIP / CLIP (ViT) embeddings, zero-shot & custom classifiers, contrastive fine-tuning, on-prem LLMs (~32B reasoning, 7B vision-language, 3B), RAG.
- **Vision/CV:** image similarity, semantic segmentation, GLCM texture, colour science (HSV, CIELAB, K-means, ΔE2000), Gabor/LBP/FFT pattern analysis, specular/finish analysis, motif-scale measurement.
- **Vector & data:** FAISS (HNSW), pgvector, PostgreSQL, MinIO; hybrid vector + metadata search.
- **Backend:** FastAPI, Python, RQ (Redis Queue).
- **Frontend:** React, Next.js / Vite.
- **Infra & deployment:** on-prem, Docker, vLLM GPU inference, 4-machine architecture, JWT/SSO/RBAC.
- **Hardware:** Sony α7R V capture stations (D65 cross-polarised lighting, X-Rite ColorChecker); GPU inference servers (RTX A6000 / L40S class).

**6. Capabilities & Expertise Demonstrated (Capability → Evidence).**
- **Computer-vision engineering** → built a proprietary 733-signal, 4-pillar fabric-matching engine with explainable per-pillar scoring.
- **Applied colour science** → ΔE2000 / CIELAB calibration pipeline anchored on in-frame ColorChecker capture.
- **Vector search at scale** → sub-second hybrid FAISS + pgvector retrieval over 70K SKUs, engineered to 150K.
- **On-prem GenAI / LLM deployment** → self-hosted multi-model stack (reasoning + vision) via vLLM, zero data egress.
- **Domain modelling & data strategy** → textile-specific taxonomy and auto-extraction of 50–100 metadata fields.
- **Enterprise integration** → Penelope CAD ingestion, legacy FCMS, ERP/CRM-ready architecture.
- **Solution & cost architecture** → phased four-stage roadmap, man-month cost model, ROI modelling, capture-hardware specification.
- **Product & UX** → four persona cockpits and a live, governable configurator.

**7. Hard Problems Solved / Innovations.**
- *The "domain gap"* (messy real-world phone uploads vs pristine studio catalogue): solved with semantic segmentation, configurable score boundaries and structural weighting so the engine fails gracefully rather than returning confusing matches.
- *Black-box limitation of generic visual search:* built a **proprietary, explainable 4-pillar engine** (70 tunable knobs, visible per-pillar scoring) versus CLIP's opaque 512-vector — giving merchandisers both control and the "why".
- *A rendered-not-photographed library capping accuracy:* a studio-capture pipeline with **cross-polarised finish separation** and a contrastive render-vs-studio fine-tuning flywheel.
- *On-prem GenAI economics:* selected a ~32B-class reasoning model that matches a 72B on structured tasks at roughly half the VRAM.

**8. Outcomes & Impact.** *Measured:* replaces an 8–14-minute manual visual query with sub-second matching; Phase 1 foundation built and demonstrated as a working POC. *Modelled (to validate in discovery):* per-pillar accuracy gains from studio capture (overall ~46% → up to ~92%; Finish up ~8.2×); Phase-4 steady-state value of ₹10–20 Cr/year against a committed, phased programme of ~₹2.77 Cr.

**9. Roadmap & Evolution.** Phase 1 Foundation → Phase 2 Capture + Engine Uplift → Phase 3 FCMS consolidation (parked, scoped after discovery) → Phase 4 on-prem AI Hub (modular capsules, delivered in two waves) → Phase 5 ESG monitoring & management platform (separate track). A land-and-expand model where each phase is a standalone, signable scope.

**10. Reusable IP & Assets (internal).** The proprietary 4-pillar matching engine; the colour-calibration capture pipeline; the man-month cost-model framework; the on-prem AI-Hub reference architecture; the phased-proposal and ROI-ramp methodology; and the ESG evidence/provenance-engine concept.

**References / Artifacts.** Strategic proposal deck (v0.9.5, 28 slides); internal & client cost-model decks; pillar-quality analysis; working POC.

<!-- END WORKED EXAMPLE -->
```
