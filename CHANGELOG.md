# Changelog

All notable development milestones for **OpsPilot AI** are documented in this file, in the order they were completed. Unlike a package's semantic-versioning changelog, this file exists to give a new developer (or reviewer) a narrated history of *why* the project looks the way it does — each entry covers the objective, what was actually built, the technical decisions made along the way, exactly which files changed, and what was learned.

**Maintenance rule:** this file must be updated after every completed milestone, following the same structure as the entries below.

---

## Milestone 1.1 – Project Foundation

**Date:** 2026-08-02
**Git commit:** [`94cfcc0`](../../commit/94cfcc0) — "Milestone 1.1 - Project foundation setup"

### Objective
Initialize the OpsPilot AI project skeleton — framework, tooling, and folder structure — with no business logic, database models, UI pages, or API routes yet.

### Work Completed
- Scaffolded a Next.js 14 application using the App Router.
- Configured TypeScript (strict mode) and Tailwind CSS v3.
- Installed and initialized shadcn/ui (New York style, slate base color, CSS variables).
- Installed Prisma (schema + SQLite datasource only — no models).
- Installed Recharts.
- Confirmed Lucide React was already present (pulled in automatically as a shadcn/ui dependency).
- Configured ESLint (`next/core-web-vitals`, `next/typescript`, `prettier`) and Prettier (with `prettier-plugin-tailwindcss`).
- Created the full module folder structure from `SYSTEM_ARCHITECTURE.md` (`app/{dashboard,inventory,procurement,suppliers,forecasting,analytics,copilot,api}`, `lib/domain/{inventory,procurement,suppliers,forecasting,recommendations}`, `lib/ai`, `lib/db`, `components/ui`, `hooks`, `tests/unit`) as empty placeholders (`.gitkeep` only).
- Initialized a local git repository (none existed previously).

### Major Technical Decisions
- **Node.js installed via `conda`** — the development machine had no Node.js, npm, nvm, or Homebrew pre-installed; conda was the only available package manager.
- **Next.js explicitly pinned to `14.2.35`** via `create-next-app@14` — the default `create-next-app@latest` installs Next 16 (React 19, Tailwind v4), which would have silently violated the "Next.js 14" requirement.
- **shadcn CLI pinned to `2.10.0`** (the last release of the "classic" init flow) instead of latest (`4.16.1`), whose new preset-based init targets a different, Tailwind-v4-first default flow incompatible with the pinned Tailwind v3 / Next 14 stack.
- **SQLite chosen as the default Prisma datasource**, per `SYSTEM_ARCHITECTURE.md`'s recommendation for zero-config local development.
- Accepted **5 known high-severity `npm audit` advisories** as a deliberate tradeoff — every fix requires moving to Next 16, which would break the explicit version pin; the project has no real user data or secrets, so the risk was judged acceptable and documented rather than silently ignored.

