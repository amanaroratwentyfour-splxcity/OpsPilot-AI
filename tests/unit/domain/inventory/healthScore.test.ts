import { describe, expect, it } from "vitest";
import { computeInventoryHealthScore } from "@/lib/domain/inventory/healthScore";

describe("computeInventoryHealthScore", () => {
  const reorderPoint = 200;

  it.each([
    // [onHandQty, ratio, expected score]
    [0, 0, 0],
    [100, 0.5, 30], // 0.5 * 60
    [199, 0.995, 59.7], // ratio * 60, just below the reorder point
    [200, 1.0, 60], // right at the reorder point: floor of the "healthy climb" band
    [460, 2.3, 100], // the ideal ratio: peak score
    [800, 4.0, 70], // top of the "declining past ideal" band
    [2000, 10, 40], // 70 - (10-4)*5 = 40
    [10000, 50, 20], // deep overstock: floored at 20, never drops to 0
  ])("onHandQty=%s (ratio %s) scores %s", (onHandQty, _ratio, expected) => {
    expect(computeInventoryHealthScore(onHandQty, reorderPoint)).toBeCloseTo(expected, 10);
  });

  it("is continuous across the ratio=1 boundary (no jump discontinuity)", () => {
    const justBelow = computeInventoryHealthScore(199.999, reorderPoint)!;
    const at = computeInventoryHealthScore(200, reorderPoint)!;

    expect(at - justBelow).toBeLessThan(0.01);
  });

  it("is continuous across the ratio=4 boundary (no jump discontinuity)", () => {
    const at = computeInventoryHealthScore(800, reorderPoint)!;
    const justAbove = computeInventoryHealthScore(800.01, reorderPoint)!;

    expect(justAbove - at).toBeGreaterThan(-0.01);
    expect(justAbove - at).toBeLessThan(0.01);
  });

  it("never returns a value outside [0, 100]", () => {
    const ratios = [0, 0.1, 0.5, 1, 2.3, 4, 10, 100, 10000];
    for (const ratio of ratios) {
      const score = computeInventoryHealthScore(ratio * reorderPoint, reorderPoint)!;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("returns null when reorderPoint is null (unknown, e.g. insufficient demand history)", () => {
    expect(computeInventoryHealthScore(500, null)).toBeNull();
  });

  it("returns null when reorderPoint is 0", () => {
    expect(computeInventoryHealthScore(500, 0)).toBeNull();
  });

  it("returns null for negative onHandQty (data-integrity error, not a valid score)", () => {
    expect(computeInventoryHealthScore(-1, 200)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeInventoryHealthScore(NaN, 200)).toBeNull();
    expect(computeInventoryHealthScore(500, Infinity)).toBeNull();
  });
});

describe("classifyStockStatus and computeInventoryHealthScore stay boundary-consistent", () => {
  it("OVERSTOCKED classification only ever occurs where health score has entered its floored band", async () => {
    const { classifyStockStatus } = await import("@/lib/domain/inventory/stockStatus");
    const { StockStatus } = await import("@/lib/generated/prisma");
    const reorderPoint = 200;

    for (const ratio of [3.9, 4.0, 4.1, 5, 10, 50]) {
      const onHandQty = ratio * reorderPoint;
      const status = classifyStockStatus(onHandQty, reorderPoint);
      const score = computeInventoryHealthScore(onHandQty, reorderPoint)!;

      if (status === StockStatus.OVERSTOCKED) {
        // The floored formula only applies once ratio > 4.
        expect(ratio).toBeGreaterThan(4.0);
      } else {
        expect(score).toBeGreaterThanOrEqual(70);
      }
    }
  });
});
