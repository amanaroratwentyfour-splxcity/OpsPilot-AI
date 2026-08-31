import { describe, expect, it } from "vitest";
import { StockStatus, RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma";
import { findOverstockedPositions } from "@/lib/domain/recommendations/overstockedInventory";
import type { InventoryPositionInput } from "@/lib/domain/recommendations/criticalInventory";

function position(overrides: Partial<InventoryPositionInput> = {}): InventoryPositionInput {
  return {
    productId: "prod-1",
    productName: "HomeShine Laundry Detergent Powder 3kg",
    warehouseId: "wh-4",
    warehouseName: "NovaFoods Kolkata Distribution Center",
    onHandQty: 2000,
    reorderPoint: 400,
    stockStatus: StockStatus.OVERSTOCKED,
    ...overrides,
  };
}

describe("findOverstockedPositions", () => {
  it("flags an OVERSTOCKED position with WARNING severity and a ratio metric", () => {
    const [candidate] = findOverstockedPositions([position()]);

    expect(candidate.category).toBe(RecommendationCategory.INVENTORY);
    expect(candidate.severity).toBe(RecommendationSeverity.WARNING);
    expect(candidate.triggerCondition).toMatch(/OVERSTOCKED/);
    expect(candidate.supportingMetrics).toEqual({
      onHandQty: 2000,
      reorderPoint: 400,
      ratioToReorderPoint: 5,
    });
    expect(candidate.justification).toContain("HomeShine Laundry Detergent Powder 3kg");
    expect(candidate.productId).toBe("prod-1");
    expect(candidate.warehouseId).toBe("wh-4");
  });

  it("does not flag HEALTHY, LOW, or CRITICAL positions", () => {
    const positions = [
      position({ stockStatus: StockStatus.HEALTHY }),
      position({ stockStatus: StockStatus.LOW }),
      position({ stockStatus: StockStatus.CRITICAL }),
    ];

    expect(findOverstockedPositions(positions)).toEqual([]);
  });

  it("does not flag a position with a null stockStatus", () => {
    expect(findOverstockedPositions([position({ stockStatus: null })])).toEqual([]);
  });
});
