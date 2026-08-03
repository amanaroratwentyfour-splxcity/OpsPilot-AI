import { describe, expect, it } from "vitest";
import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma/enums";
import { findWarehousesNearCapacity } from "@/lib/domain/recommendations/warehousesNearCapacity";

describe("findWarehousesNearCapacity", () => {
  it("flags a warehouse at or above the critical threshold (95) as CRITICAL", () => {
    const [candidate] = findWarehousesNearCapacity([
      { warehouseId: "wh-1", warehouseName: "NovaFoods Mumbai Distribution Center", utilizationPercent: 96 },
    ]);

    expect(candidate.category).toBe(RecommendationCategory.INVENTORY);
    expect(candidate.severity).toBe(RecommendationSeverity.CRITICAL);
    expect(candidate.supportingMetrics).toEqual({ utilizationPercent: 96, threshold: 95 });
    expect(candidate.warehouseId).toBe("wh-1");
  });

  it("flags a warehouse at or above the warning threshold (85) but below critical as WARNING", () => {
    const [candidate] = findWarehousesNearCapacity([
      { warehouseId: "wh-1", warehouseName: "NovaFoods Mumbai Distribution Center", utilizationPercent: 91 },
    ]);

    expect(candidate.severity).toBe(RecommendationSeverity.WARNING);
    expect(candidate.supportingMetrics).toEqual({ utilizationPercent: 91, threshold: 85 });
  });

  it("does not flag a warehouse below the warning threshold", () => {
    expect(
      findWarehousesNearCapacity([
        { warehouseId: "wh-1", warehouseName: "NovaFoods Bengaluru Distribution Center", utilizationPercent: 63 },
      ]),
    ).toEqual([]);
  });

  it("does not flag a warehouse with a null utilizationPercent", () => {
    expect(
      findWarehousesNearCapacity([
        { warehouseId: "wh-1", warehouseName: "Empty Warehouse", utilizationPercent: null },
      ]),
    ).toEqual([]);
  });

  it("treats the exact threshold boundary as inclusive", () => {
    const atWarning = findWarehousesNearCapacity([
      { warehouseId: "wh-1", warehouseName: "W", utilizationPercent: 85 },
    ]);
    expect(atWarning[0].severity).toBe(RecommendationSeverity.WARNING);

    const atCritical = findWarehousesNearCapacity([
      { warehouseId: "wh-1", warehouseName: "W", utilizationPercent: 95 },
    ]);
    expect(atCritical[0].severity).toBe(RecommendationSeverity.CRITICAL);
  });
});
