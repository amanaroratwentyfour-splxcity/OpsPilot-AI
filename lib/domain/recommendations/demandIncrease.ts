import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma/enums";
import { DEMAND_INCREASE_THRESHOLD_PERCENT, MAX_TRUSTED_FORECAST_MAPE } from "../config";
import type { RecommendationCandidate } from "./recommendationCandidate";

export interface DemandTrendInput {
  productId: string;
  productName: string;
  /** forecastQty values from ProductForecastMetrics.points (Forecast
   *  Engine, Milestone 2.7) for one method, in chronological order
   *  (earliest first). Not recomputed here — these are read directly from
   *  an already-run forecast. */
  forecastSeries: number[];
  /** The matching aggregate MAPE (movingAverageAggregateMAPE or
   *  exponentialSmoothingAggregateMAPE) for the same method/series. */
  aggregateMAPE: number | null;
}

export interface DemandIncreaseOptions {
  minIncreasePercent?: number;
  maxTrustedMAPE?: number;
}

/**
 * Flags products whose forecasted demand has risen meaningfully across an
 * already-computed forecast series, gated by forecast trust: a product is
 * only flagged if its aggregate MAPE (computeAggregateMAPE, Milestone 2.7)
 * is at or below MAX_TRUSTED_FORECAST_MAPE, per OPERATIONS_ENGINE_SPEC.md
 * §4.9's guidance that low-accuracy forecasts shouldn't drive downstream
 * recommendations.
 *
 * Compares only the earliest and latest points of the supplied series — a
 * plain relative-change threshold over numbers the Forecast Engine already
 * produced, not a new seasonal or trend-detection formula. This is a
 * deliberately different (and simpler) signal than the ad-hoc seasonal
 * lookahead the Milestone 1.3 seed script used to generate its example
 * AIRecommendation rows: that logic lived only in the seed script, was
 * never built as a reusable Forecast Engine capability, and reproducing it
 * here would mean inventing a new calculation rather than reusing one.
 *
 * Pure — no Prisma/database access, no new forecasting formula.
 *
 * @param products - each product's forecast series and matching aggregate MAPE
 * @param options - overrides for the default config thresholds (tests use this)
 */
export function findDemandIncreaseCandidates(
  products: DemandTrendInput[],
  options: DemandIncreaseOptions = {},
): RecommendationCandidate[] {
  const minIncreasePercent = options.minIncreasePercent ?? DEMAND_INCREASE_THRESHOLD_PERCENT;
  const maxTrustedMAPE = options.maxTrustedMAPE ?? MAX_TRUSTED_FORECAST_MAPE;

  const candidates: RecommendationCandidate[] = [];

  for (const product of products) {
    if (product.forecastSeries.length < 2) continue;
    if (product.aggregateMAPE === null || product.aggregateMAPE > maxTrustedMAPE) continue;

    const earliest = product.forecastSeries[0];
    const latest = product.forecastSeries[product.forecastSeries.length - 1];
    if (!(earliest > 0)) continue;

    const increasePercent = ((latest - earliest) / earliest) * 100;
    if (increasePercent < minIncreasePercent) continue;

    candidates.push({
      category: RecommendationCategory.DEMAND,
      severity: RecommendationSeverity.INFO,
      triggerCondition: `forecast increase >= ${minIncreasePercent}% AND aggregateMAPE <= ${maxTrustedMAPE}`,
      supportingMetrics: {
        earliestForecastQty: Math.round(earliest * 100) / 100,
        latestForecastQty: Math.round(latest * 100) / 100,
        increasePercent: Math.round(increasePercent * 10) / 10,
        aggregateMAPE: Math.round(product.aggregateMAPE * 10) / 10,
      },
      justification:
        `${product.productName}'s forecasted demand has risen about ${increasePercent.toFixed(0)}% ` +
        `(from ${earliest.toFixed(0)} to ${latest.toFixed(0)} units) on a trusted forecast ` +
        `(MAPE ${product.aggregateMAPE.toFixed(1)}%).`,
      productId: product.productId,
      supplierId: null,
      warehouseId: null,
    });
  }

  return candidates;
}
