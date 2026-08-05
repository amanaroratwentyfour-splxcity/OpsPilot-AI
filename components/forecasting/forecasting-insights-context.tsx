"use client";

import { createInsightsContext } from "@/components/intelligence/insights-context";
import type { ForecastInsightInput, ForecastInsightResult } from "@/lib/ai/forecastInsightProvider";

/**
 * Shares one "Generate Forecast Insights" action and its result across the
 * Forecasting page — same role as components/suppliers/suppliers-insights-context.tsx,
 * built on the same shared factory (components/intelligence/insights-context.tsx).
 */
const { Provider, useInsights } = createInsightsContext<ForecastInsightInput, ForecastInsightResult>(
  "/api/forecasting/insights",
  (result) => !!result.suggestedActionsRecommendation,
);

export const ForecastingInsightsProvider = Provider;
export const useForecastingInsights = useInsights;
