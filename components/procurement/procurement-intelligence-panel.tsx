"use client";

import { ChartIntelligenceFooter } from "@/components/intelligence/chart-intelligence-footer";
import { useProcurementInsights } from "./procurement-insights-context";
import type { ProcurementDeterministicInsight } from "@/lib/presentation/procurementInsights";

/**
 * Procurement has no charts today, so this reuses ChartIntelligenceFooter
 * directly as a standalone Summary/Insight/AI-Recommendation panel instead
 * of building a new component — same shared card, same three-slot
 * architecture as the Dashboard/Inventory chart footers, just not sitting
 * under a chart.
 */
export function ProcurementIntelligencePanel({ summary, insight }: ProcurementDeterministicInsight) {
  const { status, insights } = useProcurementInsights();
  const aiRecommendation =
    insights?.purchasingPriorityRecommendation || insights?.immediateActionRecommendation
      ? [insights.purchasingPriorityRecommendation, insights.immediateActionRecommendation].filter(Boolean).join(" ")
      : null;

  return (
    <ChartIntelligenceFooter
      summary={summary}
      insight={insight}
      aiRecommendation={aiRecommendation}
      aiStatus={status === "running" ? "running" : "idle"}
    />
  );
}
