# OpsPilot AI — Design Specification (v2.0)

**Status:** Approved for planning — single source of truth for the v2.0 redesign. Supersedes no prior document; the app currently implements none of this.
**Audience:** anyone designing or implementing a UI change to OpsPilot AI from this point forward.
**Last updated:** 2026-08-04
**Related:** [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) · [UX_AUDIT.md](UX_AUDIT.md) · [DATA_IMPORT_ARCHITECTURE.md](DATA_IMPORT_ARCHITECTURE.md) · [PRODUCT_REQUIREMENTS_DOCUMENT.md](PRODUCT_REQUIREMENTS_DOCUMENT.md)

**This document contains no code and describes no implementation.** It is a design decision record — every visual, interaction, and content rule the v2.0 redesign must follow — written before a single component is touched, matching the discipline [OPERATIONS_ENGINE_SPEC.md](OPERATIONS_ENGINE_SPEC.md) applied to the calculation engines and [DATA_IMPORT_ARCHITECTURE.md](DATA_IMPORT_ARCHITECTURE.md) applied to Import Center. [UX_AUDIT.md](UX_AUDIT.md) is this document's diagnosis; this document is its prescription — every open Medium/Low finding in that audit should trace to a rule below.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Branding](#2-branding)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Layout System](#5-layout-system)
6. [Component Library](#6-component-library)
7. [Intelligence Layer](#7-intelligence-layer)
8. [Executive Dashboard Redesign](#8-executive-dashboard-redesign)
9. [Page-Specific Redesign](#9-page-specific-redesign)
10. [Chart Standards](#10-chart-standards)
11. [Animation Guidelines](#11-animation-guidelines)
12. [Dynamic Company Support](#12-dynamic-company-support)
13. [Design Principles](#13-design-principles)

---

## 1. Design Philosophy

OpsPilot AI is an operations decision-support tool, not a consumer dashboard. Every design decision below is filtered through five commitments:

### 1.1 Enterprise-first

The audience is an operations manager, a supply chain analyst, or an executive under time pressure — not someone browsing for delight. Enterprise-first means:

- Density and precision are respected, not "simplified away." A table of 200 SKUs is a legitimate screen, not a failure to summarize.
- No illustration-heavy empty states, no marketing-site animation, no playful copy ("Oops! Nothing here 🎉"). Empty states state the fact and the next action, plainly.
- Numbers are exact where exactness matters (currency, quantities) and rounded only where a decision doesn't depend on the third digit (percentages in a KPI headline).
- The product looks and behaves like something a company would trust with real inventory and financial data on day one — this is the same bar [SYSTEM_ARCHITECTURE.md §1](SYSTEM_ARCHITECTURE.md) already set for the backend ("boring, explainable technology"); v2.0 extends it to the interface.

### 1.2 AI-native

AI is not a chatbot bolted onto a traditional dashboard — it is a layer woven through every metric, chart, and recommendation, but it is never the *only* source of an answer. This carries forward the product's foundational rule (numbers come from code, narrative comes from AI): the redesign's job is to make that split *visible* to the user, not to blur it. Section 7 (Intelligence Layer) is the mechanism; every other section defers to it.

### 1.3 Minimal but premium

Minimal does not mean sparse — it means every pixel on screen is either data, an explanation of data, or an action on data. There is no decorative chrome. "Premium" is achieved through restraint and craft (a disciplined type scale, one accent color used sparingly, consistent 8px spacing, real elevation on cards) rather than through visual richness (gradients, illustration, heavy shadows, multiple accent colors competing for attention).

### 1.4 Information-dense without overwhelming

Density and overwhelm are not the same failure. The redesign manages the difference with **progressive disclosure**: every surface shows a headline value by default (dense, scannable, decision-ready) and tucks the supporting detail — formula, trend history, AI narrative, raw data — behind a deliberate, consistent affordance (an info icon, an expand row, a "Show AI Insight" toggle — patterns already proven in v1's Copilot page and formalized in Section 7). A user should never have to scroll past explanation to find data, and never have to leave the page to find explanation.

### 1.5 The three questions

Every page, and ideally every major section within a page, should let the user answer three questions without leaving it:

| Question | Answered by |
|---|---|
| **What is happening?** | KPIs and charts — the current state, in numbers |
| **Why is it happening?** | Chart insights, KPI "how calculated" explanations, trend context |
| **What should I do next?** | Recommendations, Operational Brief action items, drill-down links |

This is the acceptance test for every future screen: if a reviewer can't point to the region of the page answering each question in under five seconds, the page isn't done.

---

## 2. Branding

### 2.1 Product identity vs. company identity

Two identities exist on every screen and must never be confused:

- **Product identity — "OpsPilot AI."** Permanent. The tool's name, logo, and favicon never change, regardless of whose data is loaded. This is what a user bookmarks, screenshots, and refers to in conversation.
- **Company identity — the imported company.** Dynamic. Currently hardcoded to "NovaFoods Pvt. Ltd." throughout the app (sidebar footer, topbar subtitle, page copy, table drill-downs — see Section 12 for the full inventory). v2.0 removes NovaFoods as a *permanent* fixture and replaces it with a **Company Identity** slot: a short display name (and optionally an initials-derived mark, since no logo upload exists) sourced from the currently loaded dataset, with "NovaFoods Pvt. Ltd." simply becoming the *value* of that slot when the demo dataset is loaded — not a special case in the code or the design.

The rule of thumb: **"OpsPilot AI" answers "what tool is this," the Company Identity slot answers "whose data am I looking at."** Every surface that currently says "NovaFoods" should be re-read as "the Company Identity slot, currently showing NovaFoods."

### 2.2 Logo placement

| Location | Treatment |
|---|---|
| Sidebar header | Full lockup: mark + "OpsPilot AI" wordmark, left-aligned, fixed — never replaced by the company's identity |
| Sidebar footer | Company Identity slot (name, and once available, a generated initials mark) — this is where "NovaFoods Pvt. Ltd." lives today and continues to live, now sourced dynamically |
| Topbar | No second logo. The topbar carries the Company Identity's descriptive line (see 2.4) and the global actions, not a repeated OpsPilot AI mark |
| Mobile nav drawer | Same lockup as the desktop sidebar header, unchanged |
| Favicon | Mark only, no wordmark (Section 2.5) |
| Splash screen | Mark, centered, larger scale (Section 2.6) |

The mark itself (already in use as a `Sparkles`-derived glyph in the current implementation) is retained as the product's icon through v2.0 — a redesign changes its rendering (weight, color, animation-in) but not its silhouette, so the brand stays recognizable across the transition.

### 2.3 Splash screen concept

A brief, branded loading state shown once per session on cold load (first paint of the app shell before any data-dependent content is ready) — not on every client-side navigation. Content: the OpsPilot AI mark, centered, with a single-line tagline ("Operations Decision Hub" or the currently-loaded Company Identity once resolved), and a minimal progress indicator. Maximum duration is bounded by real data-fetch time, not an artificial delay — see Section 11.1 for timing rules. Never shown mid-session (e.g., between page navigations, or during Recalculate All) — those use inline loading states (Section 6, Section 11.5), not the splash.

### 2.4 Browser title and favicon

- **Title pattern:** `{Company Identity} · OpsPilot AI` (e.g., "NovaFoods Pvt. Ltd. · OpsPilot AI") when a dataset is loaded; `OpsPilot AI — Operations Decision Hub` as the fallback before any import has occurred. The product name is always present and always last, so a user with many browser tabs open can still identify "an OpsPilot AI tab" at a glance while distinguishing *which* company's instance it is.
- **Favicon:** the OpsPilot AI mark only, static, identical regardless of loaded company. The favicon is a product-identity anchor, not a company-identity surface — it must not change on import, or a user's pinned tab would visually "become" a different icon after every dataset swap.

---

## 3. Color System

### 3.1 Dark mode is the primary experience

v2.0 ships dark as the default and primary-designed theme; light mode is a supported, fully-specified alternate, not an afterthought. Every token below is specified for both, and every future component must be designed against the dark values first. Rationale: this is an ops-monitoring tool plausibly left open on a secondary display or checked in a warehouse/low-light setting, and dark surfaces let semantic status colors (critical red, warning amber) carry more visual weight than they can against a white background — which directly serves the "what should I do next" question in Section 1.5.

### 3.2 Core tokens

All values below are specified as HSL, matching the CSS custom-property convention already established in the codebase's `globals.css` (`--token: H S% L%`), so implementation is a value swap, not a system change.

| Token | Role | Light | Dark |
|---|---|---|---|
| `background` | App canvas | `0 0% 100%` | `222 47% 6%` |
| `surface` | Sidebar / topbar fill, one step off canvas | `210 20% 98%` | `222 42% 9%` |
| `card` | Card / panel fill | `0 0% 100%` | `222 40% 11%` |
| `card-elevated` | Modals, popovers, dropdown content | `0 0% 100%` | `222 38% 14%` |
| `border` | Default hairline | `214 20% 91%` | `217 25% 20%` |
| `border-strong` | Emphasized divider (table header rule, active tab underline) | `214 20% 80%` | `217 25% 30%` |
| `foreground` | Primary text | `222 47% 11%` | `210 20% 96%` |
| `muted-foreground` | Secondary text, labels, helper text | `215 16% 47%` | `215 15% 65%` |
| `primary` | Brand action color (buttons, active nav, links, focus ring) | `221 83% 53%` | `217 91% 65%` |
| `primary-foreground` | Text/icons on `primary` fill | `0 0% 100%` | `222 47% 11%` |
| `secondary` | Low-emphasis fill (secondary buttons, selected-but-inactive states) | `210 20% 95%` | `217 30% 18%` |
| `accent` | Sparing highlight for AI-originated content only (Section 7) — never used for a KPI value or a plain button | `262 83% 58%` | `262 83% 70%` |

**Why indigo-blue as `primary` and violet as `accent`:** the two are visually distinct enough that a user can learn, without reading labels, "blue = the product's own action, violet = something AI generated" — this is the color half of the static-vs-dynamic distinction Section 7.5 requires.

### 3.3 Semantic status colors

These are fixed, non-themeable, and identical in light and dark mode (status meaning must not shift with theme) except for a lightness adjustment so they hold contrast on a dark surface:

| Token | Meaning | Light | Dark | Used for |
|---|---|---|---|---|
| `success` | Healthy, on-target, positive trend | `160 84% 32%` | `160 70% 45%` | Healthy stock badges, on-time delivery, positive KPI deltas |
| `warning` | Needs attention, approaching a threshold | `38 92% 45%` | `38 92% 58%` | Low (not critical) stock, overstock, warning-severity recommendations |
| `critical` | Requires action now | `0 72% 51%` | `0 84% 65%` | Critical stock, overdue POs, critical-severity recommendations |
| `info` | Neutral, factual, deterministic explanation | same as `primary` | same as `primary` | Static KPI info panels, non-alarming callouts |

**Rule:** these four are the *only* colors ever used to convey status. A chart series color, a category tag, or a decorative accent must never coincide with one of these four hues in a context where it could be misread as a status signal (e.g., a chart's fifth categorical color must not be the same red used for "critical").

### 3.4 Chart palette

A fixed, ordered, seven-color categorical palette for anything that isn't a status color (product categories, warehouses, suppliers, forecast method lines):

| Order | Light | Dark | Notes |
|---|---|---|---|
| 1 | `221 83% 53%` | `217 91% 65%` | Same hue as `primary` — the "first/default series" color |
| 2 | `173 58% 39%` | `173 58% 50%` | Teal |
| 3 | `27 87% 55%` | `27 87% 65%` | Amber-orange — visually distinct from `warning` amber by hue |
| 4 | `280 65% 55%` | `280 65% 68%` | Purple — distinct from `accent` violet by hue and only used in charts, never for AI-content chrome |
| 5 | `340 75% 50%` | `340 75% 62%` | Rose |
| 6 | `197 37% 40%` | `197 37% 55%` | Slate-blue |
| 7 | `142 60% 35%` | `142 55% 48%` | Green — distinct from `success` green by saturation, used only for a 7th category, never for status |

Colorblind consideration: the palette alternates hue *and* relative lightness (not just hue) between adjacent entries, so series 1 vs. 2, 3 vs. 4, etc. remain distinguishable under the common deuteranopia/protanopia simulations, and every chart must additionally carry a non-color differentiator (direct labeling, pattern, or legend with icons) per Section 10.5 rather than relying on color alone.

### 3.5 Backgrounds, cards, borders — application

- **Background** is the outermost canvas (`<main>`), one step darker/lighter than `surface`, so the sidebar and topbar read as a distinct structural frame around the content.
- **Cards** sit on `card`, one step up from `background`, with a `border` hairline (never a shadow alone in dark mode — shadows barely register on dark surfaces; the border does the separation work). `card-elevated` is reserved for anything that floats above the page flow (dialogs, popovers, the KPI info panel, dropdown menus) so z-order is reinforced by color, not just by drop shadow.
- **Borders** are deliberately low-contrast (`border`) for internal dividers (table rows, card outlines) and reserved at `border-strong` for structural emphasis (an active tab, a table header's bottom rule) — so the eye is drawn to *meaningful* structure, not every hairline in the layout.

---

## 4. Typography

### 4.1 Font family

Retain the existing **Geist Sans** (UI text) and **Geist Mono** (SKUs, purchase order references, currency-aligned figures, code-like values) variable fonts already loaded via `next/font/local`. Both are already licensed, already loaded with no additional network request, and read as a modern enterprise-SaaS sans — there is no design reason to introduce a second typeface, and doing so would be pure churn against the "minimal but premium" principle (1.3).

### 4.2 Type scale

| Role | Size / Weight | Line height | Example use |
|---|---|---|---|
| KPI Hero | 36px / Semibold (600) | 1.1 | The single large number on a KPI card |
| KPI Secondary | 24px / Semibold | 1.15 | A KPI card's supporting stat (e.g., "82 of 100" split into hero + unit) |
| H1 (page title) | 28px / Bold (700) | 1.2 | `PageHeader` title, one per page |
| H2 (section title) | 18px / Semibold | 1.3 | Card titles ("Positions by Category"), tab labels |
| H3 (subsection) | 15px / Semibold | 1.4 | Table group headers, dialog titles |
| Body | 14px / Regular (400) | 1.5 | Table cells, recommendation justification text, form labels |
| Helper / caption | 12px / Regular | 1.4 | Timestamps, "Showing X–Y of Z," KPI info-panel body text |
| Micro / label | 11px / Medium (500), uppercase, `+0.02em` tracking | 1.3 | Category eyebrows ("INVENTORY"), table column headers |
| Mono | 13px / Regular, `Geist Mono` | 1.4 | SKUs, PO reference numbers, currency figures in tables where column alignment matters |

### 4.3 KPI sizing rules

- The **Hero** size (36px) is reserved exclusively for a KPI card's single most important number — never used for body copy or decorative emphasis elsewhere, so its appearance anywhere on screen unambiguously signals "this is a headline metric."
- A KPI's unit or qualifier ("out of 100," "annualized," "0 below threshold") is always Helper size directly beneath the Hero value, never inline at the same size — this keeps the eye landing on the number first (serving "what is happening" from Section 1.5).
- A KPI's trend delta (once introduced per Section 8.3), if shown, sits beside the Hero value at KPI Secondary size, colored with the semantic tokens from Section 3.3 (green/red), never as its own separate card.

### 4.4 Headings and body

Headings never exceed Semibold (600) except H1, which is the only Bold (700) weight on a page — this keeps a page from having multiple competing "loudest" elements. Body text is always Regular weight; emphasis within body text (e.g., a recommendation's entity name) uses Medium (500), never Bold, to keep the weight hierarchy shallow and calm.

### 4.5 Helper text and metric emphasis

Helper text (timestamps, row counts, KPI qualifiers) is always `muted-foreground`, never full `foreground` — this is the typographic half of progressive disclosure (1.4): a user's eye should land on data first, supporting text second. Metric emphasis inside prose (an AI narrative referencing "397 units on hand") uses `Geist Mono` at the surrounding body size rather than bold, so numbers are scannable within a sentence without shouting.

---

## 5. Layout System

### 5.1 Sidebar

- **Expanded width:** 264px (up slightly from v1's 256px to comfortably fit the Company Identity slot's name + mark in the footer without truncation for most company names).
- **Structure, top to bottom:** OpsPilot AI lockup (fixed) → primary navigation (Section 5.1.1) → Company Identity footer (Section 2.2).
- **Active item:** filled `primary` background, `primary-foreground` text/icon — carried forward unchanged from v1, which already does this correctly.
- **Collapsed state (new in v2.0):** an icon-only rail (72px) toggled from the topbar, for users who want more horizontal room for wide tables — icons only, active state unchanged, company footer collapses to the initials mark only. This is additive to, not a replacement for, the v1 mobile drawer (Section 5.6), which remains the only navigation path below the `md` breakpoint.

#### 5.1.1 Navigation grouping

Eight items today, presented as a flat list. v2.0 introduces light grouping (a Micro-label divider, not a nested tree) once the item count grows past what a flat list can present scannably:

- **Overview:** Executive Dashboard
- **Operations:** Inventory, Procurement, Suppliers, Demand Forecasting
- **Insights:** Analytics, Operations Copilot
- **Data:** Import Center

Grouping is a visual/scan aid only — it introduces no new routes, no new permission model, and no change to any single page's content.

### 5.2 Topbar

Fixed height 64px (unchanged from v1). Left: sidebar-collapse toggle (new) + Company Identity descriptive line (replacing the current static "Operations Decision Hub" `<h1>` — see Section 12.2 for why this specific string must change). Right: global Recalculate All action (unchanged placement), reserved slot for a future notifications/alerts affordance (not built in v2.0, but the layout must not need rework to add it later).

### 5.3 Page spacing

An 8px base unit throughout, matching Tailwind's default scale so the implementation maps directly to utility classes without custom values:

| Context | Spacing |
|---|---|
| Page outer padding | 24px (`p-6`) |
| Section-to-section gap (KPI row → chart row → table) | 24px (`space-y-6`) |
| Card internal padding | 24px header/content, 16px for dense table-containing cards |
| Grid gutter (KPI cards, chart cards) | 16px (`gap-4`) |
| Inline element gap (icon + label, badge + text) | 8px (`gap-2`) |

### 5.4 Cards

- **Radius:** 12px (`rounded-xl`), consistent across KPI cards, chart cards, table containers, and dialogs — one radius value for the whole product.
- **Elevation:** two levels only — resting (`card` fill + `border` hairline, no shadow) and floating (`card-elevated` fill + a soft shadow, used only for dialogs/popovers/dropdowns that must read as "above" the page). No card-hover-lift animation on data cards (KPI cards, chart cards) — they are not clickable surfaces by default, and applying a hover affordance to a non-interactive element misleads the user (violates 1.3's restraint principle).
- **Header/content split:** every card that has a title uses the same two-part structure already established (`CardHeader` title + optional description, `CardContent` body) — this is retained unchanged into v2.0.

### 5.5 Grid system

- **KPI row:** 4 columns desktop (`lg:grid-cols-4`), 2 columns tablet (`sm:grid-cols-2`), 1 column mobile — unchanged from v1, which already gets this right.
- **Chart row:** 2 columns desktop (`lg:grid-cols-2`), 1 column below — unchanged from v1's pattern, but see Section 5.5.1 for the fix this pattern requires.
- **Table/detail sections:** full width, no column split — tables need their own horizontal room and must never share a row with another card.

#### 5.5.1 Chart grid stability requirement (carried forward from a v1 incident)

Two charts mounting simultaneously in the same grid row previously caused a rendering race in the charting library that left both charts blank on first paint (`UX_AUDIT.md` I1/I2, fixed in v1 by disabling chart entry animation). v2.0's animation guidelines (Section 11.4) codify this as a hard constraint — re-enabling chart animation in the redesign is only acceptable alongside a fix that guarantees correct first-paint geometry regardless of how many charts share a grid row, verified the same rigorous way UX_AUDIT.md's methodology required (reload, resize, and DOM-level geometry checks — not a single screenshot).

### 5.6 Mobile behavior

- Below `md`, the sidebar is replaced entirely by the drawer navigation shipped in v1 (`components/nav/mobile-nav.tsx`) — this remains the mobile navigation model for v2.0; the redesign restyles it (Section 3–4 tokens) but does not replace its interaction pattern, which is already correct.
- KPI and chart grids collapse to a single column; tables gain horizontal scroll within their own container (never the page body) rather than compressing columns unreadably.
- Touch targets are a minimum 40px (up from the current default button height of 36px) for any control appearing in a mobile context — the Accept/Snooze/Dismiss row on Copilot cards, filter dropdown triggers, table row taps.
- Dialogs and sheets go full-width below `sm`, retaining the same content structure as desktop (no content is dropped on mobile, only re-flowed).

---

## 6. Component Library

Each entry below specifies visual style and the state set every implementation must cover — density is called out per component to serve Section 1.4.

### 6.1 KPI Cards

**Style:** `card` fill, `border` hairline, 24px padding, radius per 5.4. Layout: label (Micro/uppercase, `muted-foreground`) + icon top row → Hero value → Helper qualifier → (new) inline info affordance (Section 7.1) in the label row, right-aligned. Tone variants (`neutral`/`warning`/`critical`, already established in v1's `KpiCard`) color the Hero value and a subtle left-edge 3px accent bar using Section 3.3 tokens — not the whole card fill, which would be too loud for a data-dense row of four.
**States:** default, tone-colored (warning/critical), loading (skeleton, Section 11.5), and — new in v2.0 — an expanded state when the info affordance is active, which does not resize the card but opens a `card-elevated` popover anchored to it.

### 6.2 Tables

**Style:** no card-internal border around the table itself (the containing card's border is sufficient); header row in Micro/uppercase label style with a `border-strong` bottom rule; body rows separated by `border` hairlines only, no zebra striping (striping adds visual noise at the density this product operates at); row hover state is a subtle `secondary`-tint background, applied only to rows that are actually interactive (see Section 6.2.1).
**Density:** default row height 44px; a "compact" density toggle is a v2.0 candidate for tables exceeding ~50 visible rows (Analytics ABC table, Inventory table) but is not required for launch — if omitted, default density applies everywhere.
**New requirements:**
- Every sortable column gets a click-to-sort header with a direction indicator — addressing `UX_AUDIT.md` X4 (no table ever supported sorting in v1).
- Every table over one page of results uses the pagination component already established in v1 (`components/pagination.tsx`) — no table may silently hard-cap its results without pagination, addressing X5/A2.

#### 6.2.1 Row interactivity

Every row-click-to-detail pattern in the product must use the same underlying interactive element (an accessible link/button wrapping the row), never a plain `onClick` on a `<TableRow>` — this closes `UX_AUDIT.md` X3, where Procurement's row click was implemented inaccessibly while Inventory/Suppliers did it correctly. v2.0 has exactly one correct pattern; there is no second one to accidentally reach for.

### 6.3 Charts

**Style:** no chart border/card-within-card; chart sits directly in its parent card's content area. Axis lines at `border` weight, gridlines at 50% of `border` opacity, axis labels at Helper size in `muted-foreground`. Series use the Section 3.4 palette in order, with semantic override for status-carrying charts (a stock-status pie always maps CRITICAL→`critical`, HEALTHY→`success`, etc., ignoring the categorical palette — see Section 10.1).
**Structure (new):** every chart card gains a fixed three-part footer per Section 7.2 — Summary, Current Insight, AI Recommendation — beneath the chart canvas, not floating over it.

### 6.4 Buttons

**Variants (unchanged set, restyled to new tokens):** primary (filled `primary`), outline (bordered, transparent fill — the default for secondary actions, matching v1's already-correct heavy use of `variant="outline"`), destructive (filled `critical`, reserved exclusively for irreversible actions — import replace, future delete actions), ghost (no border/fill, icon-only or low-emphasis inline actions).
**Sizing:** default 36px height desktop, 40px minimum in any mobile-reachable context (5.6). Icon+label buttons always order icon-then-label with 8px gap, never label-then-icon, for consistent left-to-right scanning.
**States:** default, hover (subtle fill/opacity shift, no scale/transform), focus (visible `ring` outline — never removed, this is an accessibility floor), disabled (50% opacity, no pointer events), loading (spinner replaces the leading icon, label text changes to a present-participle form — "Importing…" — matching v1's already-correct pattern in `UploadPanel`/`RecalculateButton`).

### 6.5 Dropdowns / Selects

Retains the existing Radix-based `Select` component's visual language (bordered trigger, `card-elevated` popover content). Two new requirements:
- Any select presenting more than ~20 options must support in-place search filtering, following the pattern v1 introduced for the Forecasting product picker (`UX_AUDIT.md` F1) — this is now the standard for *every* long select in the product, not a one-off fix.
- Filter selects always show their current value as plain text (not a generic placeholder) so a glance at the filter bar tells the user exactly what's applied — already correct in v1's `FilterSelect`, retained unchanged.

### 6.6 Dialogs

Every destructive or multi-field action uses the styled `Dialog` component (`card-elevated` surface, centered, `Cancel` + primary/destructive action pair in the footer) — never a native browser `confirm()`/`prompt()`, closing `UX_AUDIT.md` M1 as a product-wide rule, not a single-instance fix. A destructive dialog's confirm button is always the `destructive` button variant (6.4) and always states the specific, named consequence in its body copy (v1's import-replace dialog — "will permanently replace every product, supplier…" — is the reference implementation for this pattern going forward).

### 6.7 Inputs

Bordered, `background`-fill (not `card`-fill, so an input reads as "editable" against its containing card), 36px height matching buttons for row alignment in filter bars and forms. Number inputs used for quantities/costs right-align their text (matching the mono/tabular convention in Section 4.2). Validation state: `critical`-colored border + inline Helper-size error text below the field, never a toast-only error for field-level validation.

### 6.8 Tooltips

Reserved for **supplementary** information only — never the sole disclosure mechanism for something a user needs (that's what the info affordance in 7.1 and expandable panels are for). Style: `card-elevated` surface, Helper text size, appears on hover/focus with a short delay (150–200ms) so they don't flash during normal cursor movement across a dense table.

### 6.9 Status Badges

Pill shape, Micro-label text, colored via the Section 3.3 semantic tokens at ~15% background opacity with full-opacity text of the same hue (matching the existing `SeverityBadge`/`RecommendationStatusBadge` visual language in v1, which is already correct and simply gets re-tokenized). One badge shape and sizing for every status type in the product (severity, stock status, PO status, ABC class, recommendation status) — no per-page badge variants.

### 6.10 Recommendation Cards

Restructured per Section 7.4: severity badge + category label + entity link (top row, unchanged from v1) → deterministic justification (unchanged) → **new** "Why?" disclosure (Section 7.4) → optional AI Insight disclosure (unchanged pattern, re-tokenized to `accent`) → action row (Accept/Snooze/Dismiss, or Status badge + Reactivate for non-Active items, per the v1 fix). Cards remain a vertical list, not a table — recommendations are read as narratives, not scanned as data rows, and the layout should keep reflecting that difference.

---

## 7. Intelligence Layer

This is the defining feature of v2.0 — the mechanism that makes "AI-native" (1.2) concrete rather than aspirational, and the mechanism that answers "why" and "what next" (1.5) on every page, not just Copilot.

### 7.1 KPI Info Panel

Every KPI card gains a small `(i)` info affordance beside its label. Activating it (click or focus, not hover-only — this must be keyboard-accessible) opens a `card-elevated` popover anchored to the card, containing exactly five fields, always in this order:

| Field | Content | Source |
|---|---|---|
| **Definition** | One sentence, plain language, no jargon (1.1's "never require business knowledge" principle) | Static content registry |
| **Why it matters** | One or two sentences connecting the metric to a business consequence | Static content registry |
| **How it's calculated** | The formula or method in plain language (not a code snippet) — e.g., "Safety Stock = Z-score × standard deviation of demand × √(lead time)" | Static content registry, must match `OPERATIONS_ENGINE_SPEC.md` exactly |
| **Ideal range** | A stated target or healthy band, if one exists for this metric (some KPIs, like a raw count, have no "ideal range" and this field states that explicitly rather than being omitted silently) | Static content registry |
| **How to improve it** | One to three concrete, generic levers (not an AI-generated suggestion specific to the current data — that belongs in Section 7.2/7.4) | Static content registry |

**This entire panel is static, deterministic content — never AI-generated.** A metric's definition and formula do not change based on today's data, and must not appear to. This is the first half of the static-vs-dynamic distinction (7.5).

### 7.2 Chart Intelligence Footer

Every chart card gains a three-part footer beneath the chart canvas:

1. **Summary** — one sentence stating what the chart shows, always present, static per chart type (e.g., "Stock positions across every warehouse, grouped by health status").
2. **Current Insight** — one or two sentences, **deterministically computed from the current dataset** (e.g., "3 of 4 warehouses are within healthy utilization range; NovaFoods Mumbai Distribution Center is at 91%, above the 90% warning threshold"). This is generated the same way the existing Executive Brief is generated today — real numbers, template sentences, no LLM call — and must update automatically whenever the underlying data changes.
3. **AI Recommendation** — optional, clearly labeled with the `accent` color and a sparkle icon (matching the existing Copilot "AI Insight" visual language), a short Claude-generated suggestion grounded in the same data the Current Insight used. Follows the same "optional enhancement, not a substitute" framing already present in v1's AI Insight blocks. If AI generation is unavailable (no API key, generation not yet run), this section is omitted entirely rather than shown empty — never a broken-looking gap.

### 7.3 Operational Brief (every page)

The Executive Dashboard's existing "Executive Brief" pattern — a deterministic, templated paragraph summarizing the page's data in prose — becomes a required opening element on **every** page, not just the dashboard. Each page's Operational Brief is scoped to that page's data (Inventory's brief talks about stock health, not supplier reliability) and follows the same construction rule as the dashboard's: real computed numbers substituted into a template sentence, never a free-form LLM narrative for this specific element (LLM narrative lives in the optional AI Recommendation layer, 7.2/7.4, not the Brief). This directly serves "what is happening" (1.5) as the very first thing a user reads on any page.

### 7.4 Recommendation "Why?"

Every recommendation card gains a "Why?" disclosure (collapsed by default, consistent with the existing "Show AI Insight" toggle pattern) containing:

- **Which engine produced it** — named plainly (e.g., "Critical Inventory Rule," "Low Reliability Supplier Rule" — the actual rule names already used internally in `lib/domain/recommendations/rules.ts`, surfaced to the user for the first time).
- **The underlying data that triggered it** — the specific values compared against the specific threshold (e.g., "On-hand: 21 units. Reorder point: 261 units. Safety stock: 31 units.") — a structured breakdown of the same facts the deterministic justification sentence already states in prose, now also available in a scannable key-value form.

This turns every recommendation from "trust the box" into "verify the box" — directly serving the "why" question (1.5) for the single highest-stakes surface in the product (recommendations drive real reorder/supplier decisions).

### 7.5 Static vs. dynamic — the visual contract

Every piece of explanatory content in the product is one of exactly two kinds, and the interface must make the kind visually unambiguous at a glance:

| | Static (deterministic) | Dynamic (AI-generated) |
|---|---|---|
| **Examples** | KPI Info Panel, Chart Summary, Chart Current Insight, Operational Brief, recommendation justification, recommendation "Why?" breakdown | Chart AI Recommendation, recommendation AI Insight, Copilot narrative generation |
| **Color** | `foreground` / `muted-foreground` (neutral) | `accent` (violet, Section 3.2) |
| **Icon** | `Info` glyph or none | `Sparkles` glyph, always |
| **Label** | none needed (absence of the AI marker *is* the signal) | Explicit "AI" text label alongside the sparkle, every time, no exceptions |
| **Availability** | Always present, computed synchronously with the page | Optional; may be absent if generation hasn't run or is unavailable, and the interface must degrade gracefully (7.2) rather than show an error |

No exceptions to this table are permitted in the redesign — a new feature that blends the two without following this contract is a design defect, not a stylistic choice.

---

## 8. Executive Dashboard Redesign

The dashboard is the product's front door and the clearest test of Section 1.5's three questions. Target structure, top to bottom:

### 8.1 Operational Brief

Per 7.3, now the literal first element on the page (already true in v1 as "Executive Brief" — retained as the anchor pattern the rest of the product adopts). Elevated slightly above ordinary cards (a subtle `card-elevated`-adjacent treatment, not a full popover style) so it visually reads as "read this first."

### 8.2 Company Overview strip

New: a compact, single-row strip beneath the Brief stating the loaded company's scale in industry-agnostic terms — number of SKUs, warehouses, suppliers, categories — sourced from the current dataset, not hardcoded FMCG framing. This replaces any dashboard copy that currently assumes an FMCG-specific vocabulary, serving Section 12's dynamic-company requirement at the page-content level, not just the branding-string level.

### 8.3 KPI row — richer cards

The existing four-KPI row (Operations Health Score, Inventory Turnover, Avg Supplier Reliability, Active Recommendations) is retained in position and count, but each card gains:

- The info affordance (7.1).
- Where a prior-period comparison is meaningful and available (Operations Health Score, Inventory Turnover), a small trend delta (Section 4.3) — this is the one KPI-level addition genuinely new to v2.0's data requirements and should be scoped as a fast-follow if the underlying prior-period computation isn't ready at redesign time, rather than blocking the rest of the page.

### 8.4 Operational Priorities panel (new)

A new card, positioned directly after the KPI row and before the chart row, surfacing the top 3–5 highest-severity active recommendations company-wide — a dashboard-level preview of Operations Copilot, not a duplicate full list. Each entry is a condensed one-line version of the recommendation card (severity + entity + justification, no action buttons) linking through to the full Copilot view filtered to that item. This directly answers "what should I do next" (1.5) without requiring the user to leave the dashboard to discover it exists.

### 8.5 Chart row

The existing Warehouse Utilization and Inventory Status Distribution charts (or their v2.0 equivalents) retain their two-column position but each gains the full Chart Intelligence Footer (7.2). Unlabeled reference/threshold lines (`UX_AUDIT.md` D4) are fixed here as a standing rule (Section 10.4), not a one-off patch.

### 8.6 AI summaries

The dashboard's AI Recommendation content (7.2) should, where possible, synthesize *across* the two charts rather than commenting on each in isolation (e.g., connecting a warehouse's high utilization to that warehouse's disproportionate share of critical stock positions) — this is the one place in the product where a cross-chart AI synthesis is explicitly encouraged, since the dashboard's entire purpose is a company-wide view no single other page provides.

---

## 9. Page-Specific Redesign

Each page below inherits everything in Sections 1–8 by default; only genuinely page-specific goals are listed here.

### 9.1 Inventory

- Operational Brief scoped to stock health (critical count, overstock count, total value at risk).
- Stock Status and Category charts (already fixed for the v1 rendering bug) gain Chart Intelligence Footers; the Category chart's bars gain direct value labels so exact counts don't require a tooltip hover.
- Inventory table gains sortable columns (6.2) and, for the health-score column specifically, an inline info affordance explaining what the 0–100 score means and its color bands — closing the "unexplained 0–100 scores" cross-cutting gap noted during the v1 audit.
- Per-product detail view gains a "Why is this critical/low?" breakdown using the same structured format as Section 7.4, reusing that pattern rather than inventing a page-specific one.

### 9.2 Procurement

- Operational Brief scoped to open/overdue PO counts and flagged-for-reorder product count.
- EOQ Suggestions table (already gained a "Create PO" action in v1) restyled with the new table/button standards; the Create PO dialog restyled to 6.6/6.7 without changing its field set or validation.
- Purchase Order row-click uses the single correct interactive-row pattern (6.2.1), closing `UX_AUDIT.md` X3/P2.
- Warehouse-name display is made consistent between the table and the detail Sheet (`UX_AUDIT.md` P3) — one truncation/full-name rule applied in both places.

### 9.3 Supplier Performance

- Operational Brief scoped to average reliability and count of suppliers below threshold.
- Reliability chart's name-truncation logic (`UX_AUDIT.md` S1) is replaced with a fixed-width ellipsis + tooltip-on-hover pattern (6.8) rather than a fixed word count, so a name is never silently cut mid-word into something that reads as broken.
- Supplier detail view gains the "Why is this supplier flagged?" breakdown (7.4-style) wherever a supplier has an active recommendation against it.

### 9.4 Demand Forecasting

- Operational Brief scoped to aggregate forecast accuracy across both methods.
- Product picker keeps the v1 search-filter fix (6.5) and is restyled only.
- Forecast chart (Actual vs. Forecast) gains a Chart Intelligence Footer explaining, in the Current Insight, which method (Moving Average or Exponential Smoothing) is currently more accurate for the selected product and by how much — turning a chart a user must currently interpret visually into one that states its own conclusion in words.

### 9.5 Business Analytics

- Operational Brief scoped to ABC distribution (e.g., "12 products (5.9%) drive 70% of usage value — Class A").
- Pareto chart's Y-axis label fix (v1, A1) is retained; the chart additionally gains direct callouts marking the A/B/C class boundaries on the curve itself, so the classification is visible in the chart, not only in the table below it.
- ABC classification table keeps v1's pagination fix (X5/A2) and gains sorting (6.2).
- Warehouse Utilization chart gains labeled threshold lines (10.4), closing the cross-cutting "unlabeled reference line" gap for this page specifically.

### 9.6 Operations Copilot

- Operational Brief scoped to active/critical/accepted counts (largely a restyle of the existing KPI row into prose form).
- Recommendation cards adopt the Section 6.10/7.4 structure — the "Why?" disclosure is new; Accept/Snooze/Dismiss/Reactivate and the Status filter (both shipped in v1) are retained and only restyled.
- The AI Narrative Insights panel is restyled to the `accent`/sparkle visual language (7.5) consistently, replacing its current ad hoc treatment.
- Empty state (no recommendations matching filters) gains the description + "Clear filters" action it currently lacks (`UX_AUDIT.md` C3).

### 9.7 Import Center

- No Operational Brief (there is no "current company" data to summarize before an import — this page is explicitly exempted from 7.3, and this exemption should be stated in-page rather than silently missing the pattern, e.g., a short static explainer in its place).
- Upload/Validate/Import stepper restyled to the new card/button/dialog standards (the destructive-replace confirmation dialog shipped in v1 is the reference implementation, per 6.6).
- Validation Report table adopts the standard table style (6.2) and sorting by severity.
- Post-import success state gains an explicit "Import another file" action (`UX_AUDIT.md` M3) so a second import doesn't require leaving the page.
- Blocked-validation state gains explicit next-step guidance text ("Fix the errors above and re-upload") addressing `UX_AUDIT.md` M2.

---

## 10. Chart Standards

### 10.1 Color usage

- Status-representing charts (stock status pie, recommendation severity breakdown) always map data categories to the Section 3.3 semantic tokens, never to the categorical palette (3.4) — a "critical" segment is always the same red everywhere in the product, whether it's a badge, a KPI accent bar, or a pie slice.
- Non-status charts (category breakdown, warehouse comparison, forecast method lines) use the Section 3.4 categorical palette strictly in its defined order, so series order is predictable across charts that share categories (e.g., a product category keeps the same color whether shown on the Inventory page or the Analytics page).

### 10.2 Empty states

Every chart has a defined empty state (no data for the current filter/selection): the existing `EmptyState` component's visual language (icon + title + optional description, per 6.9's "no illustration" enterprise-first rule) is used in place of the chart canvas — never a blank card, never an axis-and-gridlines-with-nothing-plotted render, which reads as a bug rather than an intentional empty state.

### 10.3 AI summaries and explanations

Covered fully in Section 7.2 (Chart Intelligence Footer) — restated here as a chart-specific requirement: **no chart ships without a Summary line at minimum.** Current Insight and AI Recommendation may be page/data-dependent in whether they have anything substantive to say, but Summary is mandatory and static, so a chart is never presented with zero textual context.

### 10.4 Axis and reference-line labeling

Any `ReferenceLine`, threshold marker, or target band drawn on a chart must carry a visible label (inline or in the legend) stating what it represents and its value — closing the cross-cutting "unlabeled threshold lines" gap identified across the Dashboard and Analytics pages in the v1 audit. An unlabeled line is never acceptable, regardless of how "obvious" its meaning seems in context.

### 10.5 Drill-downs

Where a chart's data corresponds to rows in a table elsewhere on the same page (e.g., the Category chart's bars correspond to rows in the Inventory table below it), clicking a chart element filters that table in place — this is a v2.0 addition, not present in v1. Where no corresponding on-page table exists, clicking a chart element may instead navigate to the relevant detail page (e.g., clicking a supplier's bar on a company-wide chart navigates to that supplier's detail view). Every chart's cursor state (pointer vs. default) must accurately reflect whether it supports this interaction — no chart may look clickable and do nothing.

### 10.6 Legends

Legends are interactive by default (clicking a legend entry toggles that series' visibility) wherever the underlying charting library supports it without custom code — this gives a user a lightweight way to isolate one series in a busy chart (e.g., isolating one warehouse's utilization trend) without needing a separate filter control.

### 10.7 Tooltips

Chart tooltips show the exact value (never rounded further than the chart's own axis precision), the series/category label, and — where relevant and available — the unit and a one-line contextual note (e.g., a stock-status tooltip additionally states the reorder point for that segment). Tooltip content must never be the *only* place a value is available — per 6.8, tooltips are supplementary, and the same information should be reachable via the table below the chart or the info affordance.

---

## 11. Animation Guidelines

### 11.1 Splash screen

Shown once per cold session load, capped at a maximum of 800ms of artificial minimum display time (to avoid a jarring flash) but otherwise dismissed as soon as the app shell's first data fetch resolves — never held open for a fixed duration regardless of load time, and never shown again until the next full page reload/new session.

### 11.2 Page transitions

Subtle only: a 150–200ms opacity fade on route change, no slide/scale/parallax. Must respect `prefers-reduced-motion` by disabling the fade entirely (instant swap) for users who've set that preference at the OS level — this is a hard requirement, not a nice-to-have, consistent with the "no animation without a functional reason" discipline this specification asks for throughout.

### 11.3 Card animations

No stagger-in or entrance animation on ordinary navigation (a KPI row appearing card-by-card on every page visit is novelty that wears off in one session and adds latency to "what is happening" — 1.5). The only acceptable card entrance animation is a single, short (≤250ms) fade-in the *first* time the splash screen resolves into the initial dashboard view of a session — never repeated on subsequent navigations within the same session.

### 11.4 Chart animations — hard constraint

Chart entry animation (bars growing in, pie slices sweeping in) is permitted **only** if it cannot leave a chart in a blank or partially-rendered state on first paint under any mounting condition — including two charts mounting simultaneously in the same grid row, the exact scenario that caused `UX_AUDIT.md` I1/I2 in v1 (root-caused to the charting library's animation-start race, fixed by disabling animation entirely). Any reintroduction of chart animation in v2.0 must be verified against that exact scenario (two charts, same row, cold navigation, multiple reloads) before shipping — using the audit's own verification method (reload, resize, delayed re-screenshot, DOM-level geometry check) — not a single visual check. If this cannot be verified reliably, charts remain static-render (no entry animation), which is an acceptable permanent outcome, not merely an interim one — a correct static chart is strictly better than an animated chart that sometimes fails to render.

### 11.5 Loading skeletons

Every data-dependent region (KPI cards, chart cards, tables) has a skeleton state matching its final layout's approximate shape and dimensions (not a generic centered spinner), so the page never visibly reflows once real content arrives — this is a correctness requirement (avoiding layout shift), not purely a polish one. Skeletons use a subtle shimmer (a slow, low-contrast gradient sweep), never a hard blink/pulse, and must also respect `prefers-reduced-motion` by falling back to a static muted-fill block.

---

## 12. Dynamic Company Support

### 12.1 The mechanism

A **Company Identity** — currently just a display name, with a generated initials mark as a fallback visual (no logo upload capability is in scope for v2.0) — is resolved once per page load from the currently loaded dataset and threaded through every surface that references "the company" by name. Today, that identity is hardcoded to the string "NovaFoods Pvt. Ltd." (and shorter derivatives like "NovaFoods") in multiple places; v2.0's redesign must replace every one of those literals with a reference to the resolved Company Identity, so that importing a different company's workbook (per `DATA_IMPORT_ARCHITECTURE.md`) automatically updates every surface below with no per-page code change required afterward.

**Where the name comes from** (a decision for the implementation phase, stated here only as a constraint the design must accommodate): the simplest option is an optional "Company Name" field on the Import Center workbook's Instructions/cover sheet, defaulting to a generic label ("Imported Company") if omitted — this specification does not mandate a specific schema change, only that the design must not assume the name is always present and must have a defined, non-broken fallback string (never a blank sidebar footer, never literally "undefined").

### 12.2 Surfaces that must become dynamic

Every one of these currently hardcodes NovaFoods and must instead render the resolved Company Identity:

| Surface | Current (hardcoded) | v2.0 behavior |
|---|---|---|
| Sidebar footer | "NovaFoods Pvt. Ltd. / Operations Decision Hub" | Company Identity name + generic product tagline |
| Topbar subtitle | "AI-grounded recommendations for NovaFoods FMCG operations" | Same sentence with the company name substituted, and "FMCG" generalized to industry-agnostic phrasing (per 8.2 — not every imported company is FMCG) |
| Browser tab title | Static | Per Section 2.4's pattern |
| Warehouse Utilization chart, Inventory table, Purchase Order table | Warehouse names embed "NovaFoods" as a prefix (e.g., "NovaFoods Mumbai Distribution Center") | These are actual data values from the imported dataset, not UI chrome — they are already dynamic in the sense that a different import produces different warehouse names, and require no *design* change, only confirmation that no page independently re-hardcodes the NovaFoods prefix in its own copy (a code-review concern for the implementation phase, noted here so it isn't missed) |
| Any page description/marketing-style copy that says "NovaFoods" or assumes FMCG specifically | Import Center description (fixed in v1 to be company-agnostic already), any remaining page copy | Audited and generalized during implementation using this table as the checklist |

### 12.3 What stays constant

Restated from Section 2.1 for clarity at the point of implementation: the OpsPilot AI mark, wordmark, product name, and favicon are **never** part of this substitution — only the Company Identity slot changes on import. A future implementer should treat "does this string represent the product or the company's data?" as the deciding question for every piece of copy touched during the v2.0 rollout.

---

## 13. Design Principles

Restated as standing maxims — the acceptance criteria for any future addition to OpsPilot AI, not just the v2.0 redesign itself:

1. **Every graph teaches.** A chart with nothing to say (Section 10.3) is an incomplete chart, not a finished one.
2. **Every KPI explains itself.** A number a user can't trace back to a definition and a formula (Section 7.1) is not yet a KPI — it's just a number.
3. **Every recommendation justifies itself.** "Trust me" is never sufficient (Section 7.4); a recommendation that can't show its work doesn't ship.
4. **Every page guides decisions.** If a page doesn't help answer "what should I do next" (Section 1.5), it's a report, not a decision-support surface — and this product is the latter.
5. **Never require business knowledge to understand the dashboard.** A first-time user with no supply-chain background should be able to read any page's Operational Brief and understand what's wrong and why, without a glossary.
6. **Static and dynamic content are never visually ambiguous.** A user should never have to wonder whether a sentence on screen came from real data or from an AI guess (Section 7.5) — the interface must always tell them, unprompted.
7. **Restraint is a feature.** Every color, animation, and visual flourish not in service of the three questions (1.5) is a cost, not a decoration — the burden of proof is on adding something, never on leaving it out.
8. **The product's identity is permanent; the customer's identity is not.** OpsPilot AI is always OpsPilot AI, running on anyone's data (Section 2.1, Section 12) — this is the difference between a demo and a product.
