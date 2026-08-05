"use client";

import { ChartIntelligenceFooter } from "@/components/intelligence/chart-intelligence-footer";
import { useAnalyticsInsights } from "./analytics-insights-context";
import type { AnalyticsDeterministicInsight } from "@/lib/presentation/analyticsInsights";

/**
 * Serves both Phase 9 §4 (AI-generated suggested actions) and §5 (the
 * deterministic Analytics Summary facts) as one panel — the existing
 * Summary/Insight/AI-Recommendation slots already cover both asks, so a
 * second summary component isn't needed. Same standalone-panel approach as
 * components/procurement/procurement-intelligence-panel.tsx and
 * components/forecasting/forecast-insights-panel.tsx.
 */
export function AnalyticsInsightsPanel({ summary, insight }: AnalyticsDeterministicInsight) {
  const { status, insights } = useAnalyticsInsights();

  return (
    <ChartIntelligenceFooter
      summary={summary}
      insight={insight}
      aiRecommendation={insights?.suggestedActionsRecommendation}
      aiStatus={status === "running" ? "running" : "idle"}
    />
  );
}
