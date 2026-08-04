# OpsPilot AI — UX Audit

**Status:** Read-only audit of the implemented application at its current stable functional baseline. No code was changed to produce this document.
**Last updated:** 2026-08-04
**Related:** [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) · [PROJECT_SHOWCASE.md](./PROJECT_SHOWCASE.md)

---

## Purpose and method

This document is a structured usability audit of all eight pages in OpsPilot AI, intended as the roadmap for a future UI redesign. It reports only objective issues — broken interactions, confusing workflows, misleading copy, accessibility gaps, inconsistent component behavior, and similar defects — not stylistic preferences.

Every issue below was verified directly in the running application (desktop viewport 1280×800 and mobile viewport 375×812) and cross-checked against the relevant source file before being recorded. Chart-rendering issues in particular were held to a stricter bar: a chart is only reported as broken if it stayed broken after a reload, a window resize, and a delayed re-screenshot, **and** its DOM geometry (element counts, real pixel dimensions, path data) contradicted the actual API data. Several apparent chart bugs during this audit turned out to be first-paint timing artifacts that self-corrected within 1–2 seconds; those are explicitly not included below.

**Severity scale:**
- **Critical** — blocks a core workflow, or a screen renders incorrectly with no workaround
- **High** — significantly degrades usability or trust, workaround exists but isn't obvious
- **Medium** — a real defect a user will notice and be annoyed by, but doesn't block the task
- **Low** — minor polish issue

---

## Cross-cutting issues

These issues recur across multiple pages and are stated once here rather than repeated per page. Page sections below reference back to this list by name.

### [X1] No mobile navigation — Critical
`components/nav/sidebar.tsx` renders `<aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:flex md:flex-col">`. Below the Tailwind `md` breakpoint the entire sidebar disappears and **no alternative navigation is provided** — no hamburger menu, no bottom tab bar, no drawer. On a phone-width viewport (375px, tested), a user who lands on any page other than the dashboard has no way to reach any other page except by editing the URL directly. This affects every page in the app.

### [X2] Charts have no accessible text alternative — Medium
Every Recharts pie/bar/line chart in the app (dashboard stock-status and warehouse-utilization charts, inventory category chart, analytics pareto/warehouse charts, supplier reliability chart, forecasting demand chart) renders as pure SVG with no `aria-label`, `role="img"`, or adjacent data table. Screen reader users get no information from these charts at all. Threshold/reference lines (e.g. the reorder-point line on stock charts) are also unlabeled — a sighted user has to infer what the line means from context.

### [X3] Inconsistent row-click accessibility pattern — Medium
The same "click a table row to open detail" interaction is implemented two different ways in the app:
- **Suppliers** (`app/suppliers/page.tsx`) and **Inventory** wrap the row content in a real `<Link href=…>`, which exposes a proper accessible link role, works with keyboard Tab/Enter, and supports right-click/"open in new tab."
- **Procurement** (`components/procurement/purchase-order-table.tsx`) uses a plain `<TableRow onClick={...} className="cursor-pointer">` with no `role`, no `tabIndex`, and no keyboard handler. `read_page`'s accessibility tree confirms this row exposes **zero** interactive roles — it is invisible to keyboard and screen-reader users, and middle-click/"open in new tab" doesn't work either.

Same interaction, two different implementations, one of them inaccessible. This should be a single shared component.

### [X4] No table sorting or column control anywhere — Medium
No table in the app (Inventory, Procurement, Suppliers, Analytics ABC classification, Copilot) supports clicking a column header to sort. Where a table also has no pagination (see X5), this compounds into a real usability problem on large datasets.

### [X5] Large tables are hard-capped with no way to see the rest — High
The Analytics "ABC Pareto" table caps at "Showing top 50 of 203 products" with no pagination, no "load more," and no filter — the remaining 153 products (including everything classified B or C) are simply unreachable from the UI. This is the clearest instance of a pattern worth checking against other list views as the redesign proceeds.

---

## Executive Dashboard

| # | Issue | Severity |
|---|---|---|
| D1 | See [X1] (no mobile nav), [X2] (charts have no accessible text) | Critical / Medium |
| D2 | The page's only real `<h1>` (in `components/nav/topbar.tsx`) is static text — `"Operations Decision Hub"` — identical on every single page in the app, regardless of which module is open. The actual page title (e.g. "Executive Dashboard") only exists as an `<h2>` further down via `components/page-header.tsx`. This is misleading for screen-reader users who rely on the `<h1>` to know what page they're on, and it means the browser/tab title context and the visible heading hierarchy don't agree on what the "main" heading is. | Medium |
| D3 | `components/dashboard/recommendation-widget.tsx` truncates recommendation justification text with `line-clamp-2` and truncates the related entity name, with no expand/"read more" affordance and no tooltip — a long justification is simply cut off with no way to read the rest without navigating to Operations Copilot. | Medium |
| D4 | Reference/threshold lines on the stock-status and warehouse-utilization charts (`components/dashboard/stock-status-chart.tsx`, `warehouse-utilization-chart.tsx`) render with no label, so a user has to guess what the line represents. | Low |

