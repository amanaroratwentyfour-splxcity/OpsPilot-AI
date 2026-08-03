/**
 * Inventory Turnover: how many times inventory investment "turns over"
 * (is sold and replenished) per year.
 *
 * Formula: Turnover = COGS / AverageInventoryValue
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.6.
 *
 * `cogs` and `averageInventoryValue` are pre-aggregated by the caller —
 * typically `cogs` is a sum of computeUsageValue (ABC Analysis) across
 * products in scope, and `averageInventoryValue` a sum of
 * computeInventoryValue across Inventory rows in scope (see
 * companyAnalytics.ts). This function is just the ratio.
 *
 * Per the spec's documented approximation: `averageInventoryValue` here is
 * expected to be *current* inventory value, standing in for a true period
 * average — no historical stock snapshot mechanism exists to compute the
 * latter (a documented, accepted limitation, not something this function
 * can fix).
 *
 * @returns the turnover ratio, or `null` if `averageInventoryValue` is 0
 *   (undefined, not infinite) or either input is negative/non-finite
 */
export function computeInventoryTurnover(
  cogs: number,
  averageInventoryValue: number,
): number | null {
  if (
    !Number.isFinite(cogs) ||
    !Number.isFinite(averageInventoryValue) ||
    cogs < 0 ||
    averageInventoryValue < 0
  ) {
    return null;
  }

  if (averageInventoryValue === 0) {
    return null;
  }

  return cogs / averageInventoryValue;
}
