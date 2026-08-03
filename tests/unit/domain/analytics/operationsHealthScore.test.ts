import { describe, expect, it } from "vitest";
import { computeOperationsHealthScore } from "@/lib/domain/analytics/operationsHealthScore";

// Default weights: inventory=0.35, supplier=0.20, forecast=0.20, warehouse=0.15, turnover=0.10

describe("computeOperationsHealthScore", () => {
  it("computes the weighted blend when all five components are present", () => {
    // 100*0.35 + 80*0.20 + 90*0.20 + 70*0.15 + 60*0.10
    // = 35 + 16 + 18 + 10.5 + 6 = 85.5
    const score = computeOperationsHealthScore({
      inventoryHealth: 100,
      supplierReliability: 80,
      forecastAccuracy: 90,
      warehouseUtilizationHealth: 70,
      turnoverHealth: 60,
    });
    expect(score).toBeCloseTo(85.5, 10);
  });

  it("renormalizes weights when one component is missing, rather than treating it as 0", () => {
    // Remaining weights: inventory=0.35, forecast=0.20, warehouse=0.15, turnover=0.10 -> sum 0.80
    // weighted sum = 100*0.35 + 90*0.20 + 70*0.15 + 60*0.10 = 35+18+10.5+6 = 69.5
    // score = 69.5 / 0.80 = 86.875
    const score = computeOperationsHealthScore({
      inventoryHealth: 100,
      supplierReliability: null,
      forecastAccuracy: 90,
      warehouseUtilizationHealth: 70,
      turnoverHealth: 60,
    });
    expect(score).toBeCloseTo(86.875, 10);
  });

  it("a missing component never silently drags the score down as if it were 0", () => {
    const allPresentLowScore = computeOperationsHealthScore({
      inventoryHealth: 50,
      supplierReliability: 50,
      forecastAccuracy: 50,
      warehouseUtilizationHealth: 50,
      turnoverHealth: 50,
    });
    const oneMissingSameValues = computeOperationsHealthScore({
      inventoryHealth: 50,
      supplierReliability: 50,
      forecastAccuracy: 50,
      warehouseUtilizationHealth: 50,
      turnoverHealth: null,
    });

    // If the missing component were treated as 0, oneMissingSameValues
    // would score lower. Renormalization means it scores the same.
    expect(oneMissingSameValues).toBeCloseTo(allPresentLowScore!, 10);
    expect(oneMissingSameValues).toBeCloseTo(50, 10);
  });

  it("returns null when every component is unavailable", () => {
    const score = computeOperationsHealthScore({
      inventoryHealth: null,
      supplierReliability: null,
      forecastAccuracy: null,
      warehouseUtilizationHealth: null,
      turnoverHealth: null,
    });
    expect(score).toBeNull();
  });

  it("returns a single component's value directly when it's the only one present", () => {
    const score = computeOperationsHealthScore({
      inventoryHealth: 77,
      supplierReliability: null,
      forecastAccuracy: null,
      warehouseUtilizationHealth: null,
      turnoverHealth: null,
    });
    expect(score).toBe(77);
  });
});
