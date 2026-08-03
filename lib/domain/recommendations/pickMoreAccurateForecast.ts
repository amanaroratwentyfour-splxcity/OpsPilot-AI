export interface ForecastMethodOption {
  forecastSeries: number[];
  aggregateMAPE: number | null;
}

export interface AccurateForecastCandidates {
  movingAverage: ForecastMethodOption;
  exponentialSmoothing: ForecastMethodOption;
}

/**
 * Picks whichever forecast method has the lower aggregate MAPE for one
 * product, so the Recommendation Engine always reasons from the most
 * accurate forecast currently available rather than a hardcoded method.
 *
 * Not a new calculation: both aggregateMAPE values and both forecastQty
 * series already come from the Forecast Engine (computeProductForecastMetrics,
 * Milestone 2.7); this only compares two numbers that already exist.
 *
 * @returns the chosen method's series and aggregateMAPE; both empty/null if
 *   neither method has a computed aggregateMAPE for this product
 */
export function pickMoreAccurateForecast(
  candidates: AccurateForecastCandidates,
): ForecastMethodOption {
  const { movingAverage, exponentialSmoothing } = candidates;

  if (movingAverage.aggregateMAPE === null && exponentialSmoothing.aggregateMAPE === null) {
    return { forecastSeries: [], aggregateMAPE: null };
  }
  if (movingAverage.aggregateMAPE === null) {
    return exponentialSmoothing;
  }
  if (exponentialSmoothing.aggregateMAPE === null) {
    return movingAverage;
  }

  return movingAverage.aggregateMAPE <= exponentialSmoothing.aggregateMAPE
    ? movingAverage
    : exponentialSmoothing;
}
