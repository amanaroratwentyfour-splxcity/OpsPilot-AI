import { prisma } from "@/lib/db/prisma";
import { computeAggregateMAPE } from "@/lib/domain/forecasting/accuracy";

/**
 * Demand Forecasting page data for one product: reads the persisted
 * Forecast rows (written by recalculateForecastsForProduct — both methods,
 * backtest periods with known actuals) joined against DemandHistory for
 * the actual figure at each period. Aggregate MAPE is recomputed from the
 * persisted per-row `mape` values via computeAggregateMAPE (reused, not
 * re-derived) rather than trusting a stale precomputed aggregate, since no
 * such aggregate is itself persisted anywhere.
 */
export async function getForecastData(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sku: true, name: true, category: true },
  });
  if (!product) return null;

  const [forecasts, demandHistory] = await Promise.all([
    prisma.forecast.findMany({
      where: { productId },
      orderBy: { periodDate: "asc" },
      select: { method: true, periodDate: true, forecastQty: true, mape: true },
    }),
    prisma.demandHistory.findMany({
      where: { productId },
      orderBy: { periodDate: "asc" },
      select: { periodDate: true, quantitySold: true },
    }),
  ]);

  const actualByPeriod = new Map(demandHistory.map((d) => [d.periodDate.getTime(), d.quantitySold]));

  const periodMap = new Map<
    number,
    { periodDate: Date; actual: number | null; movingAverage: number | null; exponentialSmoothing: number | null }
  >();
  for (const forecast of forecasts) {
    const key = forecast.periodDate.getTime();
    const entry = periodMap.get(key) ?? {
      periodDate: forecast.periodDate,
      actual: actualByPeriod.get(key) ?? null,
      movingAverage: null,
      exponentialSmoothing: null,
    };
    if (forecast.method === "MOVING_AVERAGE") {
      entry.movingAverage = forecast.forecastQty;
    } else {
      entry.exponentialSmoothing = forecast.forecastQty;
    }
    periodMap.set(key, entry);
  }

  const series = Array.from(periodMap.values()).sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());

  const maPairs = forecasts
    .filter((f) => f.method === "MOVING_AVERAGE" && f.mape !== null)
    .map((f) => ({ actual: actualByPeriod.get(f.periodDate.getTime()) ?? 0, forecast: f.forecastQty }));
  const esPairs = forecasts
    .filter((f) => f.method === "EXPONENTIAL_SMOOTHING" && f.mape !== null)
    .map((f) => ({ actual: actualByPeriod.get(f.periodDate.getTime()) ?? 0, forecast: f.forecastQty }));

  return {
    product,
    series,
    aggregateMAPE: {
      movingAverage: computeAggregateMAPE(maPairs),
      exponentialSmoothing: computeAggregateMAPE(esPairs),
    },
    hasForecastData: forecasts.length > 0,
  };
}

/**
 * Company-wide Forecasting page data for the AI Forecast Summary: the
 * average of every product's already-persisted per-period `mape` value
 * (Forecast.mape, written by recalculateForecastsForProduct), grouped by
 * method — a plain SQL average over an existing column, no new formula —
 * plus the already-persisted DEMAND-category AIRecommendation rows
 * (findDemandIncreaseCandidates' output) as "products requiring attention,"
 * the same reuse pattern Procurement/Suppliers use for their own
 * page-wide AI insight input.
 */
export async function getForecastingOverview() {
  const [movingAverageAvg, exponentialSmoothingAvg, demandIncreaseRecommendations] = await Promise.all([
    prisma.forecast.aggregate({ where: { method: "MOVING_AVERAGE", mape: { not: null } }, _avg: { mape: true } }),
    prisma.forecast.aggregate({ where: { method: "EXPONENTIAL_SMOOTHING", mape: { not: null } }, _avg: { mape: true } }),
    prisma.aIRecommendation.findMany({
      where: { category: "DEMAND", status: "ACTIVE" },
      select: { metricJustification: true, product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    movingAverageAggregateMAPE: movingAverageAvg._avg.mape,
    exponentialSmoothingAggregateMAPE: exponentialSmoothingAvg._avg.mape,
    productsRequiringAttention: demandIncreaseRecommendations.map((r) => ({
      productName: r.product?.name ?? null,
      justification: r.metricJustification,
    })),
  };
}
