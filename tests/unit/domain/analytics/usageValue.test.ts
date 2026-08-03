import { describe, expect, it } from "vitest";
import { computeUsageValue } from "@/lib/domain/analytics/usageValue";

describe("computeUsageValue", () => {
  it("computes annualDemand x unitCost", () => {
    expect(computeUsageValue(100, 15)).toBe(1500);
  });

  it("returns 0 for a product with zero annual demand (not an error)", () => {
    expect(computeUsageValue(0, 15)).toBe(0);
  });

  it("returns 0 for a product with zero unit cost (not an error)", () => {
    expect(computeUsageValue(100, 0)).toBe(0);
  });

  it("returns null for negative annual demand", () => {
    expect(computeUsageValue(-10, 15)).toBeNull();
  });

  it("returns null for negative unit cost", () => {
    expect(computeUsageValue(100, -15)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeUsageValue(NaN, 15)).toBeNull();
    expect(computeUsageValue(100, Infinity)).toBeNull();
  });
});
