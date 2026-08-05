"use client";

import { ChartIntelligenceFooter } from "@/components/intelligence/chart-intelligence-footer";
import { useSuppliersInsights } from "./suppliers-insights-context";
import type { SupplierDeterministicInsight } from "@/lib/presentation/supplierInsights";

/** Combines the static Summary/Insight (computed server-side, passed as props) with the shared AI Recommendation slice — mirrors components/inventory/stock-status-footer.tsx, pointed at the Suppliers page's own AI context. */
export function ReliabilityChartFooter({ summary, insight }: SupplierDeterministicInsight) {
  const { status, insights } = useSuppliersInsights();
  const aiRecommendation =
    insights?.riskSupplierRecommendation || insights?.procurementActionRecommendation
      ? [insights.riskSupplierRecommendation, insights.procurementActionRecommendation].filter(Boolean).join(" ")
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
