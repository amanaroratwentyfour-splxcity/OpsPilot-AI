# OpsPilot AI — Product Requirements Document (PRD)

**Status:** Draft for approval (v2 — simplified academic scope)
**Last updated:** 2026-08-02
**Related:** [PROJECT_PLAN.md](./PROJECT_PLAN.md) · [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) · [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)

---

## 1. Product Overview

OpsPilot AI is a single-company web application that gives an FMCG operations team a unified, AI-assisted decision hub across inventory, procurement, suppliers, and demand planning. It computes standard Operations Management metrics from operational data and uses an LLM to translate those metrics into ranked, explainable, actionable recommendations — and to answer natural-language questions grounded in that same data.

**Core differentiator:** OpsPilot AI answers *"What should I do today, and why?"* using transparent, textbook-correct OM math, narrated by AI — not a black box.

**Scope note:** This is a single-tenant academic demo for one fictional FMCG company. There is no multi-org support, no billing, and no server-enforced access control. See [PROJECT_PLAN.md §7](./PROJECT_PLAN.md#7-explicitly-out-of-scope) for the full exclusion list.

---

## 2. The Fictional Company

To ground the demo, OpsPilot AI is built around one fictional FMCG company:

> **NovaFoods FMCG** — a mid-sized packaged food & household goods company operating **4 warehouses** across different regions, a catalog of **~150–250 SKUs** across categories (Beverages, Snacks, Personal Care, Household Staples), and a network of **~15–25 suppliers** of varying reliability. NovaFoods has 18 months of historical demand data with realistic seasonality (e.g., beverage demand spikes in summer months) and noise, used to drive forecasting and recommendation demos.

All seed/demo data in the application represents NovaFoods. This single, consistent dataset is what every module, chart, and AI recommendation is built and demoed against.

---

## 3. Design Personas (Non-Enforced)

Personas shape the information architecture and which KPIs surface prominently in each module. They are **not** backed by real authentication or authorization — the demo includes a lightweight, cosmetic persona switcher so a presenter can reframe the same data through different lenses.

- **Operations Manager** — cross-functional view: what's at risk, where cost/service is slipping.
- **Inventory Manager** — SKU-level stock health, safety stock, reorder timing.
- **Procurement Manager** — what to order, how much (EOQ), from whom.
- **Warehouse / Supply Chain lens** — capacity and network-level view, folded into Analytics rather than a standalone module (see §4.6).

---

## 4. Core Modules & Functional Requirements

### 4.1 Executive Dashboard
- FR-1.1: Show company-wide KPI tiles: overall service level, inventory turnover, average supplier reliability, total open PO value, count of SKUs in Critical/Low stock status.
- FR-1.2: Show a top-N "Needs Attention" list — the highest-severity items from the Operations Copilot recommendation feed (FR-7.x), each with a one-line reason.
- FR-1.3: Show a trend sparkline for the last 90 days for 2–3 headline KPIs (e.g., service level, turnover).
- FR-1.4: Cosmetic persona switcher re-orders/re-weights which KPIs and recommendations are emphasized (no data is hidden or restricted — this is a presentation lens, not access control).

### 4.2 Inventory Intelligence
- FR-2.1: Maintain a SKU catalog: code, name, category, unit of measure, unit cost, unit price, shelf-life/perishability flag, lead time (days).
- FR-2.2: Track current on-hand stock per SKU per warehouse.
- FR-2.3: Record stock movements (receipts, issues, adjustments, transfers) with timestamp and reason code — sufficient to drive realistic historical charts, not a full WMS.
- FR-2.4: Compute and display, per SKU (aggregated or per warehouse): **Safety Stock**, **Reorder Point (ROP)**, **Days of Supply**, **Stock Status** (Healthy / Low / Critical / Overstocked).
- FR-2.5: Support **ABC classification** of SKUs by revenue/usage contribution, with a filterable list view (filter by category, status, ABC class).
- FR-2.6: Per-SKU detail view with historical stock trend chart and the calculation inputs/outputs shown transparently (e.g., "Safety Stock = 1.65 × σ(120) × √7 = 210 units").

### 4.3 Procurement
- FR-3.1: Create, view, and update Purchase Orders (PO): SKU(s), quantity, supplier, unit cost, expected delivery date, status (Draft, Submitted, Approved, In Transit, Received, Cancelled).
- FR-3.2: Auto-calculate and pre-fill **Economic Order Quantity (EOQ)** per SKU when creating a PO, shown alongside the formula inputs.
- FR-3.3: Auto-generate a **replenishment suggestions** list: SKUs at or below ROP, with suggested order quantity (EOQ) and suggested supplier (based on reliability score and cost) — one click creates a draft PO from a suggestion.
- FR-3.4: Simple PO status workflow (no approval-chain RBAC — any user can transition status in this demo).
- FR-3.5: PO history list, linkable back to the SKU and supplier detail views.

### 4.4 Suppliers
- FR-4.1: Maintain supplier profiles: name, contact info, SKUs supplied, contracted lead time, payment terms.
- FR-4.2: Calculate a **Supplier Reliability Score** from historical performance: on-time delivery rate, order accuracy, average lead time variance, price stability.
- FR-4.3: Supplier scorecard view: score trend over time, comparison against other suppliers for the same SKU/category.
- FR-4.4: Flag high-risk suppliers (score below threshold, or sole supplier for a critical/A-class SKU) — feeds into the Operations Copilot recommendation feed.

### 4.5 Demand Forecasting
- FR-5.1: Store historical demand (time series) per SKU, derived from the NovaFoods seed dataset.
- FR-5.2: Generate forecasts using explainable statistical methods: **Simple/Weighted Moving Average** and **Exponential Smoothing**, with the better-fitting method auto-selected per SKU based on backtest error.
- FR-5.3: Forecast vs. actual chart with a configurable horizon (e.g., next 4/8/12 weeks) and a visible confidence/error band.
- FR-5.4: Forecast output feeds Safety Stock and ROP calculations in Inventory Intelligence (demand variability drives safety stock sizing).
- FR-5.5: Display forecast accuracy (MAPE, MAE) per SKU.

### 4.6 Analytics
- FR-6.1: Cross-module historical trend views: inventory turnover over time, service level over time, warehouse utilization by location, cost of goods vs. demand.
- FR-6.2: Supplier network view: reliability distribution across all suppliers, concentration risk (SKUs with a single supplier).
- FR-6.3: Warehouse capacity/utilization view (folded in here rather than as a standalone module): utilization % per warehouse, incoming PO load per warehouse.
- FR-6.4: CSV export of underlying tables (inventory, POs, suppliers, forecasts) for anyone wanting to inspect the raw numbers behind a chart.

### 4.7 Operations Copilot (AI)
- FR-7.1: Generate a prioritized **recommendation feed**: each item is produced by the deterministic rule engine (e.g., "SKU-1042 will breach safety stock in 3 days — reorder now"; "Supplier X reliability dropped below 80% — consider the alternate supplier for SKU-2031") and then narrated in natural language by Claude.
- FR-7.2: Every recommendation displays its underlying metric/formula inline (explainability — no unexplained AI output), and links to the relevant module (Inventory / Procurement / Supplier).
- FR-7.3: Recommendations are deterministic-first: the OM calculation engine produces the candidate list and ranking; Claude generates explanation and next-step phrasing only — it never computes or alters a number.
- FR-7.4: Users can Accept, Dismiss, or Snooze a recommendation (session-level state is enough; persistence is a nice-to-have, not required).
- FR-7.5: **Grounded chat interface**: users can ask free-text questions (e.g., "Which SKUs are most at risk of stockout this month?", "Why is Supplier B flagged?"). The backend retrieves the relevant precomputed metrics for the question's scope and passes them to Claude as context — Claude answers from that data, not from general knowledge, and cites the specific numbers used.
- FR-7.6: If the Claude API call fails, the structured recommendation/metric is still shown without the AI narrative (graceful degradation, not a hard failure).

---

## 5. Core OM Calculations (Reference Formulas)

Unchanged from v1 — these are the deterministic formulas the platform implements and exposes transparently. All AI recommendations and Copilot answers must be traceable to these outputs.

| Metric | Formula | Notes |
|---|---|---|
| **Safety Stock** | `SS = Z × σ_d × √(L)` | Z = service-level factor (e.g., 1.65 for 95%), σ_d = std. dev. of demand, L = lead time (same time unit as σ_d) |
| **Reorder Point (ROP)** | `ROP = (Average Daily Demand × Lead Time) + Safety Stock` | Triggers a replenishment suggestion when on-hand stock ≤ ROP |
| **Economic Order Quantity (EOQ)** | `EOQ = √((2 × D × S) / H)` | D = annual demand, S = ordering cost per order, H = annual holding cost per unit |
| **Days of Supply** | `DoS = On-Hand Stock / Average Daily Demand` | Used for stock status classification |
| **Inventory Turnover** | `Turnover = COGS / Average Inventory Value` | Executive Dashboard / Analytics KPI |
| **Supplier Reliability Score** | Weighted composite of: On-Time Delivery %, Order Accuracy %, Lead Time Variance (inverse), Price Stability (inverse of variance) | Default equal-weighted; weights are a visible, adjustable config |
| **Forecast Accuracy** | `MAPE = (1/n) × Σ(\|Actual - Forecast\| / Actual) × 100` | Displayed per SKU forecast |
| **ABC Classification** | Cumulative % of annual usage value; A = top 80%, B = next 15%, C = remaining 5% | Standard Pareto-based classification |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Dashboard and module views load in < 2s against the NovaFoods seed dataset (~200 SKUs × 4 warehouses × 18 months history) on a typical laptop or free-tier hosting. |
| **Usability** | Responsive, desktop-first UI, tablet-friendly; a first-time viewer should understand each module within a minute without a walkthrough. |
| **Explainability** | No AI-generated recommendation or Copilot answer may be shown without a linked, human-readable metric/formula justification. |
| **Maintainability** | Domain calculation logic is isolated from the UI/API layer and independently unit-tested — a single student must be able to reason about and modify it in isolation. |
| **Data integrity** | Calculations are unit-tested against hand-computed reference values for at least one SKU/supplier so correctness is verifiable, not just plausible-looking. |
| **Data portability** | CSV export supported for core entities (inventory, POs, suppliers, forecasts) from the Analytics module. |

Production-grade non-functional concerns (multi-tenant data isolation, audit trails, uptime SLAs, rate limiting, formal security hardening) are explicitly **not** requirements for this project — see [PROJECT_PLAN.md §7](./PROJECT_PLAN.md#7-explicitly-out-of-scope).

---

## 7. Out of Scope

- Multi-tenancy, organizations, or more than one fictional company.
- Subscription plans, billing, or any pricing model/UI.
- Real user accounts: signup, invites, password reset, server-enforced roles/permissions.
- Audit logging of user actions.
- Live payment processing.
- Real-time IoT/RFID/barcode hardware integration.
- Native iOS/Android apps.
- Direct ERP/WMS system integrations (SAP, Oracle).
- Multi-language/localization support.
- Advanced ML forecasting (deep learning/transformer-based) — statistical methods only.
- Supplier-facing or customer-facing portals.
- Automated PO transmission (EDI) to suppliers.
- Standalone Warehouse module (folded into Analytics as a capacity/utilization view, since it does not warrant a full module at this scope).

---

## 8. Acceptance Criteria Summary

A feature is considered complete when:
1. It matches the functional requirement(s) above.
2. Any metric shown is computed via the documented formula (§5) and unit-tested against at least one hand-verified reference value.
3. It renders correctly and responsively against the NovaFoods seed dataset.
4. If AI-assisted, the recommendation or Copilot answer displays its underlying metric/justification inline and degrades gracefully if the Claude API is unavailable.
