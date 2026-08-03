import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma/enums";
import { WAREHOUSE_UTILIZATION_THRESHOLDS } from "../config";
import type { RecommendationCandidate } from "./recommendationCandidate";

export interface WarehouseUtilizationInput {
  warehouseId: string;
  warehouseName: string;
  /** From computeWarehouseUtilization (Analytics Engine, Milestone 2.10) —
   *  `null` means undefined (e.g. zero capacity), and is never flagged. */
  utilizationPercent: number | null;
}

/**
 * Flags warehouses whose already-computed Utilization
 * (computeWarehouseUtilization, Milestone 2.10) is at or above the
 * WARNING/CRITICAL alert thresholds already defined for that metric
 * (WAREHOUSE_UTILIZATION_THRESHOLDS) — reused as-is, not re-derived.
 *
 * Pure — no Prisma/database access, no new calculation.
 *
 * @param warehouses - every warehouse's current utilizationPercent
 */
export function findWarehousesNearCapacity(
  warehouses: WarehouseUtilizationInput[],
): RecommendationCandidate[] {
  const candidates: RecommendationCandidate[] = [];

  for (const warehouse of warehouses) {
    if (warehouse.utilizationPercent === null) continue;

    const utilizationPercent = warehouse.utilizationPercent;
    const isCritical = utilizationPercent >= WAREHOUSE_UTILIZATION_THRESHOLDS.critical;
    const isWarning = utilizationPercent >= WAREHOUSE_UTILIZATION_THRESHOLDS.warning;
    if (!isCritical && !isWarning) continue;

    const threshold = isCritical
      ? WAREHOUSE_UTILIZATION_THRESHOLDS.critical
      : WAREHOUSE_UTILIZATION_THRESHOLDS.warning;

    candidates.push({
      category: RecommendationCategory.INVENTORY,
      severity: isCritical ? RecommendationSeverity.CRITICAL : RecommendationSeverity.WARNING,
      triggerCondition: `utilizationPercent >= ${threshold} (${isCritical ? "critical" : "warning"} threshold)`,
      supportingMetrics: {
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        threshold,
      },
      justification:
        `${warehouse.warehouseName} is at ${utilizationPercent.toFixed(1)}% capacity, ` +
        `at or above the ${threshold}% ${isCritical ? "critical" : "warning"} threshold.`,
      productId: null,
      supplierId: null,
      warehouseId: warehouse.warehouseId,
    });
  }

  return candidates;
}
