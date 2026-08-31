import { describe, expect, it } from "vitest";
import { classifyStockStatus } from "@/lib/domain/inventory/stockStatus";
import { StockStatus } from "@/lib/generated/prisma";

describe("classifyStockStatus", () => {
  const reorderPoint = 200;

  it.each([
    // [onHandQty, expected ratio, expected status]
    [0, 0, StockStatus.CRITICAL],
    [100, 0.5, StockStatus.CRITICAL],
    [200, 1.0, StockStatus.CRITICAL], // "at or below" the reorder point is still Critical
    [200.01, 1.00005, StockStatus.LOW],
    [260, 1.3, StockStatus.LOW], // boundary is inclusive on the LOW side
    [260.01, 1.30005, StockStatus.HEALTHY],
    [460, 2.3, StockStatus.HEALTHY], // the Health Score "ideal" ratio
    [800, 4.0, StockStatus.HEALTHY], // boundary is inclusive on the HEALTHY side
    [800.01, 4.00005, StockStatus.OVERSTOCKED],
    [2000, 10, StockStatus.OVERSTOCKED],
  ])("onHandQty=%s (ratio %s) classifies as %s", (onHandQty, _ratio, expected) => {
    expect(classifyStockStatus(onHandQty, reorderPoint)).toBe(expected);
  });

  it("returns null when reorderPoint is null (unknown, e.g. insufficient demand history)", () => {
    expect(classifyStockStatus(500, null)).toBeNull();
  });

  it("returns null when reorderPoint is 0", () => {
    expect(classifyStockStatus(500, 0)).toBeNull();
  });

  it("returns null when reorderPoint is negative", () => {
    expect(classifyStockStatus(500, -10)).toBeNull();
  });

  it("returns null for negative onHandQty (data-integrity error, not a valid status)", () => {
    expect(classifyStockStatus(-1, 200)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(classifyStockStatus(NaN, 200)).toBeNull();
    expect(classifyStockStatus(500, Infinity)).toBeNull();
  });
});
