"use client";

import { createInsightsContext } from "@/components/intelligence/insights-context";
import type { AnalyticsInsightInput, AnalyticsInsightResult } from "@/lib/ai/analyticsInsightProvider";

/**
 * Shares one "Generate Analytics Insights" action and its result across
 * the Analytics page — same role as
 * components/forecasting/forecasting-insights-context.tsx, built on the
 * same shared factory (components/intelligence/insights-context.tsx).
 */
const { Provider, useInsights } = createInsightsContext<AnalyticsInsightInput, AnalyticsInsightResult>(
  "/api/analytics/insights",
  (result) => !!result.suggestedActionsRecommendation,
);

export const AnalyticsInsightsProvider = Provider;
export const useAnalyticsInsights = useInsights;