### Files Added
`package.json`, `package-lock.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `.prettierrc.json`, `.prettierignore`, `components.json`, `lib/utils.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/favicon.ico`, `app/fonts/*`, `prisma/schema.prisma` (generator + datasource only), `prisma.config.ts`, `.env`, `.env.example`, `.gitignore`, folder-structure `.gitkeep` placeholders (14 files), `README.md`.

*(The first commit also included the four Phase 0 planning documents — `PROJECT_PLAN.md`, `PRODUCT_REQUIREMENTS_DOCUMENT.md`, `SYSTEM_ARCHITECTURE.md`, `DEVELOPMENT_ROADMAP.md` — written before git was initialized, so they land in this same commit even though they predate Milestone 1.1's actual work.)*

### Files Modified
None (first commit).

### Database Changes
None. `prisma/schema.prisma` contained only the `generator`/`datasource` blocks — no models, no migration, no database file existed yet.

### Validation Performed
`npm run typecheck`, `npm run lint`, `npm run build`, and `npm run format:check` all passed cleanly against the stock scaffold.

### Lessons Learned
- Never assume a scaffolding CLI's "latest" default matches an explicitly requested framework version — tooling moves faster than pinned major versions; always verify installed versions after any `create-*`/`init` command rather than trusting the command's success message alone.
- A clean machine may have zero JS tooling pre-installed — check before assuming `node`/`npm` exist.

---

## Milestone 1.2 – Database Schema & Migration

**Date:** 2026-08-02
**Git commit:** [`1d58bf2`](../../commit/1d58bf2) — "Milestone 1.2 - Database schema and initial migration"

### Objective
Design the complete Prisma/SQLite database schema for OpsPilot AI and apply the initial migration — no seed data yet.

### Work Completed
- Modeled the 9 approved entities: `Warehouse`, `Product`, `Inventory`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `DemandHistory`, `Forecast`, `AIRecommendation`.
- Added a 10th entity, `InventoryTransaction`, in a follow-up round after an explicit request for a stock-movement audit trail.
- Defined 8 enums (`ProductCategory` [4 values at this point], `ABCClass`, `StockStatus`, `PurchaseOrderStatus`, `ForecastMethod`, `RecommendationCategory`, `RecommendationSeverity`, `RecommendationStatus`) plus `TransactionType` added alongside `InventoryTransaction`.
- Ran `prisma migrate dev --name init`, producing the project's first (and so far only) migration.
- Independently verified the resulting SQLite schema by reading the actual `CREATE TABLE`/`CREATE INDEX` SQL and running `PRAGMA foreign_key_check`, rather than trusting Prisma's own success output.

### Major Technical Decisions
- **UUID string primary keys** (`@default(uuid())`), client-generated, over autoincrement integers — lets application code build a fully-wired in-memory object graph before any database write.
- **Deliberate per-relation `onDelete` policy**, not a single blanket rule:
  - **Cascade** for tightly-owned children with no independent value (`Inventory → Product/Warehouse`, `DemandHistory → Product`, `Forecast → Product`, `PurchaseOrderItem → PurchaseOrder`).
  - **Restrict** to protect transactional/historical integrity (`PurchaseOrderItem → Product`, `PurchaseOrder → Supplier/Warehouse`).
  - **SetNull** for records that should outlive their subject (`AIRecommendation`'s three optional FKs, `Product → Supplier`).
- **`InventoryTransaction → Inventory` set to Restrict**, breaking the schema's own "cascade for tightly-owned children" pattern — a deliberate exception, because an audit log that disappears when its subject is deleted isn't an audit log. This has the transitive effect of also blocking `Product`/`Warehouse` deletion once transaction history exists.
- **Enums used for every fixed-value-set field** — and in the process, discovered that SQLite has no native enum type: Prisma stores every enum as a plain `TEXT` column with **no `CHECK` constraint**. Validity is enforced only at the Prisma Client / application layer.

### Files Added
`prisma/migrations/20260801204626_init/migration.sql`, `prisma/migrations/migration_lock.toml`.

### Files Modified
`prisma/schema.prisma` (9 → 10 models, 8 → 9 enums), `.gitignore` (excluded `/prisma/dev.db` and `/prisma/dev.db-journal` — the local SQLite file is regenerable from migrations and shouldn't be committed as a binary blob).

### Database Changes
Created `prisma/dev.db` and applied the initial migration: **10 tables**, **13 foreign keys**, **21 indexes** (4 unique). All tables empty (0 rows) — no seed data yet.

### Validation Performed
`prisma validate` / `prisma format` / `prisma generate` all clean. Direct SQLite inspection: `PRAGMA foreign_key_check` (zero violations), manual `CREATE TABLE` SQL review confirming every `ON DELETE` clause matched the schema, row counts confirmed at 0 for every table, `prisma migrate status` reporting "Database schema is up to date."

### Lessons Learned
- SQLite's enum-as-`TEXT`-with-no-`CHECK`-constraint behavior is worth learning early — it changes how "safe" a future enum change feels (turns out to be a no-migration change, discovered concretely in Milestone 1.3) and clarifies where validation responsibility actually lives (the application, not the database).
- Extending an already-approved schema (adding `InventoryTransaction` after the original 9 entities were signed off) is manageable as long as the `onDelete`-policy ripple effects are reasoned through explicitly, rather than copy-pasting the nearest existing pattern.

---

## Milestone 1.3 – Synthetic FMCG Dataset

**Date:** 2026-08-02
**Git commit:** [`a591825`](../../commit/a591825) — "Milestone 1.3 - Synthetic FMCG dataset"

### Objective
Generate a realistic, deterministic synthetic dataset for NovaFoods Pvt. Ltd. — believable enough that dashboards, KPIs, forecasting, and the Operations Copilot have meaningful stories to tell — and execute it against the database.

### Work Completed
- Wrote a fully deterministic Prisma seed script (`prisma/seed.ts`, ~1,900 lines) generating:
  - 4 warehouses (Delhi, Mumbai, Bengaluru, Kolkata) with distinct capacities/utilization
  - 20 hand-curated suppliers with distinct lead times, reliability scores, and payment terms
  - 203 hand-named products across 7 categories
  - 812 inventory positions with formula-computed safety stock / reorder point
  - 15,834 weekly demand-history points with hand-modeled seasonality (summer beverages, stable tea/coffee, Diwali chocolate spikes, cricket-season snack spikes, summer frozen foods)
  - 145 purchase orders / 286 line items across Open / Completed / Delayed / Cancelled states
  - 152 inventory transactions (purchase receipts + scripted decline sequences)
  - 4,872 forecasts (Moving Average + Exponential Smoothing backtests, ~4.9% average MAPE)
  - 13 AI recommendations, each derived from a real extreme in the generated data
- In a follow-up round (after initial approval), added **10 deliberate business scenarios** on top of the base probabilistic generation: a supplier with gradually declining reliability (recency-weighted delay probability, not just a static score), a near-full-capacity warehouse (Mumbai, 91%), a warehouse with excess inventory (Kolkata, 46%), festival demand spikes, 5 products with genuinely declining demand (measured -20% to -28%), delayed POs correlated with supplier reliability, 4 "always healthy" showcase products, one flagship stockout example, one flagship overstock example, and 3 products with a real weekly `SALE` transaction history tracing a Healthy → Low → Critical decline.
- Executed the seed against the live database and independently validated the result (see below).

### Major Technical Decisions
- **Fully deterministic generation** — no `Math.random()`/RNG anywhere except `randomUUID()` for primary keys (which has no bearing on business values). A fixed trigonometric hash (`frac`/`rangeValue`/`wiggle`) substitutes for "noise," so re-running the script produces identical business data.
- **`ProductCategory` expanded from 4 to 7 values** (`DAIRY`, `BEVERAGES`, `SNACKS`, `BAKERY`, `PERSONAL_CARE`, `HOUSEHOLD`, `FROZEN_FOODS`) to match the realistic category list requested — flagged explicitly as a change to an already-approved schema before proceeding. Discovered this required **no new migration file**, since SQLite stores enums as plain `TEXT` (direct payoff of the Milestone 1.2 lesson).
- **Adopted `tsx`** as the seed runner after discovering Prisma's newer `prisma-client` (ESM) generator output can't be `require()`'d as CommonJS — resolved by importing the specific `client.ts` file directly and manually loading `dotenv/config` (the Prisma CLI's own env-loading doesn't apply to a standalone script).
- **Warehouse `capacityUnits` calibrated *from* generated inventory totals** (`capacity = totalStock / targetUtilization`) rather than guessed upfront — guarantees each warehouse's stated utilization is an exact outcome, not an approximation.
- **"Dry run first" methodology**: the entire dataset was computed in memory and printed as diagnostics — zero database writes — both before the initial approval and again after adding the 10 business scenarios.
- **`InventoryTransaction.createdAt` backdated** to real event dates (a PO's actual delivery date, or the specific week of a scripted decline) rather than left at the seed script's execution time.

### Files Added
`prisma/seed.ts`.

### Files Modified
`prisma/schema.prisma` (`ProductCategory` enum expansion), `prisma.config.ts` (added `migrations.seed: "tsx prisma/seed.ts"`), `package.json` / `package-lock.json` (added `tsx` dev dependency, added `db:seed` script).

### Database Changes
`prisma/dev.db` populated end-to-end (previously 0 rows in every table):

| Table | Rows |
|---|---:|
| Warehouse | 4 |
| Supplier | 20 |
| Product | 203 |
| Inventory | 812 |
| DemandHistory | 15,834 |
| PurchaseOrder | 145 |
| PurchaseOrderItem | 286 |
| InventoryTransaction | 152 |
| Forecast | 4,872 |
| AIRecommendation | 13 |

### Validation Performed
Two full non-destructive dry runs (in-memory generation + diagnostics, no DB writes) before real execution — the second one specifically verifying all 10 business scenarios. After real execution: row counts independently re-queried via direct SQL (matched the script's own report exactly), `PRAGMA foreign_key_check` (zero violations), manual orphan checks across all 13 foreign-key relationships (zero), unique-constraint duplicate checks on `Product.sku`, `Inventory[productId,warehouseId]`, `DemandHistory[productId,periodDate]`, `Forecast[productId,method,periodDate]` (zero duplicates), negative/invalid value checks across `onHandQty`/`quantitySold`/`forecastQty` (zero), and scenario-specific spot checks (e.g. Ganges Refreshments Co.'s reliability score, the flagship stockout/overstock rows) queried directly from the persisted database.

### Lessons Learned
- **Dry-run-before-write paid off concretely**: the first dry run revealed that the initial "demand expected to increase" recommendation logic — which only compared the *next calendar month* — produced **zero** recommendations when run in a month where every product category happened to be flat or declining. Fixed by widening the lookahead to 3 months, which correctly surfaced the Diwali chocolate spike regardless of what month the script runs in. This bug would have shipped invisibly without the dry run.
- When a request changes previously-approved scope (new categories, new scenarios added after the base dataset was already approved), **flagging the change explicitly before proceeding** — rather than silently accommodating it — kept the schema and data trustworthy across iterative rounds.
- Newer tool-generated code (Prisma's ESM client output) doesn't always match a project's existing module conventions (CommonJS) — worth a quick smoke test before writing a thousand lines of code that assumes it will "just work."

---

## Milestone 1.3 Documentation (DATA_DICTIONARY.md)

**Date:** 2026-08-02
**Git commit:** *Not yet committed* — `DATA_DICTIONARY.md` is currently untracked in the working tree, pending a future commit.

### Objective
Produce a professional, comprehensive data dictionary documenting every table, enum, relationship, and business rule in the database, suitable for a new developer joining the project.

### Work Completed
Authored `DATA_DICTIONARY.md`, covering:
- All 10 tables — purpose, business description, full field-level tables (type, nullability, default, description, **real example values queried from the live database**), relationships, constraints, indexes, and which of the 7 application modules use each table.
- All 8 enums with every possible value explained.
- A dedicated "Calculated Fields" section distinguishing what's computed today (in the seed script) from what's deliberately deferred (`abcClass`, live `reliabilityScore`).
- 10 numbered business rules, each marked as database-enforced or trust-based.
- A full cardinality summary, explicitly calling out the schema's one true many-to-many (`Product ↔ Warehouse`, resolved through `Inventory`).
- A module-usage cross-reference matrix.
- A "Known Limitations & Deliberate Simplifications" section, so intentional scope decisions read as intentional rather than as gaps to be rediscovered.
- A glossary of Operations Management terminology (SKU, ROP, EOQ, MAPE, ABC Analysis, Service Level).

### Major Technical Decisions
- **Every example value was pulled from a live `sqlite3` query against the seeded database**, not reconstructed from memory or design discussion — guarantees accuracy after several rounds of scenario edits changed the actual seeded numbers.
- Explicitly separated **database-enforced constraints** from **trust-based business rules** SQLite cannot check (e.g., transaction/on-hand-quantity reconciliation), so a new developer knows exactly what they can and can't rely on the database to catch.
- Documented known simplifications (single `primarySupplier` per product, no full sales ledger, unenforced enums) as their own section rather than leaving them implicit.

### Files Added
`DATA_DICTIONARY.md`.

### Files Modified
None — schema and application code were explicitly left untouched, per instruction.

### Database Changes
None.

### Validation Performed
Every field name, type, nullability, default, relationship, `onDelete` policy, and index was cross-referenced directly against the current `prisma/schema.prisma`; every example value was cross-referenced against a live query result from `prisma/dev.db`.

### Lessons Learned
Documentation is only as trustworthy as its examples — querying live data beats reconstructing "representative" values from memory, especially on a project whose seeded numbers had already changed twice (once for the category expansion, once for the business-scenario overrides) by the time this document was written.

---

## Operations Engine Specification (OPERATIONS_ENGINE_SPEC.md)

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Define every Operations Management calculation the Operations Engine will implement — formulas, inputs, outputs, assumptions, business rules, edge cases, dashboard/AI consumers — before writing any `lib/domain` code, per `DEVELOPMENT_ROADMAP.md`'s Phase 3.

### Work Completed
Authored `OPERATIONS_ENGINE_SPEC.md` covering all 10 metrics from the milestone brief: Inventory Health Score, Safety Stock, Reorder Point, EOQ, ABC Analysis, Inventory Turnover, Warehouse Utilization, Supplier Reliability Score, Forecast Accuracy (MAPE), Operations Health Score. Later (before Milestone 2.2) added hand-verified worked examples for Demand Statistics/Safety Stock/Reorder Point, using the same numbers already asserted in the unit test suite.

### Major Technical Decisions
- Every metric checked against the **frozen** schema; every schema gap found (EOQ's cost inputs, Supplier Reliability's Order Accuracy component) got a documented fallback (Configuration Constant or re-weighted formula) rather than a formula silently assuming data that doesn't exist.
- Introduced the **Configuration Constant vs. Schema Gap** distinction: company-wide policy assumptions (service level Z, ABC cutoffs, ordering cost) need no schema field; per-entity facts that are genuinely missing (Order Accuracy tracking) get a proposed *smallest possible* additive, nullable field — none of which have been added, since the schema is frozen.
- Two composite scores (Inventory Health Score, Operations Health Score) are explicitly labeled as product-design decisions, not textbook OM formulas, with their weights documented as tunable.

### Files Added
`OPERATIONS_ENGINE_SPEC.md`.

### Files Modified
None at creation. Modified once more before Milestone 2.2 to add the worked-example subsections (no formula changes).

### Database Changes
None.

### Validation Performed
Every formula's inputs cross-checked field-by-field against `prisma/schema.prisma`; the consolidated Schema Gap table (§5) double-checked to confirm no metric is blocked from implementation today.

### Lessons Learned
Writing the spec before the code surfaced real ambiguities early and cheaply (e.g., "variance relative to contractedLeadTimeDays" turned out to need a concrete formula decision) — cheaper to resolve in a document than half-discover mid-implementation.

---

## Milestone 2.0 – Test Infrastructure Setup

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Install and configure Vitest so every subsequent Operations Engine milestone has working unit/integration tests from the start.

### Work Completed
Installed Vitest; added `vitest.config.mts`, a global test setup file, and one smoke test.

### Major Technical Decisions
- **Config file named `vitest.config.mts`, not `.ts`.** Vitest 4.x's dependency chain (`std-env`) is ESM-only and failed to load under this project's CommonJS module setup (`ERR_REQUIRE_ESM`) — the same category of friction hit earlier with Prisma's generated client (Milestone 1.3). The `.mts` extension forces Node to load the config as ESM regardless of `package.json`'s `type` field.
- **Explicit `resolve.alias` for `@/*`.** Next.js resolves this tsconfig path alias automatically via its own bundler; Vite/Vitest does not — needed an explicit alias in `vitest.config.mts` so domain code and tests can share the same import style as the rest of the app.

### Files Added
`vitest.config.mts`, `tests/unit/setup.ts`, `tests/unit/sanity.test.ts`.

### Files Modified
`package.json` (added `vitest` devDependency, `test`/`test:watch` scripts).

### Database Changes
None.

### Validation Performed
`npm test` runs the smoke test successfully.

### Lessons Learned
Newer major versions of dev-tooling (Vitest 4.x) can carry ESM-only transitive dependencies that clash with an older CJS project setup — worth a quick `npm test` smoke check immediately after install, before writing any real tests on top of it.

---

## Milestone 2.1 – Inventory Engine: Demand Statistics, Safety Stock, Reorder Point

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Implement the demand-derived Inventory Engine calculations (`OPERATIONS_ENGINE_SPEC.md` §4.2/§4.3) as reusable, unit-tested pure functions — replacing the equivalent inline math in `prisma/seed.ts` as the authoritative implementation.

### Work Completed
`computeDemandStatistics`, `computeSafetyStock`, `computeReorderPoint`, plus a shared `lib/domain/config.ts` seeded with `SERVICE_LEVEL_Z`. 21 unit tests.

### Major Technical Decisions
- **Full float precision returned, no internal rounding** — rounding is a display concern per the spec, not a calculation one.
- **No artificial ROP floor**, unlike the seed script's pragmatic `max(ROP, safetyStock + 1)` clamp — the real formula is implemented faithfully, since the clamp is never actually binding for non-negative demand.
- **`null` propagates deliberately** for insufficient demand history (<2 weeks) rather than defaulting to `0`, all the way from `computeDemandStatistics` through to `computeReorderPoint`.
- Explicit `Number.isFinite`/negative-input guards to prevent `NaN` (e.g. from `Math.sqrt` of a negative number) from silently propagating.

### Files Added
`lib/domain/config.ts`, `lib/domain/inventory/demandStatistics.ts`, `lib/domain/inventory/safetyStock.ts`, `lib/domain/inventory/reorderPoint.ts`, 3 test files.

### Files Modified
None.

### Database Changes
None (pure functions, no Prisma access yet).

### Validation Performed
21/21 tests pass; `typecheck`/`lint` clean. Reference test case (`[560,630,700,770,840]` weekly, 7-day lead time → SS≈61.7373, ROP≈761.7373) later cross-referenced into `OPERATIONS_ENGINE_SPEC.md`'s worked example, at your request, before Milestone 2.2 began.

### Lessons Learned
Hand-computing a "known" reference value for a test is error-prone (an early draft of the worked example's decimal precision was off) — safer to assert against an independently-computed expression (e.g. `Math.sqrt(1400) * 1.65`) alongside a rounded human-readable value, not just the rounded value alone.

---

## Milestone 2.2 – Inventory Engine: Stock Status & Inventory Health Score

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Implement `classifyStockStatus` and `computeInventoryHealthScore` (`OPERATIONS_ENGINE_SPEC.md` §4.1).

### Work Completed
Both pure functions, 31 unit tests including explicit boundary and continuity checks.

### Major Technical Decisions
- **`StockStatus` classification thresholds had no prior numeric definition anywhere** — the seed script only ever generated data *from* a chosen status, never classified *to* one. Defined new thresholds (CRITICAL ≤1.0×ROP, LOW ≤1.3×ROP, HEALTHY ≤4.0×ROP, OVERSTOCKED beyond) deliberately aligned with Inventory Health Score's own anchor points, documented inline, and verified with a dedicated cross-consistency test.
- Negative `onHandQty` returns `null` (a data-integrity error to flag), not a score of `0`.

### Files Added
`lib/domain/inventory/stockStatus.ts`, `lib/domain/inventory/healthScore.ts`, 2 test files.

### Files Modified
None.

### Database Changes
None.

### Validation Performed
52/52 cumulative tests pass; `typecheck`/`lint` clean; dedicated tests prove no jump discontinuity at the ratio=1 and ratio=4 formula-band boundaries.

### Lessons Learned
When a spec leaves a threshold undefined, resolving it by deriving from an *already-defined* related formula (Health Score's bands) rather than picking an arbitrary new number keeps two related pieces of logic provably consistent instead of accidentally diverging.

---

## Milestone 2.3 – Inventory Engine: Recalculation Orchestrator

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Wire the Inventory Engine's pure functions to real Prisma data for the first time, following the principle that the orchestrator should contain almost no business calculations of its own.

### Work Completed
- `lib/db/prisma.ts` — the Prisma Client singleton (nothing needed it before now).
- `lib/domain/inventory/productMetrics.ts` — a pure composition layer (`computeProductInventoryMetrics`) bundling all 5 Inventory Engine functions into one typed `ProductInventoryMetrics` result, with zero formulas of its own.
- `lib/domain/inventory/recalculate.ts` — the thin orchestrator (`recalculateInventoryForProduct`, `recalculateAllInventory`): fetch, delegate to the composition layer, write.
- 5 new unit tests + 3 integration tests (60 total).

### Major Technical Decisions
- **Two-layer split (pure composition + thin I/O orchestrator)**, not one — keeps the orchestrator's job to literally fetch/call/write, with even the composition math isolated and independently testable.
- **Skip the write, don't guess**, when a product's demand history is insufficient: `Inventory.safetyStock`/`reorderPoint`/`stockStatus` are NOT NULL columns, so `null` can't be written directly — overwriting with a misleading `0`/default would be worse than leaving the row untouched.
- **Dependency-injected Prisma client** (`db: Db = prisma`) specifically so tests can run the orchestrator inside a transaction that's rolled back afterward.
- **Integration tests run inside a Prisma transaction that always throws**, forcing a rollback — real reads/writes are exercised against the actual seeded `dev.db`, but nothing persists.

### Files Added
`lib/db/prisma.ts`, `lib/domain/inventory/productMetrics.ts`, `lib/domain/inventory/recalculate.ts`, 1 unit test file, `tests/integration/domain/inventory/recalculate.test.ts`.

### Files Modified
None.

### Database Changes
None persisted (by design — see rollback strategy above). Verified independently by checking `Inventory.lastCalculatedAt` in `dev.db` was unchanged after the full test suite ran.

### Validation Performed
60/60 tests pass; `typecheck`/`lint` clean; rollback strategy independently verified via direct `sqlite3` inspection (not just "the test passed").

### Lessons Learned
A transaction-rollback integration test only proves what it claims to prove if you independently verify the rollback actually happened — trusting the test's own pass/fail alone would not have caught a scenario where the transaction accidentally committed.

---

## Inventory Recalculation Benchmark (developer utility)

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Establish an observational performance baseline for `recalculateAllInventory()` against the seeded dataset — explicitly not a pass/fail test, and not an optimization pass.

### Work Completed
`scripts/benchmark-inventory-recalculation.ts`, run via `npm run benchmark:inventory`. Reports products processed, inventory rows, total time, average time per product.

### Major Technical Decisions
- **Standalone script, not a Vitest test** — "don't fail on timing" doesn't fit a test-assertion shape well, and a full-catalog run doesn't belong in the fast feedback loop of `npm test`.
- Same rolled-back-transaction pattern as Milestone 2.3's integration tests, so running the benchmark repeatedly never mutates the seeded dataset.

### Files Added
`scripts/benchmark-inventory-recalculation.ts`.

### Files Modified
`package.json` (added `benchmark:inventory` script).

### Database Changes
None (rolled back).

### Validation Performed
Result on current seeded dataset: **203 products processed, 0 skipped, 812 inventory rows, 218.7ms total, 1.08ms/product average.** Independently confirmed non-mutating via direct `dev.db` inspection.

### Lessons Learned
At ~1ms/product, a full-catalog recalculation is fast enough to run synchronously on demand — no background job infrastructure is warranted at this data scale, validating a scope decision already made in `SYSTEM_ARCHITECTURE.md`.

---

## Milestone 2.4 – Procurement Engine: Economic Order Quantity (EOQ)

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Implement EOQ (`OPERATIONS_ENGINE_SPEC.md` §4.4) using its documented Configuration-Constant fallback, since the schema is frozen and has no holding-cost or ordering-cost fields.

### Work Completed
`computeAnnualDemand` (trailing-52-week convention, shared by later Analytics milestones) and `computeEOQ`. 15 unit tests.

### Major Technical Decisions
- **`computeAnnualDemand` split into its own file**, not bundled into `eoq.ts` — the approved plan calls for this function to be reused by ABC Analysis and Inventory Turnover (Milestones 2.10/2.11); keeping it in an `eoq.ts`-named file would misrepresent that reuse.
- **Order matters for `computeAnnualDemand`**, unlike `computeDemandStatistics` — documented prominently, since "trailing" is meaningless without a known chronological order, and proved with a test using deliberately extreme values in the excluded older weeks.
- **A non-positive `holdingCostRate` falls back to the default** rather than failing, per the spec's explicit edge-case instruction — different from every other "invalid input → null" pattern used so far.

### Files Added
`lib/domain/procurement/annualDemand.ts`, `lib/domain/procurement/eoq.ts`, 2 test files.

### Files Modified
`lib/domain/config.ts` (added `DEFAULT_ORDERING_COST`, `DEFAULT_HOLDING_COST_RATE`).

### Database Changes
None.

### Validation Performed
75/75 cumulative tests pass; `typecheck`/`lint` clean.

### Lessons Learned
None new beyond Milestone 2.1's — the `null`-vs-guessed-default pattern continues to hold up well across a third distinct formula.

---

## Milestone 2.5 – Procurement Engine: Supplier Reliability Score

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Implement Supplier Reliability Score (`OPERATIONS_ENGINE_SPEC.md` §4.8) as pure functions, a composition layer, and a thin orchestrator — the same architecture as the Inventory Engine, applied end-to-end in one milestone at your request (this also completed what the original plan had scoped separately as "Milestone 2.6").

### Work Completed
- 4 pure functions: `computeOnTimeDeliveryRate`, `computeLeadTimeConsistency`, `computePriceStability`, `computeSupplierReliabilityScore`.
- Composition layer bundling them into one typed result (later renamed `supplierMetrics.ts` — see the folder-consistency refactor below).
- Thin orchestrator: `recalculateSupplierReliability`, `recalculateAllSupplierReliability`.
- 15 unit tests + 3 integration tests (97 total).

### Major Technical Decisions
- **Lead Time Consistency measures deviation from the *contracted* lead time, not the supplier's own average** — the spec left this underspecified ("variance... relative to contractedLeadTimeDays"). Measuring against a supplier's own mean would let a supplier who's consistently 2x their promised time score as "perfectly consistent," which is backwards for a reliability metric. Proved with a test showing a reliably-late supplier and an unpredictable one score identically (both penalized), not the reliably-late one scoring higher.
- **If any of the 3 available components is unavailable, the whole score is `null`**, not dynamically re-weighted to 2 components — kept distinct from the *permanent* Order Accuracy exclusion (which *is* re-weighted, since that data will never exist without a schema change). A situational gap silently changing the score's meaning would undermine explainability.
- **The orchestrator always writes the computed value, including `null`** — unlike the Inventory orchestrator's skip-on-insufficient-data behavior. This is a genuine schema difference, not an inconsistency: `Supplier.reliabilityScore` is nullable, so `null` is the honest answer, whereas `Inventory`'s NOT NULL columns forced the skip strategy.

### Files Added
`lib/domain/suppliers/reliabilityScore.ts` (initially all 4 functions; later split — see refactor below), `lib/domain/suppliers/reliabilityMetrics.ts` (later renamed), `lib/domain/suppliers/recalculate.ts`, corresponding test files.

### Files Modified
`lib/domain/config.ts` (added `MIN_ORDERS_FOR_RELIABILITY_SCORE`).

### Database Changes
None persisted (rolled back in tests). Independently verified: Ganges Refreshments Co.'s score unchanged at 68 after the full suite ran; no leftover sentinel/test values in `Supplier.reliabilityScore`.

### Validation Performed
97/97 cumulative tests pass; `typecheck`/`lint` clean; integration tests against the real seeded declining-reliability supplier (Ganges Refreshments Co.) confirm its on-time rate is measurably below 100%.

### Lessons Learned
Building the full architecture (calc → composition → orchestrator) in one milestone, when explicitly requested, works fine as long as each layer is still separately reviewable — the risk is only in skipping layers, not in building them together.

---

## Domain Layer Folder Consistency Refactor

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Review the Inventory and Supplier engine folder structures for consistency before starting Milestone 2.6, and make small, behavior-preserving refactors — explicitly no new abstractions or base classes.

### Work Completed
- Split `lib/domain/suppliers/reliabilityScore.ts` (previously 4 functions in one file) into `onTimeDeliveryRate.ts`, `leadTimeConsistency.ts`, `priceStability.ts`, and a trimmed `reliabilityScore.ts` — matching the Inventory Engine's established one-file-per-function convention.
- Renamed `reliabilityMetrics.ts` → `supplierMetrics.ts` (and `SupplierReliabilityMetrics` → `SupplierMetrics`, `computeSupplierReliabilityMetrics` → `computeSupplierMetrics`) — aligns the composition-layer naming with `productMetrics.ts`'s entity-scoped convention.
- Split/renamed the corresponding test files identically.

### Major Technical Decisions
- **Deliberately left the orchestrator function names alone** (`recalculateSupplierReliability` vs. `recalculateInventoryForProduct`) — a stricter naming parallel was possible but judged to be forcing symmetry rather than improving clarity.
- Duplicated a tiny private `mean()` helper across `leadTimeConsistency.ts`/`priceStability.ts` rather than extracting a shared util module, per the explicit "no shared abstractions" instruction and to match how `demandStatistics.ts` already keeps its own private helper self-contained.

### Files Added
`onTimeDeliveryRate.ts`, `leadTimeConsistency.ts`, `priceStability.ts`, `supplierMetrics.ts` (+ matching test files).

### Files Modified
`reliabilityScore.ts` (trimmed to one function), `recalculate.ts` (updated imports).

### Database Changes
None.

### Validation Performed
Same 97 tests, now spread across 16 files instead of 13, all still passing — confirming the refactor was purely mechanical.

### Lessons Learned
Reviewing for consistency *between* two just-built engines, before starting a third, catches drift while it's still cheap to fix (2 files to rename/split) rather than after a third engine has already copied the inconsistent pattern.

---

## Milestone 2.6 – Procurement Recalculation Orchestrator

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Per the original implementation plan, wire Supplier Reliability Score to Prisma (EOQ needs no orchestrator — it's computed on-demand only, never batched).

### Work Completed
**Nothing new.** This milestone's entire planned scope — `lib/domain/suppliers/recalculate.ts` with `recalculateSupplierReliability`/`recalculateAllSupplierReliability`, plus integration tests covering the declining-reliability supplier and the insufficient-sample-size case — was already delivered inside Milestone 2.5, because that milestone's instructions explicitly requested the orchestrator and integration tests be included then. Confirmed against 2.6's original written scope field-by-field before treating it as satisfied, rather than assumed.

### Major Technical Decisions
Flagged the overlap explicitly rather than writing filler code to have "something" for this milestone slot.

### Files Added / Modified
None (see Milestone 2.5).

### Database Changes
None.

### Validation Performed
Cross-checked Milestone 2.5's actual deliverables against Milestone 2.6's original written objective, functions, and test requirements from the approved implementation plan — full match.

### Lessons Learned
When a milestone plan is written before implementation begins, later milestones' instructions can end up pulling earlier-planned work forward — worth checking explicitly rather than assuming the plan's original numbering still matches reality.

---

## Milestone 2.7 – Forecast Engine: Moving Average, Exponential Smoothing & Forecast Accuracy

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Implement the Forecast Engine (`OPERATIONS_ENGINE_SPEC.md` §4.9) as pure functions, a composition layer, and a thin orchestrator, per the same architecture as the Inventory and Procurement Engines. As with Milestone 2.5, building the full vertical slice in one pass absorbed what the original implementation plan had scoped separately as Milestones 2.8 (Forecast Accuracy) and 2.9 (Forecast Recalculation Orchestrator).

### Work Completed
- `movingAverageForecast`, `exponentialSmoothingForecast` — the two forecasters, extracted from `prisma/seed.ts`'s one-off math.
- `computeMAPE`, `computeAggregateMAPE` — Forecast Accuracy.
- `productForecastMetrics.ts` — composition layer (`computeProductForecastMetrics`) bundling both forecasters and MAPE into one typed `ProductForecastMetrics` result per product, across a caller-supplied set of target periods.
- `recalculate.ts` — thin orchestrator (`recalculateForecastsForProduct`, `recalculateAllForecasts`), backtesting the trailing `FORECAST_BACKTEST_WEEKS` (12) periods and writing `Forecast` rows.
- 33 unit tests + 4 integration tests (130 total).

### Major Technical Decisions
- **Both forecasters now return `null`, not a guessed value, when there's no prior history to forecast from** — a deliberate correction from `prisma/seed.ts`'s original versions, which fell back to `series[targetIndex] ?? 0` (moving average) or `series[0] ?? 0` (exponential smoothing at index 0). Those fallbacks were reasonable shortcuts for generating synthetic demo data but would be a real bug in a reusable forecasting function — `movingAverageForecast` in particular could otherwise silently peek at the very value it's supposed to be predicting.
- **`targetIndex` is valid from `1` through `series.length` inclusive** — `series.length` itself is the important case: "forecast the next period beyond all known history," the genuine forward-forecasting use, as opposed to backtesting an already-known period.
- **Writes via delete-then-recreate**, not per-row upsert — simpler and equally correct for a full recompute, avoiding ~24 sequential upserts per product in favor of 2 queries. Verified idempotent with a dedicated "recalculate twice" integration test.
- **`targetIndices` is caller-supplied to the composition layer**, not assumed internally — makes the same pure function serve both backtesting (indices with known actuals, MAPE computable) and true forward forecasting (actual/MAPE `null`) without any conditional logic inside the composition layer itself.

### Files Added
`lib/domain/forecasting/movingAverage.ts`, `exponentialSmoothing.ts`, `accuracy.ts`, `productForecastMetrics.ts`, `recalculate.ts`; 4 unit test files; `tests/integration/domain/forecasting/recalculate.test.ts`.

### Files Modified
`lib/domain/config.ts` (added `MOVING_AVERAGE_WINDOW`, `SMOOTHING_ALPHA`, `FORECAST_BACKTEST_WEEKS`).

### Database Changes
None persisted (rolled back in tests). Independently verified: `Forecast` row count unchanged at 4,872 after the full suite ran; no leftover test products.

### Validation Performed
130/130 cumulative tests pass; `typecheck`/`lint` clean. Integration test against a real seeded product (`DAI-0001`) confirms 12×2=24 real `Forecast` rows get written and both methods' aggregate MAPE stay under 50% (sanity bound, not a strict spec requirement) — consistent with the ~4.86% average MAPE observed when this same math first ran inside the Milestone 1.3 seed script.

### Lessons Learned
Porting "generation" math into a "prediction" function isn't a pure extraction — the seed script's edge-case fallbacks were fine for producing *plausible-looking data* but wrong for a function whose job is to *not know the answer in advance*. Worth explicitly re-examining every edge case of ported math for this distinction, not just copying it over as-is.

---

## Milestone — Analytics Engine: ABC Analysis (Batch Classification)

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Implement ABC Analysis (`OPERATIONS_ENGINE_SPEC.md` §4.5) as a batch, catalog-wide operation rather than the per-product pattern used by every engine so far — deliberately confirmed with you before starting, since this metric's shape is structurally different (a product's class only makes sense relative to every other product's usage value).

### Work Completed
- `computeUsageValue` — pure per-product calculation (`annualDemand x unitCost`).
- `classifyABC` — the batch composition layer: ranks the *entire* catalog by usage value, computes running cumulative percentage, and classifies against the 80/95 Pareto cutoffs, with deterministic tie-breaking.
- `recalculateABCClassification` — thin orchestrator: one batch query for the whole catalog, reuses `computeAnnualDemand` from the Procurement Engine (not reimplemented), writes `Product.abcClass`.
- 15 unit tests + 4 integration tests (147 total).

### Major Technical Decisions
- **No per-product orchestration function exists, deliberately** — unlike every other engine, there is no `recalculateABCClassificationForProduct(productId)`, because classifying one product in isolation is meaningless for this metric. This was the core design constraint you specified up front, not an afterthought.
- **`computeAnnualDemand` reused as-is from `lib/domain/procurement/annualDemand.ts`**, not recomputed — the orchestrator calls it once per product while building the batch, so the trailing-52-week convention has exactly one implementation across both engines.
- **Deterministic tie-break (usage value descending, then SKU ascending)** — proved with a dedicated test showing two products tied at the same value classify identically regardless of the order they're passed in, which matters because an unstable sort could otherwise flip a boundary product's class on every run for no real reason.
- **A product with zero usage value classifies as C by construction** (no special-casing needed — it simply sorts to the bottom); but an **all-zero-value catalog refuses to classify at all** (returns `null`), rather than assigning arbitrary classes to meaningless data.
- **Assumption caught and corrected before it became a wrong test**: I initially assumed the catalog's highest-*volume* product (`BEV-0001`, the seed data's "hero" cola SKU) would also be the highest-*usage-value* product and be Class A. A direct SQL query against the real seeded data proved this wrong — `BEV-0001` actually lands in Class B (~93% cumulative), because it has the lowest unit cost in its category; the true #1 usage-value product (`BEV-0012`, Apple Juice) sits at ~1.1% cumulative instead. Fixed the integration test to assert the empirically-verified product, and kept `BEV-0001`'s real (different) classification as an explicit assertion too, rather than deleting the discrepancy quietly.

### Files Added
`lib/domain/analytics/usageValue.ts`, `abcClassification.ts`, `recalculate.ts`; 2 unit test files; `tests/integration/domain/analytics/recalculate.test.ts`.

### Files Modified
`lib/domain/config.ts` (added `ABC_CUTOFFS`).

### Database Changes
None persisted (rolled back in tests). Independently verified: `Product.abcClass` still `null` for all 203 products after the full suite ran.

### Validation Performed
147/147 cumulative tests pass; `typecheck`/`lint` clean. Integration tests confirm a full-catalog run classifies every product with zero exclusions, produces all three classes, is idempotent across two consecutive runs, and matches SQL-query-verified ground truth for two specific products.

### Lessons Learned
When a formula's outcome for a *specific* real record is used as a test assertion, verify it against the actual data with an independent query first — don't reason it out from "this should intuitively be the biggest one." The intuitive guess (highest raw demand = highest usage value) was wrong here specifically because cost and demand move in opposite directions across a category block, which is realistic FMCG behavior, not a seed data quirk.

---

## Milestone — Analytics Engine: Inventory Turnover, Warehouse Utilization & Operations Health Score

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Complete the Analytics Engine by implementing Inventory Turnover (§4.6), Warehouse Utilization (§4.7), and Operations Health Score (§4.10) from `OPERATIONS_ENGINE_SPEC.md`, treated as one cohesive capability rather than three independent calculations — Operations Health Score is *built from* the other two (plus outputs of every earlier engine), so computing them separately would mean re-deriving the same aggregates twice.

### Work Completed
- `inventoryValue.ts`, `turnover.ts`, `turnoverHealth.ts` — Inventory Turnover and its 0–100 normalization.
- `warehouseUtilization.ts`, `warehouseUtilizationHealth.ts` — Warehouse Utilization and its normalization.
- `operationsHealthScore.ts` — the cross-engine weighted blend, with automatic weight renormalization when a component is missing.
- `companyAnalytics.ts` — the one batch composition layer this milestone needed: `computeCompanyAnalyticsSnapshot()`, computing all three metrics together from pre-fetched, company-wide data.
- `recalculate.ts`: added `getCompanyAnalyticsSnapshot()` — a **read-only** orchestrator (none of these three metrics are persisted anywhere per the spec).
- 46 unit tests + 3 integration tests (193 total).

### Major Technical Decisions
- **Reused `computeUsageValue` (ABC Analysis) as-is for COGS** — Inventory Turnover's COGS term (`Σ annualDemand × unitCost`) is structurally identical to ABC's per-product usage value; no near-duplicate formula was written.
- **Reused `computeInventoryHealthScore` (Inventory Engine, Milestone 2.2) directly inside the Analytics composition layer** — the company-wide average Inventory Health component of Operations Health Score calls the *same* function already used per-row by the Inventory Engine, not a re-derived variant.
- **No composition layer for Turnover or Utilization individually** — both are single ratios with no multi-step composition to speak of; a composition layer only exists where one is actually needed (`companyAnalytics.ts`, for the genuinely cross-cutting Operations Health Score), per your explicit instruction.
- **Weight renormalization falls out of the math, not an if/else cascade**: dividing the weighted sum by the sum of only the *present* weights (not a fixed 1.0) automatically redistributes a missing component's weight across the rest. Proved with a test showing a component's absence never silently drags the score down as if it were 0.
- **`getCompanyAnalyticsSnapshot` lives in the same `recalculate.ts` file as `recalculateABCClassification`**, despite writing nothing — both are Analytics Engine orchestrators over the same full-catalog data; splitting into a separate file for the one that happens to be read-only seemed like a distinction without a difference. Named explicitly as "get", not "recalculate", so its read-only nature is obvious from the call site.
- **Simplified `computeWarehouseUtilizationHealth`'s declining-band formula mid-implementation.** My first draft derived the "warning" band width from `WAREHOUSE_UTILIZATION_THRESHOLDS` via a `2/3` coefficient, so the two config constants stayed numerically aligned — but that coupling was implicit and fragile (a future edit to one constant would silently break the other). Replaced with a fixed 10-point declining band, the same numeric shape as Inventory Health Score's own bands, with no cross-constant coupling at all.

### Files Added
`lib/domain/analytics/inventoryValue.ts`, `turnover.ts`, `turnoverHealth.ts`, `warehouseUtilization.ts`, `warehouseUtilizationHealth.ts`, `operationsHealthScore.ts`, `companyAnalytics.ts`; 7 unit test files.

### Files Modified
`lib/domain/config.ts` (added `TARGET_TURNOVER_RATE`, `WAREHOUSE_UTILIZATION_THRESHOLDS`, `WAREHOUSE_UTILIZATION_IDEAL_BAND`, `OPERATIONS_HEALTH_WEIGHTS`); `lib/domain/analytics/recalculate.ts` (added `getCompanyAnalyticsSnapshot`); `tests/integration/domain/analytics/recalculate.test.ts` (added 3 tests).

### Database Changes
None (read-only by design; also rolled back in tests regardless). Independently verified: `Product.abcClass` still `null` for all products, Ganges Refreshments Co.'s `reliabilityScore` still 68 after the full suite ran.

### Validation Performed
193/193 cumulative tests pass; `typecheck`/`lint` clean. Integration tests confirm real seeded warehouse utilization matches the exact target values baked into the Milestone 1.3 seed script's capacity calibration (Mumbai 91%, Delhi 78%, Bengaluru 63%, Kolkata 46%) — a genuine round-trip check, not just "the function ran." Also confirmed all five Operations Health Score components are available for the full seeded dataset (20/20 suppliers scored, 4,872/4,872 forecasts have MAPE), so the real computed score uses the full nominal weights with no renormalization.

### Lessons Learned
A formula that couples two *separately-named, separately-documented* configuration constants via an algebraic derivation (the `2/3` coefficient) is a readability trap even when the math is correct — a future reader (or editor) has no way to know the coupling exists without deriving it themselves. Prefer independent, directly-tunable constants with the same *shape* of formula over one implicitly derived from another, even at the cost of a little numeric coincidence being spelled out twice.

---

## Milestone — Operations Copilot: Recommendation Rule Engine

**Date:** 2026-08-02
**Git commit:** *Not yet committed*

### Objective
Implement the first of three Operations Copilot milestones: a deterministic rule engine that consumes the already-computed outputs of every engine built so far (Inventory, Procurement, Supplier, Forecast, Analytics) and produces recommendation *candidates* — no AI narrative, no database writes yet (persistence and Claude integration remain separate, later milestones, deliberately not absorbed into this one this time).

### Work Completed
- `RecommendationCandidate` — the shared candidate shape (`lib/domain/recommendations/recommendationCandidate.ts`), modeling every field this milestone's brief required as its own explicit property rather than one opaque string: `triggerCondition` (which rule fired), `supportingMetrics` (the real numbers behind it, structured, not prose), `severity` (the schema's own `RecommendationSeverity` enum), and `justification` (the human-readable sentence, corresponding to `AIRecommendation.metricJustification`).
- Six pure rule functions, one file each, each consuming a different completed engine's output and adding no new calculation of its own:
  - `findCriticalInventoryPositions` / `findOverstockedPositions` — read `Inventory.stockStatus` as already classified by `classifyStockStatus` (Inventory Engine).
  - `findLowReliabilitySuppliers` — thresholds `Supplier.reliabilityScore` as already computed by `computeSupplierMetrics` (Supplier Engine).
  - `findOverduePurchaseOrders` — a direct condition on raw `PurchaseOrder.status`/`expectedDeliveryDate` (no engine computes "is this overdue," so there is nothing to reuse here).
  - `findWarehousesNearCapacity` — thresholds `computeWarehouseUtilization`'s output (Analytics Engine) against the already-defined `WAREHOUSE_UTILIZATION_THRESHOLDS`.
  - `findDemandIncreaseCandidates` — compares the earliest/latest points of an already-computed forecast series (Forecast Engine), gated by that same forecast's aggregate MAPE.
- 34 unit tests against small synthetic fixtures (228 cumulative) + 6 integration tests reading real seeded data through the already-built engine tables/orchestrators inside rolled-back transactions.

### Major Technical Decisions
- **`RecommendationCandidate` models trigger/metrics/severity/justification as four distinct fields**, not one formatted string — a deliberate upgrade over the originally-sketched plan, so a future UI or test can read the structured data directly instead of parsing prose. `justification` alone is what eventually becomes `AIRecommendation.metricJustification`; `triggerCondition`/`supportingMetrics` are this milestone's explainability layer, not new schema fields.
- **Renamed the planned `findDecliningSuppliers` to `findLowReliabilitySuppliers`** and implemented it as a threshold on the *current* Reliability Score, not a trend. No engine in this codebase computes a reliability trend over time — Supplier Engine outputs one point-in-time score — and building trend detection would be a new calculation, which this milestone's brief explicitly said not to introduce. Flagging this renaming explicitly rather than quietly mislabeling a threshold check as "declining."
- **`findDemandIncreaseCandidates` uses a simple earliest-vs-latest relative-change comparison over an already-computed forecast series**, gated by `MAX_TRUSTED_FORECAST_MAPE` — deliberately different from (and simpler than) the ad-hoc seasonal-lookahead heuristic the Milestone 1.3 seed script used to generate its example `AIRecommendation` rows. That heuristic only ever existed inline in the seed script, was never built as a reusable Forecast Engine capability, and reproducing it here would mean inventing a new forecasting calculation rather than reusing one.
- **`findOverduePurchaseOrders` is a direct raw-data condition, not a metric consumer** — not every rule needs a computed metric behind it; some are legitimately just a business rule over facts already in the schema.
- **No composition layer or persistence orchestrator this round** — this milestone's brief scoped the work to the rule functions only ("no database writes yet"), unlike earlier engines where a composition/orchestrator layer was explicitly requested. Kept the six rule functions as flat, independent pure functions; combining "call every rule" with "persist the results" is left for the Recommendation Persistence Orchestrator milestone, where fetching+writing naturally belong together.
- **Two new config constants added** (`LOW_RELIABILITY_THRESHOLD = 70`, `DEMAND_INCREASE_THRESHOLD_PERCENT = 15`, `MAX_TRUSTED_FORECAST_MAPE = 30`) — these are rule-engine trigger thresholds, not Operations Engine formulas, so adding them doesn't touch the frozen schema or duplicate any existing calculation.
- **Integration tests read real data directly from Inventory/Supplier/PurchaseOrder tables and via the existing `getCompanyAnalyticsSnapshot` orchestrator**, inside a rolled-back transaction for consistency with every other engine's integration tests, even though the rule functions themselves are pure and nothing here writes. This validates real recommendations emerge from the actual Milestone 1.3 seed scenarios (e.g., the flagship `DAI-0016` stockout at Mumbai, the four suppliers below the reliability threshold, Mumbai's warehouse at 91% utilization).

### Files Added
`lib/domain/recommendations/recommendationCandidate.ts`, `criticalInventory.ts`, `overstockedInventory.ts`, `lowReliabilitySuppliers.ts`, `overduePurchaseOrders.ts`, `warehousesNearCapacity.ts`, `demandIncrease.ts`; 6 unit test files; `tests/integration/domain/recommendations/rules.test.ts`. Removed the now-unnecessary `lib/domain/recommendations/.gitkeep`.

### Files Modified
`lib/domain/config.ts` (added `LOW_RELIABILITY_THRESHOLD`, `DEMAND_INCREASE_THRESHOLD_PERCENT`, `MAX_TRUSTED_FORECAST_MAPE`).

### Database Changes
None (pure functions; integration tests also rolled back regardless). Independently verified: `Warehouse`/`Supplier`/`Product`/`Inventory`/`PurchaseOrder`/`Forecast`/`AIRecommendation` row counts unchanged (4/20/203/812/145/4872/13) after the full suite ran.

### Validation Performed
228/228 cumulative tests pass; `typecheck`/`lint` clean. Two genuine edge cases were caught and fixed during integration testing (not implementation bugs — both were overly-strict test assertions): a purchase order overdue by less than 24 hours legitimately floors to `daysOverdue = 0` while still being a valid candidate, and a true overstock ratio of ~4.002 rounds to exactly `4.00` in the 2-decimal `supportingMetrics` display value — both assertions were loosened from strict `>` to `>=` to match.

### Lessons Learned
When a test fails with a value that looks impossible given a debug log printed one line earlier, don't assume concurrency or environment weirdness — read further down the same block first. Here, a `for` loop's assertion three lines below the debug line (not the assertion right after it) was the actual failure; the "impossible" mismatch was two different assertions in the same test, not a race condition.

---

## Current Project Status

### Completed Modules
- ✅ Phase 0 — Documentation (`PROJECT_PLAN.md`, `PRODUCT_REQUIREMENTS_DOCUMENT.md`, `SYSTEM_ARCHITECTURE.md`, `DEVELOPMENT_ROADMAP.md`)
- ✅ Milestone 1.1 — Project Foundation (Next.js 14 + TypeScript + Tailwind + shadcn/ui + Prisma scaffold)
- ✅ Milestone 1.2 — Database Schema & Migration (10 tables, 9 enums, applied migration; **schema now frozen**)
- ✅ Milestone 1.3 — Synthetic FMCG Dataset (full NovaFoods dataset + 10 business scenarios, seeded and validated)
- ✅ Milestone 1.3 Documentation — `DATA_DICTIONARY.md`
- ✅ `OPERATIONS_ENGINE_SPEC.md` — every OM calculation defined before implementation
- ✅ Milestones 2.0–2.6 — Inventory Engine (Safety Stock, Reorder Point, Stock Status, Health Score, recalculation orchestrator) and Procurement Engine (EOQ, Supplier Reliability Score, recalculation orchestrator), each as pure functions + composition layer + thin orchestrator, fully unit- and integration-tested
- ✅ Domain layer folder-consistency refactor (Inventory ↔ Supplier engine naming/structure aligned)
- ✅ Milestone 2.7 — Forecast Engine (Moving Average, Exponential Smoothing, Forecast Accuracy/MAPE, recalculation orchestrator) — absorbed the originally-separate Milestones 2.8–2.9, same pattern as 2.5 absorbing 2.6.
- ✅ Analytics Engine — complete: ABC Analysis, Inventory Turnover, Warehouse Utilization, Operations Health Score.
- ✅ Operations Copilot — Recommendation Rule Engine (deterministic candidate generation, no persistence/AI yet). **228 tests passing.**

## Milestone — Operations Copilot: Recommendation Persistence Orchestrator

**Date:** 2026-08-03
**Git commit:** *Not yet committed*

### Objective
Implement the second of three Operations Copilot milestones: the thin orchestrator that runs all six Recommendation Rule Engine functions against real database state and synchronizes the results into `AIRecommendation` — inserting new recommendations, refreshing changed ones, and removing ones whose trigger condition has resolved, without ever disturbing a row the user has already acted on.

### Work Completed
- `pickMoreAccurateForecast` — always selects whichever forecast method (Moving Average or Exponential Smoothing) has the lower aggregate MAPE for a product, per your explicit instruction not to hardcode one method; the Recommendation Engine consumes whichever is currently more accurate.
- `recommendationIdentityKey` — the single, dedicated helper constructing the `(category, productId, supplierId, warehouseId)` dedup key; nothing else in the codebase builds this string itself.
- `computeRecommendationSyncPlan` — pure decision layer: diffs current `ACTIVE` rows against fresh candidates into `toInsert`/`toUpdate`/`toDelete`, leaving unchanged matches untouched.
- `recalculate.ts` — `generateAllRecommendationCandidates` (read-only: fetches every engine's current output, including reusing `getCompanyAnalyticsSnapshot` for warehouse utilization, and runs all six rule functions), `syncRecommendations` (fetches `ACTIVE` rows, applies the sync plan, wrapped in a single Prisma transaction), and `recalculateAllRecommendations` (composes the two).
- 24 unit tests (syncPlan + pickMoreAccurateForecast) + 5 integration tests (252 cumulative).

### Major Technical Decisions
- **Forecast method selection is dynamic, not hardcoded** — `pickMoreAccurateForecast` compares both methods' already-computed `aggregateMAPE` per product and picks the lower (ties favor Moving Average). Given its own file and direct unit tests since you called this requirement out explicitly, rather than leaving it as an inline, indirectly-tested orchestrator helper.
- **`recommendationIdentityKey` extracted as the sole key-construction path**, documented as an application-level substitute for a real database key, expected to be replaced if the schema ever grows one.
- **`syncRecommendations` self-wraps in `prisma.$transaction` only when `db === prisma`** (reference equality against the singleton import) — Prisma doesn't support nested interactive transactions, so when called with an already-open transaction client (every integration test, and any future caller composing this with other work), the sync runs directly against it instead, which is already atomic as part of that enclosing transaction. Satisfies "wrap the entire synchronization process in a single transaction" in both the standalone and composed-caller cases.
- **Bug found and fixed during integration testing: `findOverduePurchaseOrders` (previous milestone) could emit multiple candidates sharing one identity key.** Two real (supplier, warehouse) pairs in the seeded data each have several overdue orders; the rule emitted one candidate per order, all mapping to the same `(PROCUREMENT, null, supplierId, warehouseId)` key — the idempotency integration test caught this directly (a second consecutive run reported non-zero deletes). Root cause isn't the key: `AIRecommendation` has no `purchaseOrderId` column, so `(supplierId, warehouseId)` is the finest granularity a persisted recommendation can express regardless of key design. Fixed by changing `findOverduePurchaseOrders` to consolidate all overdue orders for the same pair into one candidate (worst delay + a count), rather than emitting indistinguishable duplicates. Updated that rule's unit tests and the previous milestone's integration test to match the new `overdueOrderCount`/`maxDaysOverdue` supporting metrics.
- **No per-entity variant** — `recalculateAllRecommendations` is batch-only, same justification as ABC Analysis: every rule is a whole-catalog/company-wide scan, two aren't even entity-scoped, so a per-product variant would be meaningless.
- **First real run deletes most of the Milestone 1.3 seed-authored `AIRecommendation` rows** (11 `ACTIVE`, hand-picked illustrative examples, not rule-engine output) — confirmed via integration test (`deleted > 0`); the 1 `ACCEPTED` and 1 `DISMISSED` seed rows are untouched. The rule engine becomes the sole source of truth for `ACTIVE` rows going forward, as approved.

### Files Added
`lib/domain/recommendations/pickMoreAccurateForecast.ts`, `syncPlan.ts`, `recalculate.ts`; 3 unit test files; `tests/integration/domain/recommendations/recalculate.test.ts`.

### Files Modified
`lib/domain/recommendations/overduePurchaseOrders.ts` (consolidation fix, see above); `tests/unit/domain/recommendations/overduePurchaseOrders.test.ts` and `tests/integration/domain/recommendations/rules.test.ts` (updated for the new supporting-metrics shape).

### Database Changes
None persisted (rolled back in tests; the `db === prisma` committing path is never exercised in a test, consistent with every prior orchestrator). Independently verified: `AIRecommendation` still 13 rows (11 `ACTIVE`/1 `ACCEPTED`/1 `DISMISSED`) after the full suite ran.

### Validation Performed
252/252 cumulative tests pass; `typecheck`/`lint` clean. Integration tests confirm: `ACCEPTED`/`DISMISSED` rows are never touched; after one run, the `ACTIVE` row count equals `candidatesGenerated` exactly; a second consecutive run is fully idempotent (0 created/updated/deleted); the first run against real seed data deletes the stale hand-authored rows as expected.

### Lessons Learned
An approved application-level identity key can be structurally sound and still break if a rule function's output granularity is finer than what the target table can actually persist — the fix belongs at the rule (consolidate to match what's persistable), not at the key. This was caught by the idempotency test specifically, not by any test of the rule function in isolation — a reminder that "unit tests pass" and "the sync survives running twice" are different guarantees.

---

## Current Project Status

### Completed Modules
- ✅ Phase 0 — Documentation (`PROJECT_PLAN.md`, `PRODUCT_REQUIREMENTS_DOCUMENT.md`, `SYSTEM_ARCHITECTURE.md`, `DEVELOPMENT_ROADMAP.md`)
- ✅ Milestone 1.1 — Project Foundation (Next.js 14 + TypeScript + Tailwind + shadcn/ui + Prisma scaffold)
- ✅ Milestone 1.2 — Database Schema & Migration (10 tables, 9 enums, applied migration; **schema now frozen**)
- ✅ Milestone 1.3 — Synthetic FMCG Dataset (full NovaFoods dataset + 10 business scenarios, seeded and validated)
- ✅ Milestone 1.3 Documentation — `DATA_DICTIONARY.md`
- ✅ `OPERATIONS_ENGINE_SPEC.md` — every OM calculation defined before implementation
- ✅ Milestones 2.0–2.6 — Inventory Engine (Safety Stock, Reorder Point, Stock Status, Health Score, recalculation orchestrator) and Procurement Engine (EOQ, Supplier Reliability Score, recalculation orchestrator), each as pure functions + composition layer + thin orchestrator, fully unit- and integration-tested
- ✅ Domain layer folder-consistency refactor (Inventory ↔ Supplier engine naming/structure aligned)
- ✅ Milestone 2.7 — Forecast Engine (Moving Average, Exponential Smoothing, Forecast Accuracy/MAPE, recalculation orchestrator) — absorbed the originally-separate Milestones 2.8–2.9, same pattern as 2.5 absorbing 2.6.
- ✅ Analytics Engine — complete: ABC Analysis, Inventory Turnover, Warehouse Utilization, Operations Health Score.
- ✅ Operations Copilot — Recommendation Rule Engine (deterministic candidate generation).
- ✅ Operations Copilot — Recommendation Persistence Orchestrator (syncs candidates into `AIRecommendation`, status-preserving, idempotent).

## Milestone — Operations Copilot: Claude AI Narrative Integration

**Date:** 2026-08-03
**Git commit:** *Not yet committed*

### Objective
Implement the final Operations Copilot milestone: optional AI-generated narratives for persisted recommendations, calling the Claude API to turn a recommendation's structured explainability fields into 2-3 sentences of plain English — strictly additive, never a dependency for anything deterministic to keep working.

### Work Completed
- `lib/ai/` — a new top-level layer, parallel to `lib/domain/`, holding every piece of Claude-specific code:
  - `narrativeProvider.ts` — the `NarrativeProvider` interface (`generateNarrative(input): Promise<string | null>`) and its provider-agnostic `RecommendationNarrativeInput` type. Contract: implementations never throw — every failure resolves to `null`.
  - `prompt.ts` — `buildNarrativePrompt`, a pure function turning a `RecommendationNarrativeInput` into the LLM prompt text.
  - `claudeNarrativeProvider.ts` — `ClaudeNarrativeProvider`, the only file (besides `prompt.ts`) that imports `@anthropic-ai/sdk` or knows a Claude request/response shape. Model `claude-opus-5`, `output_config.effort: "low"` (a short formatting task, not deep reasoning), thinking left unset (runs Claude Opus 5's adaptive default). Returns `null` — never throws — when no API key is configured, on any SDK error, and on `stop_reason: "refusal"`.
  - `narrativeInput.ts` — `toNarrativeInput`, the one function in the codebase that imports both a domain type (`RecommendationCandidate`) and an AI type, bridging the two layers in a single direction.
  - `narrateRecommendations.ts` — `narrateActiveRecommendations(provider, db, options)`, the thin orchestrator: reuses `generateAllRecommendationCandidates` and `recommendationIdentityKey` (both already exported by the domain layer, not duplicated) to reconstruct each `ACTIVE` row's full `RecommendationCandidate`, then fills in `aiNarrative` for rows that don't have one (or all of them, with `regenerateExisting: true`).
- Installed `@anthropic-ai/sdk`; added a documented, optional `ANTHROPIC_API_KEY` to `.env.example`.
- 8 unit tests (prompt, narrativeInput, the no-API-key degradation path) + 4 integration tests (263 cumulative).

### Major Technical Decisions
- **Complete isolation, verified by grep, not just by convention** — confirmed zero references to `lib/ai` or `@anthropic-ai/sdk` anywhere under `lib/domain`. The domain layer's recommendation sync (`recalculateAllRecommendations`) never calls into `lib/ai` and has no idea AI narratives exist; every recommendation is fully functional with `aiNarrative` left `null`.
- **`narrateActiveRecommendations` takes `provider: NarrativeProvider` as an explicit parameter**, not a hardcoded `ClaudeNarrativeProvider` — the orchestrator itself is provider-agnostic, not just the interface it depends on. Substituting another LLM means writing one new class against `NarrativeProvider`; nothing in `narrateRecommendations.ts` changes.
- **`RecommendationNarrativeInput` is its own type, not a re-export of `RecommendationCandidate`** — mirrors the same four explainability fields, but decouples the AI layer's contract from the domain layer's internal shape. `narrativeInput.ts` is the single, explicit bridge between them.
- **Narratives are generated from the pre-persistence `RecommendationCandidate`, not the flattened `AIRecommendation` row** — the row only has `category`/`severity`/`metricJustification` as columns (no `triggerCondition`/`supportingMetrics`), so `narrateActiveRecommendations` re-derives the richer candidate via `generateAllRecommendationCandidates` + `recommendationIdentityKey` rather than working from what's persisted. This gives the LLM the structured trigger condition and numeric metrics as real prompt content, not just a pre-formatted sentence to paraphrase.
- **Contract of "never throws" lives on the interface, not on each caller** — `ClaudeNarrativeProvider.generateNarrative` catches everything internally (missing key, network error, rate limit, safety refusal) and returns `null`. `narrateActiveRecommendations` needs no try/catch of its own; "Claude unavailable" is just a `null` it already has a branch for.
- **`effort: "low"`, thinking left unset** — narrative generation is a short, low-complexity formatting task (turn already-known facts into 2-3 sentences), not the kind of task the skill's "default to adaptive thinking and opus at high effort" guidance is aimed at; documented the reasoning inline since it's a deliberate deviation from those defaults, not an oversight.
- **Unit-testing strategy for the Claude-calling code**: only the deterministic, network-free "no API key configured → `null`" path is unit-tested directly. The real Claude round trip is exercised indirectly, by injecting a `FakeNarrativeProvider` test double (implementing the same `NarrativeProvider` interface a real caller would use) into `narrateActiveRecommendations`'s integration tests — legitimate use of the interface's own seam, not mocking the Anthropic SDK, consistent with this codebase's no-mocks discipline.
- **Discovered mid-testing: matched seed rows keep their original `aiNarrative`.** Some of the Milestone 1.3 seed-authored `AIRecommendation` rows already had a non-null `aiNarrative`; when `recalculateAllRecommendations` matches one of them to a real current candidate, it updates `severity`/`metricJustification` only — `aiNarrative` is untouched, by design (the persistence sync has no AI awareness). `narrateActiveRecommendations`'s default (`aiNarrative IS NULL` only) correctly leaves those rows alone; `regenerateExisting: true` correctly overwrites them. Two integration test assertions were fixed to account for this instead of assuming every row starts narrative-free.

### Files Added
`lib/ai/narrativeProvider.ts`, `prompt.ts`, `claudeNarrativeProvider.ts`, `narrativeInput.ts`, `narrateRecommendations.ts`; 3 unit test files; `tests/integration/ai/narrateRecommendations.test.ts`. Removed the now-unnecessary `lib/ai/.gitkeep`.

### Files Modified
`package.json`/`package-lock.json` (added `@anthropic-ai/sdk`); `.env.example` (documented optional `ANTHROPIC_API_KEY`).

### Database Changes
None (rolled back in tests). Independently verified: `AIRecommendation` still 13 rows, all 13 still non-null `aiNarrative`, after the full suite ran.

### Validation Performed
263/263 cumulative tests pass; `typecheck`/`lint` clean; `grep` confirms no `lib/domain` file references `lib/ai` or `@anthropic-ai/sdk`. Integration tests confirm: narration fills in exactly the eligible (null-`aiNarrative`, matched) rows; a provider returning `null` leaves every row byte-for-byte unchanged; already-narrated rows are skipped by default and only touched with `regenerateExisting: true`; rows with no matching current candidate are counted and skipped rather than guessed at.

### Lessons Learned
An orchestrator that reuses another orchestrator's output (`recalculateAllRecommendations`'s sync semantics) inherits that output's edge cases — here, "matched rows keep pre-existing fields the sync doesn't touch" wasn't something the narrative layer's own logic could have surfaced; it only showed up once tests exercised the two milestones together against real seeded data, not in isolation.

---

## Current Project Status

### Completed Modules
- ✅ Phase 0 — Documentation (`PROJECT_PLAN.md`, `PRODUCT_REQUIREMENTS_DOCUMENT.md`, `SYSTEM_ARCHITECTURE.md`, `DEVELOPMENT_ROADMAP.md`)
- ✅ Milestone 1.1 — Project Foundation (Next.js 14 + TypeScript + Tailwind + shadcn/ui + Prisma scaffold)
- ✅ Milestone 1.2 — Database Schema & Migration (10 tables, 9 enums, applied migration; **schema now frozen**)
- ✅ Milestone 1.3 — Synthetic FMCG Dataset (full NovaFoods dataset + 10 business scenarios, seeded and validated)
- ✅ Milestone 1.3 Documentation — `DATA_DICTIONARY.md`
- ✅ `OPERATIONS_ENGINE_SPEC.md` — every OM calculation defined before implementation
- ✅ Milestones 2.0–2.6 — Inventory Engine (Safety Stock, Reorder Point, Stock Status, Health Score, recalculation orchestrator) and Procurement Engine (EOQ, Supplier Reliability Score, recalculation orchestrator), each as pure functions + composition layer + thin orchestrator, fully unit- and integration-tested
- ✅ Domain layer folder-consistency refactor (Inventory ↔ Supplier engine naming/structure aligned)
- ✅ Milestone 2.7 — Forecast Engine (Moving Average, Exponential Smoothing, Forecast Accuracy/MAPE, recalculation orchestrator) — absorbed the originally-separate Milestones 2.8–2.9, same pattern as 2.5 absorbing 2.6.
- ✅ Analytics Engine — complete: ABC Analysis, Inventory Turnover, Warehouse Utilization, Operations Health Score.
- ✅ **Operations Copilot — complete**: Recommendation Rule Engine, Recommendation Persistence Orchestrator, Claude AI Narrative Integration. **263 tests passing.**

### In Progress
- Nothing currently in progress. All three Operations Copilot milestones (Rule Engine, Persistence Orchestrator, AI Narrative Integration) are complete.

### Upcoming Milestones
Per the approved Operations Engine implementation plan, in order:
1. **Executive Dashboard & Analytics UI** — the presentation layer tying every engine together (not yet scoped in detail)
2. **Polish & Deployment** — responsive/accessibility pass, README, optional hosted demo

---

## Milestone — Presentation Layer (Dashboard Backend + Frontend)

**Date:** 2026-08-03
**Git commit:** *Not yet committed*

### Objective
Build the full presentation layer for all 7 modules (Executive Dashboard, Inventory Intelligence, Procurement, Suppliers, Demand Forecasting, Analytics, Operations Copilot): consolidated page-level API routes, a single global recalculation endpoint, and a complete Next.js UI — consuming every already-built engine, computing nothing new.

### Work Completed
- **Foundations**: shadcn/ui primitives installed (card, table, badge, button, tabs, select, skeleton, dialog, tooltip, separator, dropdown-menu, sheet, scroll-area); sidebar + top-bar shell (`components/nav/`); shared formatting (`lib/format.ts`), status/severity badges (`components/badges.tsx`), KPI card, page header, empty state, filter-select, and pagination components.
- **`POST /api/recalculate`** — the single global recalculation endpoint (replacing the originally-planned per-module ones), running Inventory → Suppliers → Forecast → Analytics (ABC) → Recommendations in dependency order via the existing orchestrators, returning a combined summary.
- **Seven consolidated page-level routes** (`/api/dashboard`, `/api/inventory[/[productId]]`, `/api/procurement`, `/api/suppliers[/[supplierId]]`, `/api/forecasting`, `/api/analytics`, `/api/copilot[/recommendations/[id], /narrate]`), each backed by a shared `lib/presentation/*Data.ts` function called directly by its Server Component page (no self-fetch over HTTP) and wrapped thinly by the route handler for client-side/external use — one rich endpoint per page, not one per engine.
- **Seven pages** at `/`, `/inventory`, `/procurement`, `/suppliers`, `/forecasting`, `/analytics`, `/copilot` (plus `/inventory/[productId]`, `/suppliers/[supplierId]`), each with KPI cards, Recharts visualizations, filterable/paginated tables, and `loading.tsx` skeletons; a shared root `error.tsx` and `not-found.tsx`.
- **Executive Brief** (`lib/presentation/executiveBrief.ts`) — a new deterministic, template-based summary at the top of the dashboard, built entirely from already-fetched KPI numbers (Operations Health Score, critical/overstocked counts, supplier/PO/warehouse figures). No AI, no new calculation — pure sentence templating over existing outputs, explicitly separate from the optional AI narrative panel.
- **Recommendation panel** (`components/copilot/`) — full list with severity-sorted cards, Accept/Snooze/Dismiss actions (`PATCH /api/copilot/recommendations/[id]`), and a compact top-N widget on the dashboard.
- **AI narrative panel** — a collapsible "AI Insight" section per card (shown only when `aiNarrative` is present) plus a single page-level "Generate AI Insights" batch button (`POST /api/copilot/narrate`, batch-only per your explicit instruction — no per-card generation).
- **`/api/products`, `/api/warehouses`** — shared, lightweight catalog reads used by pickers/filters across multiple pages.

### Major Technical Decisions
- **Shared data-layer pattern**: every page's Server Component calls its `lib/presentation/*Data.ts` function directly (no HTTP round-trip for its own render); the matching `app/api/*/route.ts` is a thin `NextResponse.json(...)` wrapper around the *same* function, used for client-side refetches (filter changes, the Forecasting product picker) and as a documented, reusable API surface. One implementation, never duplicated between "the page" and "the route."
- **Reads vs. live computation, by what's actually persisted**: list/table views read persisted columns directly (`Inventory.stockStatus`, `Supplier.reliabilityScore`, `Forecast` rows); values that are deliberately *never* persisted (Inventory Health Score, EOQ, full Supplier Reliability component breakdown, Company Analytics Snapshot, ABC ranking with cumulative %) are computed live on every request via the exact same pure/composition functions the engines already expose — e.g. Suppliers list shows the persisted score; the Supplier detail page calls `computeSupplierMetrics` live for the full breakdown, mirroring `recalculateSupplierReliability`'s own input-shaping.
- **URL-driven filtering, not client state**: Inventory/Procurement/Suppliers/Copilot filters and pagination are plain `<select>`s and links that update the URL query string, letting the Server Component refetch — no client-side data-fetching layer needed for the common case. Only the Forecasting page's product picker and the Copilot panel's actions are genuinely interactive client components (product switch needs a snappy re-fetch without full navigation; Accept/Dismiss/Narrate are real writes).
- **`syncRecommendations`'s `db === prisma` self-wrapping transaction, applied for real for the first time**: `POST /api/recalculate` calls the five orchestrators with their default `db = prisma` argument (no test transaction), which is the first time this codebase's `db === prisma` branch (added in the Recommendation Persistence milestone) has actually executed in anger rather than just being exercised by unit tests of the branch logic itself.
- **Bug found and fixed: unrounded floating-point numbers in two Recommendation Rule Engine justification strings.** `findCriticalInventoryPositions` and `findOverstockedPositions` (built in an earlier milestone) interpolated the raw `reorderPoint` value — e.g. "reorder point of 1295.048004544131 units" — because every existing test only asserted on substrings, never rendered the full sentence to a real screen. This was invisible until this milestone's browser verification actually displayed live rule-engine output for the first time (every prior integration test used real data but never *displayed* the justification text). Fixed by rounding to whole units for display in both the justification string and `supportingMetrics.reorderPoint`, while keeping the ratio/comparison math in `findOverstockedPositions` computed from the unrounded value. Backend test suite re-verified green after the fix (263/263).
- **Database reset and reseed, with your explicit consent.** While verifying the dashboard, `POST /api/recalculate` was run for real (not in a rolled-back test transaction) against the live `dev.db`, permanently replacing the Milestone 1.3 seed-illustrative values with live engine output — correct, intended behavior for the feature, but it broke 3 backend integration tests that hardcode assertions against the original seed baseline. Restoring it required `prisma migrate reset` (drops and recreates all tables); Prisma's own AI-safety guard required a fresh, explicit "yes" from you before running it, which was obtained. Database re-seeded to the exact original row counts; `npm test` re-verified at 263/263 afterward.

### Files Added
~60 files: `lib/format.ts`, `lib/presentation/{executiveBrief,dashboardData,inventoryData,procurementData,suppliersData,forecastingData,analyticsData,copilotData,constants}.ts`; `components/{badges,kpi-card,page-header,empty-state,filter-select,pagination,page-skeleton}.tsx`; `components/nav/{sidebar,topbar,recalculate-button}.tsx`; `components/{dashboard,inventory,procurement,suppliers,forecasting,analytics,copilot}/*.tsx` (charts, tables, cards, explorers); `app/api/{recalculate,products,warehouses,dashboard,inventory,procurement,suppliers,forecasting,analytics,copilot}/**/route.ts`; `app/{inventory,procurement,suppliers,forecasting,analytics,copilot}/page.tsx` (+ `[productId]`/`[supplierId]` detail pages) and matching `loading.tsx`; `app/error.tsx`, `app/not-found.tsx`; 13 shadcn `components/ui/*.tsx` primitives.

### Files Modified
`app/page.tsx` (now the Executive Dashboard, replacing the `create-next-app` starter); `app/layout.tsx` (sidebar/topbar shell); `.claude/launch.json` (dev server preview config); `lib/domain/recommendations/{criticalInventory,overstockedInventory}.ts` (rounding fix, see above); `package.json`/`package-lock.json` (shadcn deps: radix primitives, etc.).

### Database Changes
None to the schema. `prisma/dev.db` was reset and reseeded once during verification (see above) — ends at the identical Milestone 1.3 baseline row counts (4/20/203/812/15,834/145/286/152/4,872/13).

### Validation Performed
Every page hit in a real browser against live data (not just typecheck): Executive Dashboard, Inventory (list + detail + filters + pagination), Procurement (tabs, PO drawer, EOQ table), Suppliers (list + detail, including a live-vs-persisted reliability score discrepancy correctly explained by insufficient price-observation data, not a bug), Demand Forecasting (product picker re-fetch), Analytics (ABC ranking cross-checked against the #1 usage-value product already verified in the Analytics Engine milestone), Operations Copilot (Accept/Dismiss round-trip confirmed against real DB state and reverted; AI Insight toggle; batch narrate correctly reporting "unavailable" with no `ANTHROPIC_API_KEY` configured). `POST /api/recalculate` run for real end-to-end (1.4s, all 5 stages). `npm run typecheck`/`npm run lint` clean throughout. Full backend suite (263/263) re-verified green after the reseed.

### Lessons Learned
A bug can survive months of rigorous unit/integration testing if every test only ever asserts on fragments (`toContain(...)`, substring matches) and nothing ever renders the *whole* output where a human would actually see it. The unrounded `reorderPoint` in two justification strings passed 263 backend tests cleanly — it only surfaced once real rule-engine output hit an actual browser screen for the first time in this project's history. Browser verification isn't just for catching frontend bugs; it can be the first time backend output is looked at *as text a user reads*, not as a data structure a test asserts against.

---

## Current Project Status

### Completed Modules
- ✅ Phase 0 — Documentation (`PROJECT_PLAN.md`, `PRODUCT_REQUIREMENTS_DOCUMENT.md`, `SYSTEM_ARCHITECTURE.md`, `DEVELOPMENT_ROADMAP.md`)
- ✅ Milestone 1.1 — Project Foundation (Next.js 14 + TypeScript + Tailwind + shadcn/ui + Prisma scaffold)
- ✅ Milestone 1.2 — Database Schema & Migration (10 tables, 9 enums, applied migration; **schema now frozen**)
- ✅ Milestone 1.3 — Synthetic FMCG Dataset (full NovaFoods dataset + 10 business scenarios, seeded and validated)
- ✅ Milestone 1.3 Documentation — `DATA_DICTIONARY.md`
- ✅ `OPERATIONS_ENGINE_SPEC.md` — every OM calculation defined before implementation
- ✅ Milestones 2.0–2.6 — Inventory Engine and Procurement Engine, each pure functions + composition layer + thin orchestrator, fully tested
- ✅ Domain layer folder-consistency refactor
- ✅ Milestone 2.7 — Forecast Engine (Moving Average, Exponential Smoothing, Forecast Accuracy/MAPE)
- ✅ Analytics Engine — complete: ABC Analysis, Inventory Turnover, Warehouse Utilization, Operations Health Score
- ✅ Operations Copilot — complete: Recommendation Rule Engine, Persistence Orchestrator, Claude AI Narrative Integration. **263 backend tests passing.**
- ✅ **Presentation Layer — complete**: all 7 modules, consolidated API routes, single global recalculation endpoint, Executive Brief, Recommendation + AI narrative panels, loading/error states. Verified end-to-end in a real browser against live data.

### In Progress
- Nothing currently in progress. The backend (all 5 engines + Operations Copilot) and the full Presentation Layer are both complete and independently verified.

### Upcoming Milestones
Per the approved plan:
1. **Polish & Deployment** — responsive/accessibility pass, README, optional hosted demo (not yet scoped)

---

## Next Planned Milestone

### Polish & Deployment

Every engine and every page of the presentation layer are complete, tested, and verified against live data. The remaining work is a polish pass: responsive/accessibility review, a project README, and optionally preparing the app for a hosted demo. Not yet scoped in detail; to be proposed before implementation begins, per the established one-milestone-at-a-time approval flow.
