import type { Prisma } from "@/lib/generated/prisma/client";
import { ForecastMethod } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db/prisma";
import { FORECAST_BACKTEST_WEEKS } from "../config";
import {
  computeProductForecastMetrics,
  type ProductForecastMetrics,
} from "./productForecastMetrics";

/** Accepts either the shared Prisma singleton or a transaction client. */
type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Recalculates and persists Forecast rows for one product's trailing
 * FORECAST_BACKTEST_WEEKS periods (a backtest: every target period here has
 * a known actual, so MAPE can be computed).
 *
 * Pure I/O plus composition — no formulas live here (see
 * productForecastMetrics.ts and its component files). Fetches this
 * product's demand history once, hands it to computeProductForecastMetrics,
 * and writes the result back.
 *
 * Writes via delete-then-recreate for the periods being recalculated,
 * rather than per-row upsert: simpler and just as correct for a full
 * recompute, and avoids ~24 sequential upserts per product (2 methods x 12
 * weeks) in favor of 2 queries.
 *
 * @param productId
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton, so tests can run this inside a transaction that's rolled
 *   back afterward with zero persistent side effects.
 */
export async function recalculateForecastsForProduct(
  productId: string,
  db: Db = prisma,
): Promise<ProductForecastMetrics> {
  const demandHistory = await db.demandHistory.findMany({
    where: { productId },
    orderBy: { periodDate: "asc" },
    select: { periodDate: true, quantitySold: true },
  });

  const series = demandHistory.map((entry) => entry.quantitySold);

  const backtestStart = Math.max(1, series.length - FORECAST_BACKTEST_WEEKS);
  const targetIndices: number[] = [];
  for (let index = backtestStart; index < series.length; index++) {
    targetIndices.push(index);
  }

  const metrics = computeProductForecastMetrics(productId, series, targetIndices);

  const periodDates = targetIndices.map((index) => demandHistory[index].periodDate);
  if (periodDates.length > 0) {
    await db.forecast.deleteMany({
      where: { productId, periodDate: { in: periodDates } },
    });
  }

  const rows = metrics.points.flatMap((point) => {
    const periodDate = demandHistory[point.targetIndex].periodDate;
    const rowsForPoint: {
      productId: string;
      method: ForecastMethod;
      periodDate: Date;
      forecastQty: number;
      mape: number | null;
    }[] = [];

    if (point.movingAverageForecast !== null) {
      rowsForPoint.push({
        productId,
        method: ForecastMethod.MOVING_AVERAGE,
        periodDate,
        forecastQty: point.movingAverageForecast,
        mape: point.movingAverageMAPE,
      });
    }
    if (point.exponentialSmoothingForecast !== null) {
      rowsForPoint.push({
        productId,
        method: ForecastMethod.EXPONENTIAL_SMOOTHING,
        periodDate,
        forecastQty: point.exponentialSmoothingForecast,
        mape: point.exponentialSmoothingMAPE,
      });
    }

    return rowsForPoint;
  });

  if (rows.length > 0) {
    await db.forecast.createMany({ data: rows });
  }

  return metrics;
}

export interface RecalculateAllForecastsResult {
  productsProcessed: number;
  forecastRowsWritten: number;
}

/**
 * Runs recalculateForecastsForProduct for every product in the catalog,
 * sequentially (see Milestone 2.3's recalculateAllInventory for the same
 * SQLite single-writer rationale).
 */
export async function recalculateAllForecasts(
  db: Db = prisma,
): Promise<RecalculateAllForecastsResult> {
  const products = await db.product.findMany({ select: { id: true } });
  let forecastRowsWritten = 0;

  for (const { id } of products) {
    const metrics = await recalculateForecastsForProduct(id, db);
    forecastRowsWritten += metrics.points.reduce((count, point) => {
      const hasMA = point.movingAverageForecast !== null ? 1 : 0;
      const hasES = point.exponentialSmoothingForecast !== null ? 1 : 0;
      return count + hasMA + hasES;
    }, 0);
  }

  return { productsProcessed: products.length, forecastRowsWritten };
}
