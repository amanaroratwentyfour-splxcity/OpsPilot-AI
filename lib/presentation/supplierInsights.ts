import { LOW_RELIABILITY_THRESHOLD, MIN_ORDERS_FOR_RELIABILITY_SCORE } from "@/lib/domain/config";
import { formatNumber } from "@/lib/format";
import type { SupplierMetrics } from "@/lib/domain/suppliers/supplierMetrics";

/**
 * Deterministic Supplier text, same discipline as procurementInsights.ts —
 * plain-fact sentences over data already fetched, never fabricated. No
 * engine in this codebase tracks a reliability *trend* over time (see
 * lib/domain/recommendations/lowReliabilitySuppliers.ts's docstring), so
 * every "trend" sentence here says exactly that rather than inventing one.
 */

export interface SupplierDeterministicInsight {
  summary: string;
  insight: string;
}

export function buildSupplierReliabilityInsight(
  kpis: { totalSuppliers: number; averageReliability: number | null; belowThreshold: number; notYetScored: number },
  distribution: { name: string; score: number | null }[],
): SupplierDeterministicInsight {
  const scoredCount = kpis.totalSuppliers - kpis.notYetScored;
  const summary = `${kpis.totalSuppliers} supplier(s) tracked, ${scoredCount} scored, average reliability ${kpis.averageReliability !== null ? formatNumber(kpis.averageReliability) : "—"}/100.`;

  if (kpis.belowThreshold === 0) {
    return { summary, insight: "All scored suppliers are at or above the reliability threshold, no immediate supplier risk flags." };
  }

  const scored = distribution.filter((d): d is { name: string; score: number } => d.score !== null);
  const worst = scored.reduce((min, d) => (d.score < min.score ? d : min));

  return {
    summary,
    insight: `${kpis.belowThreshold} supplier(s) are below the ${LOW_RELIABILITY_THRESHOLD} threshold; ${worst.name} has the lowest score at ${formatNumber(worst.score)}/100.`,
  };
}

export interface SupplierSummary {
  overallPerformance: string;
  reliabilityTrend: string;
  procurementRisk: string;
  operationalImpact: string;
  suggestedAction: string;
}

const NO_TREND_TEXT = "No historical trend is tracked. This score reflects a single point-in-time calculation, not a change over time.";

export function buildSupplierSummary(
  metrics: SupplierMetrics,
  overduePurchaseOrderCount: number,
  atRiskProductCount: number,
): SupplierSummary {
  const procurementRisk =
    overduePurchaseOrderCount > 0
      ? `${overduePurchaseOrderCount} purchase order(s) with this supplier are currently overdue.`
      : "No purchase orders with this supplier are currently overdue.";
  const operationalImpact =
    atRiskProductCount > 0
      ? `${atRiskProductCount} product(s) primarily sourced from this supplier are currently critical or low on stock.`
      : "No products primarily sourced from this supplier are currently at risk.";

  if (metrics.reliabilityScore === null) {
    return {
      overallPerformance: `Not enough delivery history yet, only ${metrics.sampleSize} received order(s) recorded, below the ${MIN_ORDERS_FOR_RELIABILITY_SCORE} needed for a reliability score.`,
      reliabilityTrend: NO_TREND_TEXT,
      procurementRisk,
      operationalImpact,
      suggestedAction: "Continue tracking deliveries until enough order history accumulates for a reliability score.",
    };
  }

  const flagged = metrics.reliabilityScore < LOW_RELIABILITY_THRESHOLD;
  const components = [
    { label: "On-Time Delivery Rate", value: metrics.onTimeDeliveryRate as number },
    { label: "Lead Time Consistency", value: metrics.leadTimeConsistency as number },
    { label: "Price Stability", value: metrics.priceStability as number },
  ];
  const weakest = components.reduce((min, c) => (c.value < min.value ? c : min));

  return {
    overallPerformance: `Reliability score is ${formatNumber(metrics.reliabilityScore)}/100, based on ${metrics.sampleSize} received order(s). This is ${flagged ? "below" : "at or above"} the ${LOW_RELIABILITY_THRESHOLD} threshold for a trusted supplier.`,
    reliabilityTrend: NO_TREND_TEXT,
    procurementRisk,
    operationalImpact,
    suggestedAction: flagged
      ? `Review ${weakest.label} (currently ${formatNumber(weakest.value)}/100), the weakest contributing factor, before placing new orders with this supplier.`
      : "No immediate action needed. Performance is within a healthy range.",
  };
}
