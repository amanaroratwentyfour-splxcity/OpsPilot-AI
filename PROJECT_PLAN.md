# OpsPilot AI — Project Plan

**Document owner:** Product & Engineering
**Status:** Draft for approval (v2 — simplified academic scope)
**Last updated:** 2026-08-02

---

## 1. Executive Summary

OpsPilot AI is a single-company **AI-powered Operations Decision Hub** demo, purpose-built to showcase Operations Management (OM) concepts for one fictional FMCG (Fast-Moving Consumer Goods) company. It unifies inventory, procurement, supplier performance, and demand forecasting into a modern dashboard, then layers AI-generated, explainable recommendations on top of classical OM calculations — safety stock, reorder points, Economic Order Quantity (EOQ), supplier reliability, and demand forecasting.

**Revision note (v2):** The original plan scoped OpsPilot AI as a full multi-tenant production SaaS platform. That scope has been intentionally reduced. **This is an academic project whose goal is the most impressive possible demonstration of OM concepts, built by one student, in a maintainable codebase — not a shippable commercial SaaS product.** Every feature below is scoped against that goal.

The defining design principle is unchanged: **OpsPilot AI is a decision-support system, not a system of record.** It assumes operational data already exists (seeded as realistic synthetic data for one fictional company) and focuses entirely on turning that data into ranked, explainable, AI-narrated decisions.

---

## 2. What Changed From v1

| Area | v1 (Production SaaS scope) | v2 (Academic demo scope) |
|---|---|---|
| Tenancy | Multi-tenant, org-isolated | Single fictional company, no tenancy layer |
| Auth | Full auth system, invites, org roles | Lightweight persona switcher for demo storytelling — no real access control |
| Billing | Subscription tiers, plan gating | Removed entirely |
| RBAC | Per-role permission matrix enforced server-side | Removed — personas inform UI/IA design only |
| Audit | Full audit log of every action | Removed |
| Infra | Redis cache, background job scheduler, CI/CD pipeline | Removed — calculations run on demand; deploy is a single manual/simple step |
| Security | RLS, rate limiting, Sentry, secrets rotation | Reduced to essentials appropriate for a public demo (env vars, input validation) |
| Modules | Loosely defined across inventory/procurement/suppliers/warehouses | Consolidated into 7 named modules (see §5) |

Everything removed above is listed explicitly as **out of scope** in §7 so it is never accidentally re-introduced during implementation.

---

## 3. Problem Statement (Unchanged)

FMCG operations teams manage high SKU counts, perishable/short-shelf-life goods, volatile demand, and multi-tier supplier networks. Common pain points OpsPilot AI demonstrates solving:

- Reactive, not proactive: stockouts/overstocks discovered after they happen.
- Fragmented tooling and manual, error-prone OM calculations (safety stock, ROP, EOQ done ad hoc or not at all).
- No prioritization: no ranked view of "what needs attention today."
- Opaque analytics tools that reduce manager trust.

## 4. Vision Statement

> "Give an FMCG operations manager a daily, AI-generated shortlist of the decisions that matter most — backed by transparent, textbook-correct OM math — so they spend their time deciding, not calculating."

## 5. Core Modules

1. **Executive Dashboard** — company-wide KPI snapshot and top alerts.
2. **Inventory Intelligence** — SKU catalog, stock health, safety stock, ROP, ABC classification.
3. **Procurement** — purchase orders, EOQ-driven order recommendations.
4. **Suppliers** — supplier scorecards and reliability scoring.
5. **Demand Forecasting** — statistical forecasting with accuracy tracking.
6. **Analytics** — deeper historical trends, comparisons, exportable reports.
7. **Operations Copilot (AI)** — explainable, AI-narrated recommendation feed and a grounded Q&A chat interface over the company's operational metrics.

Full functional detail in [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md).

## 6. Goals & Success Criteria

