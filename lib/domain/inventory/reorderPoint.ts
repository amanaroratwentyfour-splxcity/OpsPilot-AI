/**
 * Reorder Point (ROP): the on-hand stock level that should trigger a
 * replenishment order. This is the single most important number in
 * Inventory Intelligence — the core business rule `onHandQty <= reorderPoint`
 * is what stock status classification and reorder recommendations key off.
 *
 * Formula: ROP = (avgDailyDemand x leadTimeDays) + safetyStock
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.3.
 *
 * @param avgDailyDemand - mean demand per day, from computeDemandStatistics
 * @param leadTimeDays - replenishment lead time in days (Product.leadTimeDays)
 * @param safetyStock - output of computeSafetyStock; `null` propagates to `null`.
 *   A product with unknown demand variability has an unknown reorder point —
 *   never silently substitute 0, which would imply "needs no buffer at all."
 * @returns Reorder point in units at full float precision, or `null` if
 *   `safetyStock` is `null` or the other inputs are invalid.
 */
export function computeReorderPoint(
  avgDailyDemand: number,
  leadTimeDays: number,
  safetyStock: number | null,
): number | null {
  if (safetyStock === null) {
    return null;
  }

  if (
    !Number.isFinite(avgDailyDemand) ||
    !Number.isFinite(leadTimeDays) ||
    avgDailyDemand < 0 ||
    leadTimeDays < 0
  ) {
    return null;
  }

  return avgDailyDemand * leadTimeDays + safetyStock;
}
