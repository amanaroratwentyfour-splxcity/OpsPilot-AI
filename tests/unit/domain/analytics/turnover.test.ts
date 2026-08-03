import { describe, expect, it } from "vitest";
import { computeInventoryTurnover } from "@/lib/domain/analytics/turnover";

describe("computeInventoryTurnover", () => {
  it("computes COGS / AverageInventoryValue", () => {
    expect(computeInventoryTurnover(800, 100)).toBe(8);
  });

  it("returns 0 for zero COGS (valid: nothing sold this period)", () => {
    expect(computeInventoryTurnover(0, 100)).toBe(0);
  });

  it("returns null for zero inventory value (undefined, not infinite)", () => {
    expect(computeInventoryTurnover(800, 0)).toBeNull();
  });

  it("returns null for negative inputs", () => {
    expect(computeInventoryTurnover(-800, 100)).toBeNull();
    expect(computeInventoryTurnover(800, -100)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeInventoryTurnover(NaN, 100)).toBeNull();
    expect(computeInventoryTurnover(800, Infinity)).toBeNull();
  });
});
