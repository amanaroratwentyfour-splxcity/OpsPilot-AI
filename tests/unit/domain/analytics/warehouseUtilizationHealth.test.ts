import { describe, expect, it } from "vitest";
import { computeWarehouseUtilizationHealth } from "@/lib/domain/analytics/warehouseUtilizationHealth";

// Default ideal band: 65-85%.
describe("computeWarehouseUtilizationHealth", () => {
  it("scores 100 throughout the ideal band, including its boundaries", () => {
    expect(computeWarehouseUtilizationHealth(65)).toBe(100);
    expect(computeWarehouseUtilizationHealth(75)).toBe(100);
    expect(computeWarehouseUtilizationHealth(85)).toBe(100);
  });

  it("scores below 100 under-utilized, floored at 40 for an empty warehouse", () => {
    expect(computeWarehouseUtilizationHealth(0)).toBe(40);
    // Halfway to the ideal band's minimum: 40 + (32.5/65)*60 = 70.
    expect(computeWarehouseUtilizationHealth(32.5)).toBeCloseTo(70, 10);
  });

  it("declines over a 10-point band above the ideal max", () => {
    // 90 = max(85) + 5 -> 100 - (5/10)*30 = 85
    expect(computeWarehouseUtilizationHealth(90)).toBeCloseTo(85, 10);
    // 95 = max(85) + 10 -> 100 - (10/10)*30 = 70
    expect(computeWarehouseUtilizationHealth(95)).toBeCloseTo(70, 10);
  });

  it("floors at 20 well beyond the ideal band", () => {
    expect(computeWarehouseUtilizationHealth(100)).toBeCloseTo(45, 10); // 70 - (5)*5
    expect(computeWarehouseUtilizationHealth(200)).toBe(20);
  });

  it("is continuous at the ideal-band boundaries (no jump discontinuity)", () => {
    const justBelowMin = computeWarehouseUtilizationHealth(64.999)!;
    const atMin = computeWarehouseUtilizationHealth(65)!;
    expect(atMin - justBelowMin).toBeLessThan(0.01);

    const atMax = computeWarehouseUtilizationHealth(85)!;
    const justAboveMax = computeWarehouseUtilizationHealth(85.001)!;
    expect(atMax - justAboveMax).toBeLessThan(0.01);
  });

  it("supports a custom ideal band", () => {
    expect(computeWarehouseUtilizationHealth(50, { min: 40, max: 60 })).toBe(100);
  });

  it("returns null for negative utilization", () => {
    expect(computeWarehouseUtilizationHealth(-1)).toBeNull();
  });

  it("returns null for non-finite input", () => {
    expect(computeWarehouseUtilizationHealth(NaN)).toBeNull();
  });
});
