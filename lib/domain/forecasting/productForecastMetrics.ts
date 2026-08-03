import { movingAverageForecast } from "./movingAverage";
import { exponentialSmoothingForecast } from "./exponentialSmoothing";
import { computeMAPE, computeAggregateMAPE } from "./accuracy";

export interface ForecastPoint {
  targetIndex: number;
  /** The known actual for this period, or `null` if `targetIndex` is
   *  beyond the end of `series` (a genuine future forecast, not a backtest). */
  actual: number | null;
  movingAverageForecast: number | null;
  movingAverageMAPE: number | null;
  exponentialSmoothingForecast: number | null;
  exponentialSmoothingMAPE: number | null;
}

/**
 * A single typed bundle of every Forecast Engine metric computed for one
 * product, across a set of target periods.
 */
export interface ProductForecastMetrics {
  productId: string;
  points: ForecastPoint[];
  movingAverageAggregateMAPE: number | null;
  exponentialSmoothingAggregateMAPE: number | null;
}

/**
 * Composes the Forecast Engine's pure calculation functions —
 * movingAverageForecast, exponentialSmoothingForecast, computeMAPE,
 * computeAggregateMAPE — into a single typed result for one product across
 * a set of target periods. Contains no formulas of its own: every number
 * in the returned object is produced by one of those four already-tested
 * functions.
 *
 * Pure — no Prisma/database access. This is the layer
 * recalculateForecastsForProduct (recalculate.ts) delegates to.
 *
 * `targetIndices` is caller-supplied rather than assumed, so this function
 * works equally for backtesting (indices within `series`, where MAPE can
 * be computed against a known actual) and genuine forward forecasting
 * (`targetIndex === series.length`, where `actual` is `null` and so is
 * MAPE) — the recalculation orchestrator decides which periods to ask for.
 *
 * @param productId
 * @param series - the product's historical weekly demand, in chronological
 *   order (oldest first) — order matters here, unlike computeDemandStatistics
 * @param targetIndices - which periods to forecast
 */
export function computeProductForecastMetrics(
  productId: string,
  series: number[],
  targetIndices: number[],
): ProductForecastMetrics {
  const points: ForecastPoint[] = targetIndices.map((targetIndex) => {
    const actual = targetIndex >= 0 && targetIndex < series.length ? series[targetIndex] : null;
    const maForecast = movingAverageForecast(series, targetIndex);
    const esForecast = exponentialSmoothingForecast(series, targetIndex);

    return {
      targetIndex,
      actual,
      movingAverageForecast: maForecast,
      movingAverageMAPE:
        actual !== null && maForecast !== null ? computeMAPE(actual, maForecast) : null,
      exponentialSmoothingForecast: esForecast,
      exponentialSmoothingMAPE:
        actual !== null && esForecast !== null ? computeMAPE(actual, esForecast) : null,
    };
  });

  const movingAverageAggregateMAPE = computeAggregateMAPE(
    points
      .filter((point) => point.actual !== null && point.movingAverageForecast !== null)
      .map((point) => ({ actual: point.actual!, forecast: point.movingAverageForecast! })),
  );

  const exponentialSmoothingAggregateMAPE = computeAggregateMAPE(
    points
      .filter((point) => point.actual !== null && point.exponentialSmoothingForecast !== null)
      .map((point) => ({ actual: point.actual!, forecast: point.exponentialSmoothingForecast! })),
  );

  return { productId, points, movingAverageAggregateMAPE, exponentialSmoothingAggregateMAPE };
}
