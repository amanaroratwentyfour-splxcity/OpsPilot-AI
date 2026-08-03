/**
 * Annual demand, using the trailing-52-week convention from
 * OPERATIONS_ENGINE_SPEC.md §3. Shared by EOQ (§4.4) and, per the approved
 * implementation plan, later reused by ABC Analysis (§4.5, Milestone 2.10)
 * and Inventory Turnover (§4.6, Milestone 2.11) — every metric needing an
 * "annual" figure from weekly data uses this same function, so the
 * trailing-window rule is defined exactly once.
 */

const TRAILING_WEEKS = 52;

export interface AnnualDemandResult {
  annualDemand: number;
  /** `true` when there was less than a full year of history to sum, and the
   *  result was scaled up from a partial window — a less certain figure. */
  isExtrapolated: boolean;
}

/**
 * Computes annual demand from a weekly demand series.
 *
 * IMPORTANT — unlike computeDemandStatistics (Milestone 2.1), which is
 * order-independent, this function requires `weeklyQuantities` to be in
 * chronological order, oldest first / most recent last (e.g. DemandHistory
 * rows sorted by periodDate ascending). "Trailing" only means anything if
 * the order is known.
 *
 * - >= 52 weeks available: sums exactly the most recent 52 weeks (any
 *   additional older history is ignored, not just capped).
 * - 1-51 weeks available (a newer product): sums whatever is available and
 *   scales it up to a full year — `annualDemand = sum(available) x (52 / weeksAvailable)`,
 *   with `isExtrapolated: true` so callers/UI can flag the figure as less certain.
 * - 0 weeks available: `annualDemand = 0`, not extrapolated (there is
 *   nothing to extrapolate from).
 *
 * @param weeklyQuantities - weekly demand totals in chronological order
 */
export function computeAnnualDemand(weeklyQuantities: number[]): AnnualDemandResult {
  if (weeklyQuantities.length === 0) {
    return { annualDemand: 0, isExtrapolated: false };
  }

  if (weeklyQuantities.length >= TRAILING_WEEKS) {
    const trailing = weeklyQuantities.slice(-TRAILING_WEEKS);
    return { annualDemand: sum(trailing), isExtrapolated: false };
  }

  const observedSum = sum(weeklyQuantities);
  const annualDemand = observedSum * (TRAILING_WEEKS / weeklyQuantities.length);
  return { annualDemand, isExtrapolated: true };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
