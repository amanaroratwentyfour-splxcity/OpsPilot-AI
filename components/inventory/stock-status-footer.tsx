"use client";

import { ChartIntelligenceFooter } from "@/components/intelligence/chart-intelligence-footer";
import { useInventoryInsights } from "./inventory-insights-context";
import type { StockStatusInsight } from "@/lib/presentation/chartInsights";

/** Combines the static Summary/Insight (computed server-side, passed as props) with the shared AI Recommendation slice — mirrors components/dashboard/stock-status-footer.tsx, pointed at the Inventory page's own AI context. */
export function StockStatusFooter({ summary, insight }: StockStatusInsight) {
  const { status, insights } = useInventoryInsights();
  return (
    <ChartIntelligenceFooter
      summary={summary}
      insight={insight}
      aiRecommendation={insights?.stockChartRecommendation}
      aiStatus={status === "running" ? "running" : "idle"}
    />
  );
}
