/**
 * Supplier Reliability Score: equal-weighted average of the three
 * currently-implementable components (On-Time Delivery Rate, Lead Time
 * Consistency, Price Stability).
 *
 * The fourth component from the target formula, Order Accuracy Rate, is
 * excluded — `PurchaseOrderItem.receivedQuantity` doesn't exist and the
 * schema is frozen (OPERATIONS_ENGINE_SPEC.md §4.8, Schema Gap). Each of
 * the three available components is re-weighted from 25% to 33.3%, per the
 * spec's explicit instruction for this situation.
 *
 * Callers are responsible for only invoking this once all three inputs are
 * known to be non-null (see supplierMetrics.ts) — this function assumes
 * valid numeric inputs and does not itself handle missing data.
 */
export function computeSupplierReliabilityScore(
  onTimeDeliveryRate: number,
  leadTimeConsistency: number,
  priceStability: number,
): number {
  return (onTimeDeliveryRate + leadTimeConsistency + priceStability) / 3;
}
