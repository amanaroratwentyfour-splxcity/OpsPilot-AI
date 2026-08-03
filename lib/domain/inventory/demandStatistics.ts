/**
 * Demand statistics derived from a product's weekly demand history.
 *
 * Pure function — no Prisma/database access. Callers are responsible for
 * fetching DemandHistory.quantitySold values (in any order; order does not
 * affect mean or standard deviation) and passing them in.
 *
 * Feeds Safety Stock (§4.2) and Reorder Point (§4.3) in
 * OPERATIONS_ENGINE_SPEC.md.
 */

export interface DemandStatistics {
  /** Mean demand per day, derived from weekly totals (weeklyQty / 7). */
  avgDailyDemand: number;
  /** Population standard deviation of daily demand. */
  stdDevDaily: number;
}

/**
 * Computes average daily demand and its standard deviation from a series
 * of weekly demand quantities.
 *
 * Returns `null` when fewer than 2 weeks of history are available — a
 * standard deviation is undefined for 0 or 1 data points, and returning
 * `0` in that case would misrepresent "unknown variability" as "zero
 * variability" (OPERATIONS_ENGINE_SPEC.md §4.2, Edge Cases).
 *
 * Uses population variance (divide by n, not n-1): the weekly history
 * passed in *is* the full observed record for that product, not a sample
 * drawn from a larger population.
 *
 * @param weeklyQuantities - weekly demand totals, e.g. DemandHistory.quantitySold
 */
export function computeDemandStatistics(weeklyQuantities: number[]): DemandStatistics | null {
  if (weeklyQuantities.length < 2) {
    return null;
  }

  const dailyQuantities = weeklyQuantities.map((weeklyQty) => weeklyQty / 7);
  const avgDailyDemand = mean(dailyQuantities);
  const variance = mean(dailyQuantities.map((qty) => (qty - avgDailyDemand) ** 2));
  const stdDevDaily = Math.sqrt(variance);

  return { avgDailyDemand, stdDevDaily };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
