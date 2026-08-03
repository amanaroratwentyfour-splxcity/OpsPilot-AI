import { describe, expect, it } from "vitest";
import { computeEOQ } from "@/lib/domain/procurement/eoq";
import { DEFAULT_HOLDING_COST_RATE, DEFAULT_ORDERING_COST } from "@/lib/domain/config";

describe("computeEOQ", () => {
  it("computes EOQ = sqrt((2 x D x S) / H) with explicit cost inputs", () => {
    // D=5200, unitCost=15, S=500, holdingCostRate=0.20 -> H=3
    const eoq = computeEOQ(5200, 15, 500, 0.2);

    expect(eoq).toBeCloseTo(Math.sqrt((2 * 5200 * 500) / 3), 10);
    expect(eoq).toBeCloseTo(1316.56, 2);
  });

  it("defaults ordering cost and holding cost rate to the documented configuration constants", () => {
    const withDefaults = computeEOQ(5200, 15);
    const withExplicitDefaults = computeEOQ(
      5200,
      15,
      DEFAULT_ORDERING_COST,
      DEFAULT_HOLDING_COST_RATE,
    );

    expect(withDefaults).toBeCloseTo(withExplicitDefaults!, 10);
  });

  it("returns 0 for zero annual demand (never suggest ordering a dead product)", () => {
    expect(computeEOQ(0, 15)).toBe(0);
  });

  it("returns 0 for zero ordering cost (mathematically valid and degenerate, not an error)", () => {
    expect(computeEOQ(5200, 15, 0)).toBe(0);
  });

  it("falls back to the default holding cost rate when given a non-positive rate, rather than failing", () => {
    const zeroRate = computeEOQ(5200, 15, 500, 0);
    const negativeRate = computeEOQ(5200, 15, 500, -0.1);
    const explicitDefault = computeEOQ(5200, 15, 500, DEFAULT_HOLDING_COST_RATE);

    expect(zeroRate).toBeCloseTo(explicitDefault!, 10);
    expect(negativeRate).toBeCloseTo(explicitDefault!, 10);
  });

  it("returns null for a unitCost of 0 (holding cost per unit is undefined regardless of rate)", () => {
    expect(computeEOQ(5200, 0)).toBeNull();
  });

  it("returns null for negative annual demand", () => {
    expect(computeEOQ(-100, 15)).toBeNull();
  });

  it("returns null for negative unit cost", () => {
    expect(computeEOQ(5200, -15)).toBeNull();
  });

  it("returns null for negative ordering cost", () => {
    expect(computeEOQ(5200, 15, -500)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeEOQ(NaN, 15)).toBeNull();
    expect(computeEOQ(5200, Infinity)).toBeNull();
  });
});
