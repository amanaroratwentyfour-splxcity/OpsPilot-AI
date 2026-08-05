"use client";

import { ChartIntelligenceFooter } from "@/components/intelligence/chart-intelligence-footer";
import { useDashboardInsights } from "./dashboard-insights-context";
import type { WarehouseUtilizationInsight } from "@/lib/presentation/chartInsights";

/** Combines the static Summary/Insight (computed server-side, passed as props) with the shared AI Recommendation slice — a thin client boundary so the chart component itself stays untouched and reusable on other pages. */
export function WarehouseUtilizationFooter({ summary, insight }: WarehouseUtilizationInsight) {
  const { status, insights } = useDashboardInsights();
  return (
    <ChartIntelligenceFooter
      summary={summary}
      insight={insight}
      aiRecommendation={insights?.warehouseChartRecommendation}
      aiStatus={status === "running" ? "running" : "idle"}
    />
  );
}
