# OpsPilot AI

A decision-support dashboard for Operations Management, built for a fictional FMCG company — **NovaFoods Pvt. Ltd.** OpsPilot AI turns a single operations database into safety stock/reorder-point calculations, EOQ suggestions, supplier reliability scores, demand forecasts, ABC analysis, and a ranked recommendation feed, with optional AI-generated narratives layered on top of the deterministic numbers.

An academic-scope demo, not a production system — see [Scope and Limitations](#scope-and-limitations).

## Overview

NovaFoods sells across 7 product categories out of 4 warehouses, sourced from 20 suppliers. OpsPilot AI computes the standard OM toolkit against that dataset — safety stock, reorder points, EOQ, ABC classification, moving-average/exponential-smoothing forecasts, weighted supplier reliability scores — and surfaces it as seven dashboard modules plus an "Operations Copilot" that turns the computed signals into a ranked, explainable action feed.

The core design principle: **numbers come from code, narrative comes from AI.** Every metric on screen is produced by a deterministic, unit-tested calculation engine (`lib/domain/`). Claude only explains and ranks what the engine already computed — it never computes a number itself, and every recommendation shows its full metric justification whether or not an AI narrative was generated for it.

## Features

- **Executive Dashboard** (`/`) — company-wide KPIs, a deterministic Executive Brief summarizing the current operational situation in plain language, warehouse utilization, and the top active recommendations.
- **Inventory Intelligence** (`/inventory`) — stock status, reorder points, and a live inventory health score per product/warehouse position, filterable by warehouse/category/stock status.
- **Procurement** (`/procurement`) — live EOQ (Economic Order Quantity) suggestions for products needing reorder, plus the purchase order list.
- **Suppliers** (`/suppliers`) — reliability scorecards (on-time delivery rate, lead-time consistency, price stability) per supplier.
- **Demand Forecasting** (`/forecasting`) — moving-average and exponential-smoothing forecasts with accuracy (MAPE) comparison per product.
- **Analytics** (`/analytics`) — ABC classification, inventory turnover, and warehouse utilization across the full catalog.
- **Operations Copilot** (`/copilot`) — a rule-engine-generated, severity-ranked recommendation feed (critical stockouts, overstock, unreliable suppliers, overdue POs, forecast risk) with optional batch-generated AI narratives and an Accept/Dismiss/Snooze workflow.
- **Recalculate** — a single action re-runs the full pipeline (Inventory → Suppliers → Forecast → Analytics → Recommendations) in dependency order and refreshes every persisted metric.

## Architecture

Layered so the OM calculation engine is unit-testable independently of the web framework:

- **`lib/domain/`** — pure, framework-agnostic TypeScript. No Prisma, no Next.js. Every formula (safety stock, ROP, EOQ, reliability scoring, forecasting, the recommendation rule engine) lives here and is covered by reference-value unit tests.
- **`lib/presentation/`** — one module per dashboard page. Composes a page's data by reading persisted Prisma columns where available and calling the exact same `lib/domain` functions live for values that are deliberately never persisted (health scores, EOQ, ABC ranking). A page's Server Component calls this module directly — no HTTP round-trip; the matching API route is a thin wrapper over the same module, used for client-side refetches and write actions.
- **`app/api/`** — thin Route Handlers. Validate query params/body, call `lib/presentation`, return JSON. Every route shares one error-handling wrapper (`lib/api/http.ts`) so invalid input or an unexpected failure always returns the same `{ error: string }` shape.
- **`lib/ai/`** — the one integration point with Claude. Takes a structured recommendation payload and returns narrative text only; never used to compute a number. Batch-only, triggered by one action on the Copilot page.
- **`prisma/`** — schema and the synthetic NovaFoods dataset generator.

See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for the full design (technology choices, data model, API table, folder structure) and [DATA_DICTIONARY.md](DATA_DICTIONARY.md) / [OPERATIONS_ENGINE_SPEC.md](OPERATIONS_ENGINE_SPEC.md) for every table and formula.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript, React Server Components) |
| UI | Tailwind CSS + shadcn/ui (Radix primitives), Lucide icons |
| Charts | Recharts |
| ORM / DB | Prisma → SQLite (`prisma/dev.db`) |
| AI | Claude API (`@anthropic-ai/sdk`) — optional narrative layer only |
| Testing | Vitest (domain + integration tests) |
| Tooling | ESLint, Prettier, TypeScript strict mode |

