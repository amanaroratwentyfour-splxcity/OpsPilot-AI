"use client";

import { createInsightsContext } from "@/components/intelligence/insights-context";
import type { ProcurementInsightInput, ProcurementInsightResult } from "@/lib/ai/procurementInsightProvider";

/**
 * Shares one "Generate Procurement Insights" action and its result across
 * the Procurement page's intelligence panel — same role as
 * components/inventory/inventory-insights-context.tsx, built on the same
 * shared factory (components/intelligence/insights-context.tsx).
 */
const { Provider, useInsights } = createInsightsContext<ProcurementInsightInput, ProcurementInsightResult>(
  "/api/procurement/insights",
  (result) => !!(result.purchasingPriorityRecommendation || result.immediateActionRecommendation),
);

export const ProcurementInsightsProvider = Provider;
export const useProcurementInsights = useInsights;
