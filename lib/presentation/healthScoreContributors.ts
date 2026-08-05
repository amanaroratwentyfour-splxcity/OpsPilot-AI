import { OPERATIONS_HEALTH_WEIGHTS } from "@/lib/domain/config";
import type { CompanyAnalyticsSnapshot } from "@/lib/domain/analytics/companyAnalytics";

export interface HealthScoreComponentView {
  label: string;
  value: number | null;
  weightPercent: number;
}

const COMPONENT_LABELS: { key: keyof CompanyAnalyticsSnapshot["operationsHealthComponents"]; label: string; weight: number }[] = [
  { key: "avgInventoryHealth", label: "Inventory Health", weight: OPERATIONS_HEALTH_WEIGHTS.inventory },
  { key: "avgSupplierReliability", label: "Supplier Reliability", weight: OPERATIONS_HEALTH_WEIGHTS.supplier },
  { key: "avgForecastAccuracy", label: "Forecast Accuracy", weight: OPERATIONS_HEALTH_WEIGHTS.forecast },
  { key: "avgWarehouseUtilizationHealth", label: "Warehouse Balance", weight: OPERATIONS_HEALTH_WEIGHTS.warehouse },
  { key: "turnoverHealth", label: "Inventory Turnover", weight: OPERATIONS_HEALTH_WEIGHTS.turnover },
];

/** Every component with its weight, in the Operations Health Score's fixed display order — for the info panel's "Calculation inputs" section. */
export function listHealthScoreComponents(
  components: CompanyAnalyticsSnapshot["operationsHealthComponents"],
): HealthScoreComponentView[] {
  return COMPONENT_LABELS.map(({ key, label, weight }) => ({
    label,
    value: components[key],
    weightPercent: Math.round(weight * 100),
  }));
}

/**
 * The components dragging the blended score down the most, ranked by
 * weighted deficit from a perfect 100 (weight × (100 − value)) — a pure
 * comparison of numbers computeCompanyAnalyticsSnapshot already produced,
 * not a new calculation. Null (unavailable) components are excluded, same
 * as computeOperationsHealthScore's own renormalization rule.
 */
export function biggestHealthScoreContributors(
  components: CompanyAnalyticsSnapshot["operationsHealthComponents"],
  limit = 2,
): { label: string; value: number; weightedDeficit: number }[] {
  return COMPONENT_LABELS.filter((c) => components[c.key] !== null)
    .map((c) => {
      const value = components[c.key] as number;
      return { label: c.label, value, weightedDeficit: c.weight * (100 - value) };
    })
    .filter((c) => c.weightedDeficit > 0.5)
    .sort((a, b) => b.weightedDeficit - a.weightedDeficit)
    .slice(0, limit);
}
