/**
 * Inventory Health Score: a single 0-100 composite score summarizing how
 * healthy one product's stock position is at one warehouse.
 *
 * This is NOT a textbook OM formula (unlike Safety Stock/Reorder Point) —
 * it's a composite score designed for this product's UX, and its anchor
 * points are intentionally tunable. It peaks at 100 when on-hand stock sits
 * at 2.3x the reorder point (the midpoint of the "Healthy" band), and
 * penalizes both directions: understock more steeply than overstock, since
 * a stockout is the costlier failure mode for FMCG. Overstock is floored at
 * 20, not 0 — excess stock is always preferable to none.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.1 for the full piecewise formula and the
 * reasoning behind each band boundary.
 *
 * @param onHandQty - Inventory.onHandQty
 * @param reorderPoint - Inventory.reorderPoint; `null` (unknown — see
 *   reorderPoint.ts) or non-positive both make the ratio undefined
 * @returns a score in [0, 100], or `null` if reorderPoint is null/non-positive,
 *   onHandQty is negative, or any input is non-finite
 */
export function computeInventoryHealthScore(
  onHandQty: number,
  reorderPoint: number | null,
): number | null {
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

  if (ratio <= 0) return 0;
  if (ratio < 1) return ratio * 60;
  if (ratio <= 2.3) return 60 + ((ratio - 1) / 1.3) * 40;
  if (ratio <= 4) return 100 - ((ratio - 2.3) / 1.7) * 30;
  return Math.max(20, 70 - (ratio - 4) * 5);
}