---

## Inventory Intelligence

| # | Issue | Severity |
|---|---|---|
| I1 | **Confirmed persistent chart bug**: the "Stock Status" pie chart on the Inventory page renders with zero real pie sectors. The only `svg.recharts-surface` element on the page matched a 14×14px legend icon, not the chart itself. This survived a hard reload and a window resize — it is not a timing artifact. | Critical |
| I2 | **Confirmed persistent chart bug**: the "Positions by Category" bar chart (`components/inventory/category-chart.tsx`) renders bars at the wrong scale. DOM inspection measured a bar height of 18.8px for BAKERY where the real proportional height (cross-checked against `/api/inventory`'s `categoryBreakdown`, BAKERY=108 of a 124 max) should be roughly 139px. Every category bar is compressed the same way. | Critical |
| I3 | See [X1], [X2] | Critical / Medium |

*Note:* `ScoreBadge` (`components/badges.tsx`) was suspected of a color-coding bug (an all-red column in a critical-sorted view) but was verified correct — it does vary green/amber/red by threshold (≥80/≥60/<60); the rows in question were legitimately all low-scoring. Not a defect. The demand-history area chart on product detail pages was also initially suspected broken from a single screenshot but was confirmed correctly rendered (full-width 6,161-character SVG path) on re-inspection — also not a defect.

---

## Procurement

| # | Issue | Severity |
|---|---|---|
| P1 | **No way to create a purchase order anywhere in the application.** Confirmed by exhaustive search (`grep` for `Create.*Order`/`New Purchase Order`/`CreatePO` and `find` for any `purchase*` route under `app/api`) — both return zero results. The "EOQ Suggestions" table (`components/procurement/eoq-table.tsx`) computes an economic order quantity per product but has no action button, CTA, or any way to act on the suggestion. The feature is informational-only with no next step, which undercuts its purpose as a *decision support* tool. | Critical |
| P2 | See [X3] — Procurement's row-click pattern is the inaccessible one. | Medium |
| P3 | The purchase-order detail Sheet (drawer) shows the warehouse's **full name**, while the table row it was opened from shows an **abbreviated** warehouse name. Same entity, two different name presentations, no visible reason why. | Low |

---

## Suppliers

| # | Issue | Severity |
|---|---|---|
| S1 | The "Reliability" chart (`components/suppliers/reliability-chart.tsx`) truncates supplier names via `name.split(" ").slice(0, 2).join(" ")`. For a name like "Clean & Bright Industries" this produces "Clean &" as the axis label — it looks like a rendering glitch or cut-off text, not an intentional abbreviation. The full name is available elsewhere on the same page (the supplier table), so the truncation isn't necessary for space reasons alone; it needs a smarter truncation rule (e.g. ellipsis + full name in a tooltip) rather than a fixed word count. | Medium |
| S2 | By contrast, `app/suppliers/page.tsx` correctly uses `<Link href="/suppliers/{id}">` for the row-click pattern — this is the accessible reference implementation Procurement (P2) should be brought in line with. | — (positive finding, referenced by X3) |

---

## Demand Forecasting

| # | Issue | Severity |
|---|---|---|
| F1 | The product picker in `components/forecasting/forecasting-explorer.tsx` is a plain shadcn `<Select>` listing all 203 products with no search or type-ahead. Finding a specific product means scrolling a 203-item dropdown by eye. | High |

---

## Analytics

| # | Issue | Severity |
|---|---|---|
| A1 | **Confirmed persistent chart bug, root-caused**: the Y-axis labels on the "ABC Pareto Curve" chart (`components/analytics/pareto-chart.tsx`) render as "00000" repeated instead of real currency values. Root cause: `margin={{ top: 8, right: 8, left: -16, bottom: 0 }}` on the `ComposedChart` — the `-16` left margin was evidently copied from another chart in the app whose axis labels are short percentages; this chart's `Usage Value` labels are 7-digit currency figures, and the negative margin clips their leading digits against the card edge. Did not resolve after a wait (unlike a neighboring chart on the same page, confirmed a timing artifact and excluded below). | Critical |
| A2 | The ABC classification table has no sorting, no filtering, and hard-caps at "top 50 of 203 products" with no pagination — see [X5]. Because the top 50 by usage value happen to be dominated by a couple of categories, there is **no way to view a single Class B or Class C product** from this table at all. | High |
| A3 | See [X4] (no column sorting) | Medium |

*Note:* The "Warehouse Utilization" bar chart on this page initially appeared broken (flat/near-zero bars) but self-corrected within 2–3 seconds on re-screenshot — confirmed a rendering-timing artifact, not a defect, and excluded from the findings above.

---

## Operations Copilot

| # | Issue | Severity |
|---|---|---|
| C1 | **Snooze is effectively a one-way action with no way to revisit it.** The page (`app/copilot/page.tsx`) only ever fetches `status: ACTIVE` items — there is no status filter control in the UI (only Severity and Category dropdowns), even though the underlying data layer (`getCopilotOverview`) fully supports filtering by status. Snoozing a recommendation implies "remind me about this later," but there is no due date captured, no scheduled resurfacing, and no page or view anywhere in the app to browse Snoozed items and bring one back to Active. Functionally, Snooze, Dismiss, and Accept all behave identically from the user's vantage point: the card disappears from the list permanently. | High |
| C2 | The KPI cards (Active Recommendations, Critical, Accepted, AI-Narrated Coverage) are static display-only — none are clickable, so "Accepted: 1" gives no way to see *which* recommendation was accepted. | Medium |
| C3 | The empty state shown when a filter combination matches nothing (`components/empty-state.tsx` via `CopilotExplorer`) has only a title ("No recommendations match these filters") and no description or "Clear filters" action, even though the component supports an optional description. A user has to manually reset both dropdowns. | Low |

*Note:* mobile layout for this page (375px) was checked and holds up well — KPI cards stack cleanly and the Accept/Snooze/Dismiss button row does not overflow or overlap.

---

## Import Center

| # | Issue | Severity |
|---|---|---|
| M1 | The "Import Data" action — which **replaces the entire dataset** — is gated only by a native browser `window.confirm()` dialog reading "This will replace the current dataset with the uploaded workbook. Continue?" (`components/import-center/upload-panel.tsx`). This is the single most destructive, most irreversible action anywhere in the app, yet it's the only confirmation in the entire product that isn't a styled in-app dialog — it looks and behaves differently from everything else, doesn't mention that the action is irreversible, and offers no secondary safeguard (e.g. typing a confirmation phrase, or a link to export/back up the current dataset first). | High |
| M2 | When validation returns blocking errors, the "Import Data" button is correctly hidden, but no message explains *why* it's gone or what to do next (e.g. "Fix the errors above and re-upload"). A first-time user has to infer the connection between the error table and the missing button themselves. | Medium |
| M3 | After a successful import, the entire upload UI is replaced by the success summary with a single "View Dashboard" button — there is no "Import another file" action. Importing a second workbook requires navigating away from Import Center and back. | Low |
| M4 | **Confirmed mobile bug**: at 375px width, the "OpsPilot_Template.xlsx downloaded" success message is clipped and runs off the edge of its card. Root cause confirmed in source: the container in `components/import-center/download-template-button.tsx` is `<div className="flex items-center gap-3">` with no `flex-wrap`, so the status message is forced onto the same line as the button instead of wrapping below it. | Medium |

---

## Summary table

| Severity | Count | Items |
|---|---|---|
| Critical | 5 | X1, I1, I2, P1, A1 |
| High | 5 | X5, F1, C1, M1, A2 |
| Medium | 10 | X2, X3, X4, D2, D3, I3(a11y), P2, S1, C2, M2, M4, A3 |
| Low | 4 | D4, P3, C3, M3 |

*(X2–X4 are counted once each as cross-cutting; page-level rows that merely reference them are not double-counted.)*

## Suggested priority order for a redesign

1. **X1 (mobile nav)** and **I1/I2 (Inventory charts)** — these break entire surfaces of the app outright and should be fixed before any visual redesign work, since redesigning a broken chart is wasted effort.
2. **P1 (no PO creation)** and **C1 (Snooze has no way back)** — both are workflow dead-ends in the app's two most "operational" modules; closing them is a functionality gap as much as a UX one.
3. **A1 (Pareto axis) and M1 (destructive-action confirm)** — both are small, precisely scoped fixes (one CSS margin, one dialog component swap) with outsized trust impact.
4. Everything else in the Medium/Low tiers is genuine polish work suited to a systematic redesign pass rather than a point fix.
