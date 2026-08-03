import { describe, expect, it } from "vitest";
import { computeReorderPoint } from "@/lib/domain/inventory/reorderPoint";

describe("computeReorderPoint", () => {
  it("computes ROP = avgDailyDemand x leadTimeDays + safetyStock", () => {
    const rop = computeReorderPoint(100, 7, 61.7372);

    expect(rop).toBeCloseTo(100 * 7 + 61.7372, 10);
    expect(rop).toBeCloseTo(761.7372, 4);
  });

  it("propagates null safety stock rather than substituting 0", () => {
    expect(computeReorderPoint(100, 7, null)).toBeNull();
  });

  it("is valid at zero average daily demand (ROP equals safety stock)", () => {
    expect(computeReorderPoint(0, 7, 50)).toBe(50);
  });

  it("returns null for negative lead time", () => {
    expect(computeReorderPoint(100, -1, 50)).toBeNull();
  });

  it("returns null for negative average daily demand", () => {
    expect(computeReorderPoint(-5, 7, 50)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeReorderPoint(NaN, 7, 50)).toBeNull();
    expect(computeReorderPoint(100, Infinity, 50)).toBeNull();
  });
});

describe("full pipeline (demand statistics -> safety stock -> reorder point)", () => {
  it("chains correctly for a typical product", async () => {
    const { computeDemandStatistics } = await import("@/lib/domain/inventory/demandStatistics");
    const { computeSafetyStock } = await import("@/lib/domain/inventory/safetyStock");

    const weeklyQuantities = [560, 630, 700, 770, 840];
    const leadTimeDays = 7;

    const stats = computeDemandStatistics(weeklyQuantities);
    expect(stats).not.toBeNull();

    const safetyStock = computeSafetyStock(stats!.stdDevDaily, leadTimeDays);
    const reorderPoint = computeReorderPoint(stats!.avgDailyDemand, leadTimeDays, safetyStock);

    expect(safetyStock).toBeCloseTo(61.7373, 4);
    expect(reorderPoint).toBeCloseTo(761.7373, 4);
    expect(reorderPoint!).toBeGreaterThan(safetyStock!);
  });

  it("propagates insufficient demand history all the way through as null, never 0", async () => {
    const { computeDemandStatistics } = await import("@/lib/domain/inventory/demandStatistics");
    const { computeSafetyStock } = await import("@/lib/domain/inventory/safetyStock");

    const stats = computeDemandStatistics([700]); // only 1 week of history
    expect(stats).toBeNull();

    // A caller with no stats has no safety stock or reorder point to compute —
    // this documents the intended calling pattern for orchestrators (Milestone 2.3).
    const safetyStock = stats ? computeSafetyStock(stats.stdDevDaily, 7) : null;
    const reorderPoint = stats ? computeReorderPoint(stats.avgDailyDemand, 7, safetyStock) : null;

    expect(safetyStock).toBeNull();
    expect(reorderPoint).toBeNull();
  });
});
