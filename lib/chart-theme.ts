import type { CSSProperties } from "react";

/**
 * DESIGN_SPECIFICATION.md §3.4/§6.3/§10.1 — the one place every chart
 * component sources its colors from, so no chart hardcodes a hex value.
 * Recharts accepts CSS custom-property references directly in `fill`/
 * `stroke` string props, so these strings resolve against the same
 * `--chart-N` / semantic tokens defined in app/globals.css and stay correct
 * across light/dark mode with no per-chart theme logic.
 */

/** Fixed, ordered categorical palette for non-status series (product categories, warehouses, forecast methods, etc.). */
export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
] as const;

/** Semantic status colors — used only when a chart's data directly represents a status (never for a plain categorical series). */
export const STATUS_CHART_COLORS = {
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  critical: "hsl(var(--critical))",
  info: "hsl(var(--primary))",
} as const;

export const CHART_GRID_STROKE = "hsl(var(--border))";
export const CHART_AXIS_TICK_FILL = "hsl(var(--muted-foreground))";
export const CHART_AXIS_LINE_STROKE = "hsl(var(--border))";

/** Recharts <Tooltip contentStyle={CHART_TOOLTIP_STYLE} ...> — the card-elevated surface per §6.8. */
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "hsl(var(--popover-foreground))",
  fontWeight: 600,
  marginBottom: "4px",
};

/** Recharts <Legend wrapperStyle={CHART_LEGEND_STYLE} ...> */
export const CHART_LEGEND_STYLE: CSSProperties = {
  fontSize: "12px",
  color: "hsl(var(--muted-foreground))",
};
