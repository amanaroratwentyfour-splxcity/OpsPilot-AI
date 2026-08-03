import { StockStatus } from "@/lib/generated/prisma/enums";

/**
 * Classifies an Inventory position's on-hand stock relative to its reorder
 * point into one of the four StockStatus bands.
 *
 * OPERATIONS_ENGINE_SPEC.md §4.3 requires this classification to derive
 * from the same reorder point that computeInventoryHealthScore (healthScore.ts)
 * uses, so the two stay conceptually consistent. Nothing in the spec pins
 * StockStatus to exact numeric thresholds — the seed script only ever
 * generated on-hand quantities *from* a chosen status, never classified a
 * quantity *to* one — so the boundaries below are a deliberate design
 * decision, chosen to align with Inventory Health Score's own anchor points:
 *   - CRITICAL / LOW splits at ratio = 1.0 (the reorder point itself),
 *     matching the core business rule `onHandQty <= reorderPoint` exactly
 *     (DATA_DICTIONARY.md §7, rule 4).
 *   - LOW / HEALTHY splits at ratio = 1.3 — the point where
 *     computeInventoryHealthScore first crosses ~70/100, i.e. "meaningfully
 *     healthy," not just "technically past the reorder point."
 *   - HEALTHY / OVERSTOCKED splits at ratio = 4.0 — the exact ratio where
 *     computeInventoryHealthScore's formula switches from its declining
 *     "past the ideal" band into its floored "deep overstock" band.
 *
 * @param onHandQty - Inventory.onHandQty
 * @param reorderPoint - Inventory.reorderPoint; `null` (unknown — see
 *   reorderPoint.ts) or non-positive both make the ratio undefined
 * @returns a StockStatus, or `null` if reorderPoint is null/non-positive,
 *   onHandQty is negative, or any input is non-finite
 */
export function classifyStockStatus(
  onHandQty: number,
  reorderPoint: number | null,
): StockStatus | null {
  if (
    reorderPoint === null ||
    !Number.isFinite(onHandQty) ||
    !Number.isFinite(reorderPoint) ||
    reorderPoint <= 0 ||
    onHandQty < 0
  ) {
    return null;
  }

  const ratio = onHandQty / reorderPoint;

  if (ratio <= 1.0) return StockStatus.CRITICAL;
  if (ratio <= 1.3) return StockStatus.LOW;
  if (ratio <= 4.0) return StockStatus.HEALTHY;
  return StockStatus.OVERSTOCKED;
}
