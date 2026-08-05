"use client";

import { ChartIntelligenceFooter } from "@/components/intelligence/chart-intelligence-footer";
import { useForecastingInsights } from "./forecasting-insights-context";
import type { ForecastingDeterministicInsight } from "@/lib/presentation/forecastingInsights";

/**
 * Forecasting has no page-wide chart (the existing ForecastChart is
 * per-product and must not be touched), so this reuses
 * ChartIntelligenceFooter directly as a standalone Summary/Insight/AI
 * panel — same approach as components/procurement/procurement-intelligence-panel.tsx
 * and components/suppliers/reliability-chart-footer.tsx.
 */
export function ForecastInsightsPanel({ summary, insight }: ForecastingDeterministicInsight) {
  const { status, insights } = useForecastingInsights();

  return (
    <ChartIntelligenceFooter
      summary={summary}
      insight={insight}
      aiRecommendation={insights?.suggestedActionsRecommendation}
      aiStatus={status === "running" ? "running" : "idle"}
    />
  );
}
