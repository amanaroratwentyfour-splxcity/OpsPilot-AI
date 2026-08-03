import { SMOOTHING_ALPHA } from "../config";

/**
 * Exponential Smoothing forecast: a weighted average of all preceding
 * periods that decays geometrically, so recent periods count more than
 * older ones — the weighting rate is controlled by `alpha`.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.9.
 *
 * Seeds the smoothed level with `series[0]` (the earliest known actual —
 * legitimately "prior" data for any `targetIndex >= 1`), then folds in
 * `series[1..targetIndex-1]` one period at a time. Like
 * movingAverageForecast, this never reads `series[targetIndex]` or beyond.
 *
 * @param series - historical quantities in chronological order (oldest first)
 * @param targetIndex - the index being forecast; valid range is
 *   `1 <= targetIndex <= series.length` (`series.length` itself means
 *   "forecast the next period beyond all known history")
 * @param alpha - smoothing factor in (0, 1]; defaults to SMOOTHING_ALPHA
 * @returns the forecasted quantity, or `null` if `targetIndex`/`alpha` are
 *   out of range, or there's no prior data at all (`targetIndex` would
 *   need at least `series[0]` to seed the level)
 */
export function exponentialSmoothingForecast(
  series: number[],
  targetIndex: number,
  alpha: number = SMOOTHING_ALPHA,
): number | null {
  if (!Number.isInteger(targetIndex) || targetIndex <= 0 || targetIndex > series.length) {
    return null;
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha > 1) {
    return null;
  }
  if (series.length === 0) {
    return null;
  }

  let level = series[0];
  for (let t = 1; t < targetIndex; t++) {
    level = alpha * series[t] + (1 - alpha) * level;
  }

  return level;
}
