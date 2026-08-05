import { formatPercent } from "@/lib/format";

/**
 * Deterministic company-wide Forecasting text, same discipline as
 * procurementInsights.ts/supplierInsights.ts — "overall performance" and
 * "which method performs better" are directly computable from the two
 * aggregate MAPE figures, so only "suggested actions" needs an AI call.
 */

export interface ForecastingDeterministicInsight {
  summary: string;
  insight: string;
}

export function buildForecastingInsight(overview: {
  movingAverageAggregateMAPE: number | null;
  exponentialSmoothingAggregateMAPE: number | null;
  productsRequiringAttention: { productName: string | null; justification: string }[];
}): ForecastingDeterministicInsight {
  const maAccuracy = overview.movingAverageAggregateMAPE !== null ? 100 - overview.movingAverageAggregateMAPE : null;
  const esAccuracy =
    overview.exponentialSmoothingAggregateMAPE !== null ? 100 - overview.exponentialSmoothingAggregateMAPE : null;

  let summary: string;
  if (maAccuracy === null && esAccuracy === null) {
    summary = "No forecast accuracy data available yet company-wide.";
  } else if (maAccuracy === null) {
    summary = `Exponential Smoothing accuracy is ${formatPercent(esAccuracy)} company-wide; Moving Average has no data yet.`;
  } else if (esAccuracy === null) {
    summary = `Moving Average accuracy is ${formatPercent(maAccuracy)} company-wide; Exponential Smoothing has no data yet.`;
  } else {
    const better = maAccuracy >= esAccuracy ? "Moving Average" : "Exponential Smoothing";
    summary = `${better} currently performs better company-wide, Moving Average ${formatPercent(maAccuracy)} vs. Exponential Smoothing ${formatPercent(esAccuracy)}.`;
  }

  const insight =
    overview.productsRequiringAttention.length === 0
      ? "No products currently show a trusted, rising demand pattern requiring attention."
      : `${overview.productsRequiringAttention.length} product(s) show a trusted, rising demand pattern requiring attention. Most notable: ${overview.productsRequiringAttention[0].justification}`;

  return { summary, insight };
}
