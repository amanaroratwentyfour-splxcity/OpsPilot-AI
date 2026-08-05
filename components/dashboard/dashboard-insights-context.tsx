"use client";

import { createInsightsContext } from "@/components/intelligence/insights-context";
import type { DashboardInsightInput, DashboardInsightResult } from "@/lib/ai/dashboardInsightProvider";

export type { InsightsStatus as DashboardInsightsStatus } from "@/components/intelligence/insights-context";

/**
 * Shares one "Generate AI Insights" action and its result across the
 * dashboard's several, physically distant AI content slots (two chart
 * footers + the Health Score panel) without prop-drilling through the
 * Server Component page tree. A component outside this provider (e.g.
 * StockStatusChart rendered on the Inventory page, which wraps itself in
 * its own InventoryInsightsProvider instead) safely gets the default idle
 * value from the shared factory — no AI content ever renders there.
 *
 * Built on the shared createInsightsContext factory
 * (components/intelligence/insights-context.tsx) — this file only supplies
 * the dashboard-specific endpoint, input/result types, and "does this
 * result have anything to show" check. Phase 5 (Inventory Intelligence)
 * introduced the factory by extracting this file's original implementation
 * verbatim; the external API here (component/hook names, prop shape,
 * return shape) is unchanged.
 */
const { Provider, useInsights } = createInsightsContext<DashboardInsightInput, DashboardInsightResult>(
  "/api/dashboard/insights",
  (result) => !!(result.warehouseChartRecommendation || result.stockChartRecommendation || result.healthScoreSuggestion),
);

export const DashboardInsightsProvider = Provider;
export const useDashboardInsights = useInsights;
