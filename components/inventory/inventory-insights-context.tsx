"use client";

import { createInsightsContext } from "@/components/intelligence/insights-context";
import type { InventoryInsightInput, InventoryInsightResult } from "@/lib/ai/inventoryInsightProvider";

/**
 * Shares one "Generate AI Insights" action and its result across the
 * Inventory Intelligence page's two chart footers, without prop-drilling
 * through the Server Component page tree — same role as
 * components/dashboard/dashboard-insights-context.tsx, built on the same
 * shared factory (components/intelligence/insights-context.tsx).
 */
const { Provider, useInsights } = createInsightsContext<InventoryInsightInput, InventoryInsightResult>(
  "/api/inventory/insights",
  (result) => !!(result.stockChartRecommendation || result.categoryChartRecommendation || result.healthSuggestion),
);

export const InventoryInsightsProvider = Provider;
export const useInventoryInsights = useInsights;
