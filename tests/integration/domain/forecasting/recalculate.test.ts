import { describe, expect, it } from "vitest";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  recalculateAllForecasts,
  recalculateForecastsForProduct,
} from "@/lib/domain/forecasting/recalculate";

/**
 * Integration tests against the real seeded database (prisma/dev.db).
 *
 * Every test runs inside a Prisma interactive transaction and always
 * throws at the end to force a rollback — real reads and real writes are
 * exercised, but nothing persists. See Milestone 2.3's
 * tests/integration/domain/inventory/recalculate.test.ts for the same
 * pattern and its independent verification.
 */

class RollbackForTest extends Error {}

async function runInRolledBackTransaction(fn: (tx: Prisma.TransactionClient) => Promise<void>) {
  await expect(
    prisma.$transaction(
      async (tx) => {
        await fn(tx);
        throw new RollbackForTest();
      },
      { timeout: 60000 },
    ),
  ).rejects.toThrow(RollbackForTest);
}

describe("recalculateForecastsForProduct (integration)", () => {
  it("recomputes and persists 12 weeks x 2 methods of forecasts for a real seeded product", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { sku: "DAI-0001" } });

      const metrics = await recalculateForecastsForProduct(product.id, tx);

      expect(metrics.points).toHaveLength(12);
      expect(metrics.movingAverageAggregateMAPE).not.toBeNull();
      expect(metrics.exponentialSmoothingAggregateMAPE).not.toBeNull();
      // Sanity bound: this dataset's demand is smooth/seasonal, not
      // shock-driven, so forecast error should be modest, not enormous.
      expect(metrics.movingAverageAggregateMAPE!).toBeLessThan(50);
      expect(metrics.exponentialSmoothingAggregateMAPE!).toBeLessThan(50);

      // Confirm the write actually happened (read-your-own-writes within
      // the transaction), not just that the in-memory metrics look right.
      const persisted = await tx.forecast.findMany({ where: { productId: product.id } });
      expect(persisted).toHaveLength(24); // 12 periods x 2 methods

      for (const point of metrics.points) {
        const maRowForPoint = persisted.find(
          (row) =>
            row.method === "MOVING_AVERAGE" && row.forecastQty === point.movingAverageForecast,
        );
        expect(maRowForPoint).toBeDefined();
      }
    });
  });

  it("is idempotent: recalculating twice does not duplicate rows", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { sku: "BEV-0001" } });

      await recalculateForecastsForProduct(product.id, tx);
      await recalculateForecastsForProduct(product.id, tx);

      const persisted = await tx.forecast.findMany({ where: { productId: product.id } });
      expect(persisted).toHaveLength(24);
    });
  });

  it("handles a product with fewer than FORECAST_BACKTEST_WEEKS of history without error", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const supplier = await tx.supplier.findFirstOrThrow();
      const product = await tx.product.create({
        data: {
          sku: `TEST-FORECAST-${Date.now()}`,
          name: "Test Product With Short History",
          category: "HOUSEHOLD",
          unitOfMeasure: "unit",
          unitCost: 10,
          unitPrice: 15,
          leadTimeDays: 7,
          primarySupplierId: supplier.id,
        },
      });

      // Only 3 weeks of history -- fewer than FORECAST_BACKTEST_WEEKS (12).
      await tx.demandHistory.createMany({
        data: [
          { productId: product.id, periodDate: new Date("2026-01-05"), quantitySold: 100 },
          { productId: product.id, periodDate: new Date("2026-01-12"), quantitySold: 110 },
          { productId: product.id, periodDate: new Date("2026-01-19"), quantitySold: 105 },
        ],
      });

      const metrics = await recalculateForecastsForProduct(product.id, tx);

      // Backtest window shrinks to what's available rather than erroring.
      expect(metrics.points.length).toBeGreaterThan(0);
      expect(metrics.points.length).toBeLessThan(12);
    });
  });
});

describe("recalculateAllForecasts (integration)", () => {
  it("processes the entire seeded catalog", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const totalProducts = await tx.product.count();

      const result = await recalculateAllForecasts(tx);

      expect(result.productsProcessed).toBe(totalProducts);
      expect(result.forecastRowsWritten).toBeGreaterThan(0);
    });
  }, 60000);
});
