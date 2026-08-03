import { describe, expect, it } from "vitest";
import { computeSupplierReliabilityScore } from "@/lib/domain/suppliers/reliabilityScore";

describe("computeSupplierReliabilityScore", () => {
  it("returns the equal-weighted average of the three components", () => {
    expect(computeSupplierReliabilityScore(90, 80, 70)).toBeCloseTo(80, 10);
  });

  it("returns 100 when all three components are perfect", () => {
    expect(computeSupplierReliabilityScore(100, 100, 100)).toBe(100);
  });
});