| Goal | Success Criteria |
|---|---|
| Demonstrate core OM calculations correctly | Safety stock, ROP, EOQ, ABC, supplier reliability, and forecasts computed via documented formulas and unit-tested against known reference values |
| Build a genuinely impressive demo | Modern, polished, responsive UI; realistic synthetic FMCG data; smooth, coherent narrative across all 7 modules |
| Keep AI explainable and trustworthy | Every AI recommendation/answer is traceable to a deterministic metric — the AI never invents a number |
| Keep the codebase maintainable by one student | Clear layering (UI / API / domain logic / data), no unnecessary infrastructure, everything buildable and testable locally |

## 7. Explicitly Out of Scope

- Multi-tenancy / multiple organizations
- Subscription plans, billing, or plan-based feature gating
- Full user account system with invites, password resets, org management
- Server-enforced role-based access control (RBAC) with a permission matrix
- Audit logging of user actions
- Redis or any caching layer
- Background job schedulers / cron-based recalculation
- CI/CD pipelines (GitHub Actions, staging/preview environments)
- Production-grade security hardening (rate limiting, RLS, secrets rotation, Sentry, etc.)
- Native mobile apps, ERP integrations, real payment processing, IoT/hardware integration

If any of the above later becomes genuinely necessary, it must be re-approved explicitly — it is not to be re-added incidentally during implementation.

## 8. Target User / Demo Narrative

OpsPilot AI is demoed as the internal operations tool for **one fictional FMCG company** (defined in the PRD) with multiple warehouses, a realistic SKU catalog, and a supplier network. The demo narrative walks through the 7 modules as if presented by an Operations Manager reviewing their day: check the Executive Dashboard → drill into an at-risk SKU in Inventory Intelligence → see the EOQ-driven reorder suggestion in Procurement → check the recommended supplier's scorecard → review the forecast behind the recommendation → ask the Operations Copilot a follow-up question in natural language.

Personas (Operations Manager, Inventory Manager, Procurement Manager, Warehouse/Supply Chain roles) remain useful as **design personas** — they shape which KPIs and views matter most in each module — but the application does **not** enforce access control per persona. A lightweight persona switcher (cosmetic, no backend authorization) lets the demo presenter show how each role's priorities differ.

## 9. Assumptions

1. Data is seeded via a single realistic synthetic FMCG dataset (multi-warehouse, multi-SKU, multi-supplier, historical demand) generated once and committed to the project.
2. "AI-generated recommendations" and Copilot answers combine deterministic OM formulas (source of truth for numbers) with an LLM (Claude API) used only to explain, prioritize, and narrate.
3. No real users, passwords, or accounts are required for the demo to function; any login screen present is for visual polish, not access control.
4. No real payment processor or billing exists anywhere in the system.
5. Recalculation of metrics (safety stock, ROP, forecasts, recommendations) happens synchronously on demand (e.g., triggered by a "Recalculate" action or computed at request time) rather than via a background scheduler.

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope creep back toward "production SaaS" | High | This document's §7 out-of-scope list is the guardrail; revisit only with explicit approval |
| AI recommendations perceived as untrustworthy | High | Always show the underlying formula/metric alongside every AI recommendation or Copilot answer |
| Forecasting accuracy on synthetic data looking unrealistic | Medium | Design synthetic demand data with deliberate seasonality/trend/noise so forecasting methods have something meaningful to demonstrate |
| Single student running out of time | Medium | Roadmap phases are ordered so each one is independently demoable; later phases (Analytics polish) can be trimmed without breaking the core story |

## 11. Milestone Overview

Full detail in [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md). Summary:

| Phase | Focus |
|---|---|
| Phase 0 | Documentation (this phase) |
| Phase 1 | Foundation — project scaffold, data model, synthetic dataset |
| Phase 2 | Inventory Intelligence + Procurement + Suppliers (core data modules) |
| Phase 3 | OM Calculation Engine (safety stock, ROP, EOQ, ABC, reliability) |
| Phase 4 | Demand Forecasting Engine |
| Phase 5 | Operations Copilot (AI recommendations + chat) |
| Phase 6 | Executive Dashboard + Analytics (tie everything together) |
| Phase 7 | Polish & Deployment |

## 12. Approval

This document, along with [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md), [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md), and [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md), constitutes the full pre-build definition of OpsPilot AI under the revised academic scope.

**No application code will be written until this documentation set is explicitly approved.**
