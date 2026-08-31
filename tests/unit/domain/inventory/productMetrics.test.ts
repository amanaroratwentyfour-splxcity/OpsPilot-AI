import { describe, expect, it } from "vitest";
import { computeProductInventoryMetrics } from "@/lib/domain/inventory/productMetrics";
import { classifyStockStatus } from "@/lib/domain/inventory/stockStatus";
import { computeInventoryHealthScore } from "@/lib/domain/inventory/healthScore";
import { StockStatus } from "@/lib/generated/prisma";

// Same reference series used throughout Milestone 2.1's tests and
// OPERATIONS_ENGINE_SPEC.md's worked example: weekly [560,630,700,770,840]
// -> avgDailyDemand=100, stdDevDaily=sqrt(200), leadTimeDays=7
// -> safetyStock ~= 61.7373, reorderPoint ~= 761.7373.
const WEEKLY_QUANTITIES = [560, 630, 700, 770, 840];
const LEAD_TIME_DAYS = 7;

describe("computeProductInventoryMetrics", () => {
  it("composes demand statistics, safety stock, and reorder point exactly once each", () => {
    const metrics = computeProductInventoryMetrics(
      "product-1",
      WEEKLY_QUANTITIES,
      LEAD_TIME_DAYS,
      [],
    );

    expect(metrics.demandStatistics).not.toBeNull();
    expect(metrics.demandStatistics!.avgDailyDemand).toBeCloseTo(100, 10);
    expect(metrics.demandStatistics!.stdDevDaily).toBeCloseTo(Math.sqrt(200), 10);
    expect(metrics.safetyStock).toBeCloseTo(61.7373, 4);
    expect(metrics.reorderPoint).toBeCloseTo(761.7373, 4);
  });

  it("computes per-warehouse stock status and health score identically to calling the functions directly", () => {
    const warehouseStock = [
      { warehouseId: "wh-critical", onHandQty: 200 }, // well below the reorder point
      { warehouseId: "wh-healthy", onHandQty: 1600 }, // ~2.1x reorder point
      { warehouseId: "wh-overstocked", onHandQty: 5000 }, // ~6.6x reorder point
    ];

    const metrics = computeProductInventoryMetrics(
      "product-1",
      WEEKLY_QUANTITIES,
      LEAD_TIME_DAYS,
      warehouseStock,
    );

    expect(metrics.warehouses).toHaveLength(3);

    for (const input of warehouseStock) {
      const result = metrics.warehouses.find((w) => w.warehouseId === input.warehouseId)!;

      // The whole point of this composition function: its per-warehouse
      // output must be identical to calling the standalone functions
      // directly with the same reorderPoint — no formula is re-implemented
      // or duplicated here.
      expect(result.onHandQty).toBe(input.onHandQty);
      expect(result.stockStatus).toBe(classifyStockStatus(input.onHandQty, metrics.reorderPoint));
      expect(result.healthScore).toBe(
        computeInventoryHealthScore(input.onHandQty, metrics.reorderPoint),
      );
    }

    expect(metrics.warehouses.find((w) => w.warehouseId === "wh-critical")!.stockStatus).toBe(
      StockStatus.CRITICAL,
    );
    expect(metrics.warehouses.find((w) => w.warehouseId === "wh-overstocked")!.stockStatus).toBe(
      StockStatus.OVERSTOCKED,
    );
  });

  it("propagates insufficient demand history to every downstream field as null, never 0", () => {
    const metrics = computeProductInventoryMetrics("product-new", [700], LEAD_TIME_DAYS, [
      { warehouseId: "wh-1", onHandQty: 500 },
    ]);

    expect(metrics.demandStatistics).toBeNull();
    expect(metrics.safetyStock).toBeNull();
    expect(metrics.reorderPoint).toBeNull();
    expect(metrics.warehouses[0].stockStatus).toBeNull();
    expect(metrics.warehouses[0].healthScore).toBeNull();
    // on-hand quantity itself is still reported — it's a known fact, just
    // not classifiable without a reorder point.
    expect(metrics.warehouses[0].onHandQty).toBe(500);
  });

  it("returns an empty warehouses array for a product with no Inventory rows", () => {
    const metrics = computeProductInventoryMetrics(
      "product-1",
      WEEKLY_QUANTITIES,
      LEAD_TIME_DAYS,
      [],
    );

    expect(metrics.warehouses).toEqual([]);
  });

  it("preserves the productId passed in", () => {
    const metrics = computeProductInventoryMetrics(
      "abc-123",
      WEEKLY_QUANTITIES,
      LEAD_TIME_DAYS,
      [],
    );

    expect(metrics.productId).toBe("abc-123");
  });
});
