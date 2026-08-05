"use client";

import { ChartIntelligenceFooter } from "@/components/intelligence/chart-intelligence-footer";
import { useInventoryInsights } from "./inventory-insights-context";
import type { CategoryBreakdownInsight } from "@/lib/presentation/chartInsights";

/** Combines the static Summary/Insight (computed server-side, passed as props) with the shared AI Recommendation slice for the "Positions by Category" chart. */
export function CategoryChartFooter({ summary, insight }: CategoryBreakdownInsight) {
  const { status, insights } = useInventoryInsights();
  return (
    <ChartIntelligenceFooter
      summary={summary}
      insight={insight}
      aiRecommendation={insights?.categoryChartRecommendation}
      aiStatus={status === "running" ? "running" : "idle"}
    />
  );
}
