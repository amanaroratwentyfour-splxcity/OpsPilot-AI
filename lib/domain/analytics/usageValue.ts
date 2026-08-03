/**
 * Annual usage value for one product: `annualDemand x unitCost`.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.5. This is the per-product input ABC
 * Analysis ranks the whole catalog by — deliberately kept as its own pure,
 * single-purpose function even though it's a one-line multiplication, so
 * it's independently testable and the batch classification layer
 * (abcClassification.ts) never needs to know how a usage value was derived.
 *
 * Cost-based (not price-based): ABC Analysis here is an inventory
 * investment lens ("how much capital does this SKU tie up"), not a revenue
 * lens. Chosen deliberately per OPERATIONS_ENGINE_SPEC.md §4.5's Business
 * Rules — don't silently swap in `unitPrice` later without treating that as
 * a different metric.
 *
 * @param annualDemand - from computeAnnualDemand (lib/domain/procurement) —
 *   reused, not recomputed, since the trailing-52-week convention is
 *   already defined and tested there
 * @param unitCost - Product.unitCost
 * @returns the usage value, or `null` if either input is negative or non-finite
 */
export function computeUsageValue(annualDemand: number, unitCost: number): number | null {
  if (
    !Number.isFinite(annualDemand) ||
    !Number.isFinite(unitCost) ||
    annualDemand < 0 ||
    unitCost < 0
  ) {
    return null;
  }

  return annualDemand * unitCost;
}
