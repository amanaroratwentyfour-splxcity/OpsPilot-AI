import { describe, expect, it } from "vitest";
import { StockStatus, RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma/enums";
import {
  findCriticalInventoryPositions,
  type InventoryPositionInput,
} from "@/lib/domain/recommendations/criticalInventory";

function position(overrides: Partial<InventoryPositionInput> = {}): InventoryPositionInput {
  return {
    productId: "prod-1",
    productName: "NovaFizz Cola 750ml",
    warehouseId: "wh-1",
    warehouseName: "NovaFoods Mumbai Distribution Center",
    onHandQty: 100,
    reorderPoint: 500,
    stockStatus: StockStatus.CRITICAL,
    ...overrides,
  };
}

describe("findCriticalInventoryPositions", () => {
  it("flags a CRITICAL position with CRITICAL severity and the right supporting metrics", () => {
    const [candidate] = findCriticalInventoryPositions([position()]);

    expect(candidate.category).toBe(RecommendationCategory.INVENTORY);
    expect(candidate.severity).toBe(RecommendationSeverity.CRITICAL);
    expect(candidate.triggerCondition).toMatch(/CRITICAL/);
    expect(candidate.supportingMetrics).toEqual({ onHandQty: 100, reorderPoint: 500 });
    expect(candidate.justification).toContain("NovaFizz Cola 750ml");
    expect(candidate.justification).toContain("NovaFoods Mumbai Distribution Center");
    expect(candidate.productId).toBe("prod-1");
    expect(candidate.warehouseId).toBe("wh-1");
    expect(candidate.supplierId).toBeNull();
  });

  it("does not flag HEALTHY, LOW, or OVERSTOCKED positions", () => {
    const positions = [
      position({ stockStatus: StockStatus.HEALTHY }),
      position({ stockStatus: StockStatus.LOW }),
      position({ stockStatus: StockStatus.OVERSTOCKED }),
    ];

    expect(findCriticalInventoryPositions(positions)).toEqual([]);
  });

  it("does not flag a position with a null stockStatus", () => {
    expect(findCriticalInventoryPositions([position({ stockStatus: null })])).toEqual([]);
  });

  it("produces one candidate per CRITICAL position across a mixed batch", () => {
    const positions = [
      position({ productId: "a", stockStatus: StockStatus.CRITICAL }),
      position({ productId: "b", stockStatus: StockStatus.HEALTHY }),
      position({ productId: "c", stockStatus: StockStatus.CRITICAL }),
    ];

    const candidates = findCriticalInventoryPositions(positions);
    expect(candidates.map((c) => c.productId)).toEqual(["a", "c"]);
  });
});
