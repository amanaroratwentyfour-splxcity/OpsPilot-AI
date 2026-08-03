/**
 * Mean Absolute Percentage Error for a single forecasted period.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.9.
 *
 * @returns a percentage (>= 0), or `null` when `actual` is 0 (division by
 *   zero is undefined, not infinite) — matches `Forecast.mape`'s nullable
 *   column and the same "unknown, not zero" convention used throughout
 *   this domain layer.
 */
export function computeMAPE(actual: number, forecast: number): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(forecast) || actual === 0) {
    return null;
  }

  return (Math.abs(actual - forecast) / Math.abs(actual)) * 100;
}

export interface ForecastAccuracyPair {
  actual: number;
  forecast: number;
}

/**
 * Aggregate (mean) MAPE across multiple forecasted periods.
 *
 * Periods where `computeMAPE` returns `null` (actual = 0) are excluded
 * from both the sum and the count — never coerced to 0, which would
 * silently understate the error (OPERATIONS_ENGINE_SPEC.md §4.9, Business
 * Rules).
 *
 * @returns the mean MAPE across periods with a defined value, or `null` if
 *   no period had one (e.g. every actual was 0, or the input was empty)
 */
export function computeAggregateMAPE(pairs: ForecastAccuracyPair[]): number | null {
  const values = pairs
    .map((pair) => computeMAPE(pair.actual, pair.forecast))
    .filter((mape): mape is number => mape !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
