import { describe, expect, it } from "vitest";
import { computeAggregateMAPE, computeMAPE } from "@/lib/domain/forecasting/accuracy";

describe("computeMAPE", () => {
  it("computes |actual - forecast| / actual x 100", () => {
    expect(computeMAPE(100, 90)).toBeCloseTo(10, 10);
    expect(computeMAPE(100, 110)).toBeCloseTo(10, 10);
  });

  it("returns 0 for a perfect forecast", () => {
    expect(computeMAPE(100, 100)).toBe(0);
  });

  it("returns null when actual is 0 (division by zero is undefined, not infinite)", () => {
    expect(computeMAPE(0, 50)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeMAPE(NaN, 50)).toBeNull();
    expect(computeMAPE(100, Infinity)).toBeNull();
  });
});

describe("computeAggregateMAPE", () => {
  it("averages MAPE across periods", () => {
    // period 1: |100-90|/100*100 = 10; period 2: |200-220|/200*100 = 10
    const result = computeAggregateMAPE([
      { actual: 100, forecast: 90 },
      { actual: 200, forecast: 220 },
    ]);
    expect(result).toBeCloseTo(10, 10);
  });

  it("excludes periods with a zero actual rather than coercing them to 0 error", () => {
    const withZeroPeriod = computeAggregateMAPE([
      { actual: 100, forecast: 90 }, // MAPE 10
      { actual: 0, forecast: 5 }, // excluded, not 0
    ]);
    const withoutZeroPeriod = computeAggregateMAPE([{ actual: 100, forecast: 90 }]);

    expect(withZeroPeriod).toBeCloseTo(withoutZeroPeriod!, 10);
    expect(withZeroPeriod).toBeCloseTo(10, 10);
  });

  it("returns null for an empty input", () => {
    expect(computeAggregateMAPE([])).toBeNull();
  });

  it("returns null when every period has a zero actual", () => {
    expect(computeAggregateMAPE([{ actual: 0, forecast: 5 }])).toBeNull();
  });
});
