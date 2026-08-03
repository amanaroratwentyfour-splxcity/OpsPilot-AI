import { describe, expect, it } from "vitest";
import { computeAnnualDemand } from "@/lib/domain/procurement/annualDemand";

describe("computeAnnualDemand", () => {
  it("sums exactly the trailing 52 weeks when 52+ weeks are available, ignoring older history", () => {
    const oldWeeks = [999999, 999999, 999999]; // deliberately extreme, should be ignored
    const trailing52 = Array(52).fill(100); // sums to 5200
    const weeklyQuantities = [...oldWeeks, ...trailing52];

    const result = computeAnnualDemand(weeklyQuantities);

    expect(result.annualDemand).toBe(5200);
    expect(result.isExtrapolated).toBe(false);
  });

  it("sums exactly 52 weeks of history with no extrapolation", () => {
    const weeklyQuantities = Array(52).fill(50); // sums to 2600

    const result = computeAnnualDemand(weeklyQuantities);

    expect(result.annualDemand).toBe(2600);
    expect(result.isExtrapolated).toBe(false);
  });

  it("extrapolates when fewer than 52 weeks are available", () => {
    const weeklyQuantities = Array(10).fill(50); // sums to 500

    const result = computeAnnualDemand(weeklyQuantities);

    expect(result.annualDemand).toBeCloseTo(500 * (52 / 10), 10);
    expect(result.annualDemand).toBeCloseTo(2600, 10);
    expect(result.isExtrapolated).toBe(true);
  });

  it("extrapolates from a single week of history", () => {
    const result = computeAnnualDemand([120]);

    expect(result.annualDemand).toBeCloseTo(120 * 52, 10);
    expect(result.isExtrapolated).toBe(true);
  });

  it("returns 0, not extrapolated, for a product with no demand history at all", () => {
    const result = computeAnnualDemand([]);

    expect(result.annualDemand).toBe(0);
    expect(result.isExtrapolated).toBe(false);
  });
});
