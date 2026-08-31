import { describe, expect, it } from "vitest";
import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma";
import { findDemandIncreaseCandidates } from "@/lib/domain/recommendations/demandIncrease";

describe("findDemandIncreaseCandidates", () => {
  it("flags a product whose trusted forecast rose >= the default 15% threshold", () => {
    const [candidate] = findDemandIncreaseCandidates([
      {
        productId: "prod-1",
        productName: "NovaCrunch Diwali Namkeen Mix 200g",
        forecastSeries: [100, 105, 110, 120],
        aggregateMAPE: 12,
      },
    ]);

    expect(candidate.category).toBe(RecommendationCategory.DEMAND);
    expect(candidate.severity).toBe(RecommendationSeverity.INFO);
    expect(candidate.supportingMetrics.earliestForecastQty).toBe(100);
    expect(candidate.supportingMetrics.latestForecastQty).toBe(120);
    expect(candidate.supportingMetrics.increasePercent).toBe(20);
    expect(candidate.productId).toBe("prod-1");
    expect(candidate.supplierId).toBeNull();
    expect(candidate.warehouseId).toBeNull();
  });

  it("does not flag a rise below the minimum increase threshold", () => {
    expect(
      findDemandIncreaseCandidates([
        { productId: "p", productName: "P", forecastSeries: [100, 105], aggregateMAPE: 10 },
      ]),
    ).toEqual([]);
  });

  it("does not flag a declining or flat forecast", () => {
    expect(
      findDemandIncreaseCandidates([
        { productId: "p", productName: "P", forecastSeries: [100, 90, 80], aggregateMAPE: 10 },
      ]),
    ).toEqual([]);
  });

  it("gates on forecast trust: does not flag a rising forecast with MAPE above the ceiling", () => {
    expect(
      findDemandIncreaseCandidates([
        { productId: "p", productName: "P", forecastSeries: [100, 150], aggregateMAPE: 45 },
      ]),
    ).toEqual([]);
  });

  it("does not flag a product with a null aggregateMAPE (forecast accuracy unknown)", () => {
    expect(
      findDemandIncreaseCandidates([
        { productId: "p", productName: "P", forecastSeries: [100, 150], aggregateMAPE: null },
      ]),
    ).toEqual([]);
  });

  it("does not flag a series with fewer than two points", () => {
    expect(
      findDemandIncreaseCandidates([
        { productId: "p", productName: "P", forecastSeries: [100], aggregateMAPE: 5 },
      ]),
    ).toEqual([]);
  });

  it("does not flag a series starting at zero (undefined percentage change)", () => {
    expect(
      findDemandIncreaseCandidates([
        { productId: "p", productName: "P", forecastSeries: [0, 50], aggregateMAPE: 5 },
      ]),
    ).toEqual([]);
  });

  it("respects custom minIncreasePercent/maxTrustedMAPE overrides", () => {
    const withDefaults = findDemandIncreaseCandidates([
      { productId: "p", productName: "P", forecastSeries: [100, 105], aggregateMAPE: 40 },
    ]);
    expect(withDefaults).toEqual([]);

    const withOverrides = findDemandIncreaseCandidates(
      [{ productId: "p", productName: "P", forecastSeries: [100, 105], aggregateMAPE: 40 }],
      { minIncreasePercent: 3, maxTrustedMAPE: 50 },
    );
    expect(withOverrides).toHaveLength(1);
  });
});