## Setup Instructions

**Prerequisites:** Node.js 18+, npm.

```bash
npm install
cp .env.example .env
```

`.env` needs `DATABASE_URL` (already set to a local SQLite file by default) and, optionally, `ANTHROPIC_API_KEY` — every feature works with it unset; only AI narrative generation is skipped (recommendations still show their full deterministic justification).

```bash
npx prisma migrate dev   # create the SQLite database and apply the schema
npm run db:seed          # generate and load the synthetic NovaFoods dataset
npm run dev              # start the dev server at http://localhost:3000
```

Other useful scripts:

```bash
npm test           # run the Vitest suite (unit + integration)
npm run typecheck  # tsc --noEmit
npm run lint        # next lint
npm run build       # production build
```

## Screenshots

_TODO: add screenshots of the Executive Dashboard, Inventory Intelligence, and Operations Copilot pages here._

## Folder Structure

```
opspilot-ai/
├── app/                      # Next.js App Router — pages + API routes
│   ├── page.tsx              # "/" — Executive Dashboard
│   ├── inventory/, procurement/, suppliers/, forecasting/, analytics/, copilot/
│   └── api/                  # Route handlers (thin wrappers over lib/presentation)
├── lib/
│   ├── domain/                # Pure OM calculation engine (unit-tested, Prisma-free)
│   ├── presentation/           # Per-page data composition
│   ├── api/                    # Shared API error handling + query-param validation
│   ├── ai/                     # Claude narrative integration (batch-only)
│   └── db/                     # Prisma client
├── prisma/                   # schema.prisma + seed.ts (synthetic dataset)
├── components/                # ui/, nav/, and per-module charts/tables/filters
└── tests/                    # unit/ (domain logic) + integration/ (pipelines)
```

See [SYSTEM_ARCHITECTURE.md §11](SYSTEM_ARCHITECTURE.md#11-repository-structure-actual) for the full tree.

## Documentation

- [PROJECT_SHOWCASE.md](PROJECT_SHOWCASE.md) — a non-technical project presentation: business problem, solution, and engineering decisions
- [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) — architecture, technology choices, data model, API design
- [DATA_DICTIONARY.md](DATA_DICTIONARY.md) — every table, enum, and relationship
- [OPERATIONS_ENGINE_SPEC.md](OPERATIONS_ENGINE_SPEC.md) — every formula, with inputs and edge cases, in plain mathematical notation
- [CHANGELOG.md](CHANGELOG.md) — milestone-by-milestone build history and decisions

## Scope and Limitations

This is a single-company academic demo, not a multi-tenant production system. Deliberate, documented simplifications:

- **No authentication or authorization.** Every route and page is open. There is no `organizationId`/tenancy layer — the whole app serves exactly one dataset (NovaFoods), so there's no per-user data to protect. See [SYSTEM_ARCHITECTURE.md §8](SYSTEM_ARCHITECTURE.md#8-auth--access-simplified).
- **In-memory pagination on the Inventory list.** `getInventoryList` fetches all matching rows, computes KPIs/category breakdown over the full filtered set, then paginates in JS. This is intentional at this dataset's scale (a few hundred rows per filter at most) — the KPIs need the full set regardless of page size. A larger, multi-warehouse deployment would push `page`/`pageSize` into a database-level query instead.
- **No background jobs or caching.** Metrics recalculate on demand via one explicit "Recalculate" action, not a scheduler — appropriate for a dataset that only changes during a demo session.
- **Synthetic data only.** No real customers, suppliers, or transactions; safe to reset/reseed at any time via `npx prisma migrate reset`.
