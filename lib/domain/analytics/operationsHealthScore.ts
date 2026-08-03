import { OPERATIONS_HEALTH_WEIGHTS } from "../config";

export interface OperationsHealthComponents {
  /** Company-wide average of Inventory Health Score (Milestone 2.2). */
  inventoryHealth: number | null;
  /** Company-wide average of Supplier Reliability Score (Milestone 2.5). */
  supplierReliability: number | null;
  /** Already converted to a 0-100 "accuracy" scale (100 - avg MAPE, floored
   *  at 0) by the caller — this function has no MAPE-specific knowledge. */
  forecastAccuracy: number | null;
  /** Company-wide average of computeWarehouseUtilizationHealth. */
  warehouseUtilizationHealth: number | null;
  /** computeTurnoverHealth's output. */
  turnoverHealth: number | null;
}

/**
 * Operations Health Score: the single headline number blending every
 * engine's output into one 0-100 score — the one metric in this codebase
 * that is genuinely a composition *across* engines, not just across
 * products within one engine.
 *
 * Like Inventory Health Score, this is a designed composite, not a
 * textbook OM formula — its weights (OPERATIONS_HEALTH_WEIGHTS) are an
 * explicit, documented, tunable product decision.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.10.
 *
 * Business rule: if a component is `null` (unavailable), it — and its
 * weight — is excluded from the blend, and the remaining weights are
 * renormalized so they still sum to 100%. This falls out naturally from
 * dividing by the sum of only the *present* weights, rather than a fixed
 * 1.0: a missing component is never silently treated as 0, which would
 * unfairly and invisibly tank the score.
 *
 * @returns a score in [0, 100], or `null` if every component is unavailable
 */
export function computeOperationsHealthScore(
  components: OperationsHealthComponents,
  weights: typeof OPERATIONS_HEALTH_WEIGHTS = OPERATIONS_HEALTH_WEIGHTS,
): number | null {
  const presentEntries: { value: number; weight: number }[] = [];

  if (components.inventoryHealth !== null) {
    presentEntries.push({ value: components.inventoryHealth, weight: weights.inventory });
  }
  if (components.supplierReliability !== null) {
    presentEntries.push({ value: components.supplierReliability, weight: weights.supplier });
  }
  if (components.forecastAccuracy !== null) {
    presentEntries.push({ value: components.forecastAccuracy, weight: weights.forecast });
  }
  if (components.warehouseUtilizationHealth !== null) {
    presentEntries.push({
      value: components.warehouseUtilizationHealth,
      weight: weights.warehouse,
    });
  }
  if (components.turnoverHealth !== null) {
    presentEntries.push({ value: components.turnoverHealth, weight: weights.turnover });
  }

  if (presentEntries.length === 0) {
    return null;
  }

  const totalPresentWeight = presentEntries.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedSum = presentEntries.reduce((sum, entry) => sum + entry.value * entry.weight, 0);

  return weightedSum / totalPresentWeight;
}
