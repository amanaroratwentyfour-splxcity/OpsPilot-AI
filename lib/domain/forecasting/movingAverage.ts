import { MOVING_AVERAGE_WINDOW } from "../config";

/**
 * Moving Average forecast: the mean of the `window` periods immediately
 * preceding `targetIndex`.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.9.
 *
 * Deliberately never looks at `series[targetIndex]` itself (or anything at
 * or beyond it) — a forecast that peeked at the value it's predicting
 * wouldn't be a forecast. This is a correction from `prisma/seed.ts`'s
 * original one-off version, which fell back to `series[targetIndex] ?? 0`
 * when there was no prior history; that was an acceptable shortcut for
 * generating plausible demo data, but not for a reusable forecasting
 * function — this version returns `null` instead, so "no prior data to
 * forecast from" is never silently confused with "forecast is 0."
 *
 * @param series - historical quantities in chronological order (oldest first)
 * @param targetIndex - the index being forecast; valid range is
 *   `1 <= targetIndex <= series.length` (`series.length` itself means
 *   "forecast the next period beyond all known history")
 * @param window - how many preceding periods to average; defaults to
 *   MOVING_AVERAGE_WINDOW
 * @returns the forecasted quantity, or `null` if `targetIndex`/`window` are
 *   out of range
 */
export function movingAverageForecast(
  series: number[],
  targetIndex: number,
  window: number = MOVING_AVERAGE_WINDOW,
): number | null {
  if (!Number.isInteger(targetIndex) || targetIndex <= 0 || targetIndex > series.length) {
    return null;
  }
  if (!Number.isInteger(window) || window <= 0) {
    return null;
  }

  const start = Math.max(0, targetIndex - window);
  const precedingPeriods = series.slice(start, targetIndex);

  if (precedingPeriods.length === 0) {
    return null;
  }

  return precedingPeriods.reduce((sum, value) => sum + value, 0) / precedingPeriods.length;
}
