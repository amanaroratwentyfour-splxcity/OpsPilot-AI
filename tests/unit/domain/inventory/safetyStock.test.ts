import { describe, expect, it } from "vitest";
import { computeSafetyStock } from "@/lib/domain/inventory/safetyStock";

describe("computeSafetyStock", () => {
  it("computes SS = Z x stdDevDaily x sqrt(leadTimeDays)", () => {
    // sqrt(200) daily std dev, 7-day lead time, default Z (1.65):
    // 1.65 * sqrt(200) * sqrt(7) = 1.65 * sqrt(1400) ~= 61.7372
    const safetyStock = computeSafetyStock(Math.sqrt(200), 7);

    expect(safetyStock).toBeCloseTo(1.65 * Math.sqrt(1400), 10);
    expect(safetyStock).toBeCloseTo(61.7373, 4);
  });

  it("accepts a custom service level factor", () => {
    const safetyStock = computeSafetyStock(10, 4, 2.33); // ~99% service level

    expect(safetyStock).toBeCloseTo(2.33 * 10 * 2, 10);
  });

  it("returns 0 for zero demand variability (not an error)", () => {
    expect(computeSafetyStock(0, 7)).toBe(0);
  });

  it("returns 0 for zero lead time (instantaneous replenishment needs no buffer)", () => {
    expect(computeSafetyStock(50, 0)).toBe(0);
  });

  it("returns null for negative lead time", () => {
    expect(computeSafetyStock(10, -1)).toBeNull();
  });

  it("returns null for negative standard deviation", () => {
    expect(computeSafetyStock(-10, 7)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeSafetyStock(NaN, 7)).toBeNull();
    expect(computeSafetyStock(10, Infinity)).toBeNull();
  });
});
