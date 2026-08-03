import { TARGET_TURNOVER_RATE } from "../config";

/**
 * Normalizes a raw Inventory Turnover ratio into a 0-100 "health" score,
 * relative to a target turnover rate — the input Operations Health Score
 * (§4.10) needs, since raw turnover has no natural 0-100 scale of its own.
 *
 * Formula: score = min(100, (turnover / target) x 100)
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.10.
 *
 * @param turnover - computeInventoryTurnover's output
 * @param targetTurnoverRate - benchmark turns/year; defaults to TARGET_TURNOVER_RATE
 * @returns a score in [0, 100], or `null` if either input is invalid
 */
export function computeTurnoverHealth(
  turnover: number,
  targetTurnoverRate: number = TARGET_TURNOVER_RATE,
): number | null {
  if (
    !Number.isFinite(turnover) ||
    !Number.isFinite(targetTurnoverRate) ||
    turnover < 0 ||
    targetTurnoverRate <= 0
  ) {
    return null;
  }

  return Math.min(100, (turnover / targetTurnoverRate) * 100);
}
