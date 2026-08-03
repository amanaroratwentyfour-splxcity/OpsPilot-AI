import { SERVICE_LEVEL_Z } from "../config";

/**
 * Safety Stock: buffer inventory held to absorb demand variability during
 * the replenishment lead time.
 *
 * Formula: SS = Z x stdDevDaily x sqrt(leadTimeDays)
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.2. Assumes demand is approximately
 * normally distributed and lead time is deterministic (no lead-time
 * variance term) — both are documented assumptions in the spec, not
 * implementation shortcuts.
 *
 * @param stdDevDaily - standard deviation of daily demand, from computeDemandStatistics
 * @param leadTimeDays - replenishment lead time in days (Product.leadTimeDays)
 * @param z - service level factor; defaults to SERVICE_LEVEL_Z (~95% service level)
 * @returns Safety stock in units at full float precision (do not round before
 *   storing — see OPERATIONS_ENGINE_SPEC.md §3 on rounding), or `null` if the
 *   inputs are invalid (negative or non-finite lead time / standard deviation).
 */
export function computeSafetyStock(
  stdDevDaily: number,
  leadTimeDays: number,
  z: number = SERVICE_LEVEL_Z,
): number | null {
  if (
    !Number.isFinite(stdDevDaily) ||
    !Number.isFinite(leadTimeDays) ||
    stdDevDaily < 0 ||
    leadTimeDays < 0
  ) {
    return null;
  }

  return z * stdDevDaily * Math.sqrt(leadTimeDays);
}
