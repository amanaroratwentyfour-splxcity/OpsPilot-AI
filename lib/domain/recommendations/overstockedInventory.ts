import { RecommendationCategory, RecommendationSeverity, StockStatus } from "@/lib/generated/prisma";
import type { RecommendationCandidate } from "./recommendationCandidate";
import type { InventoryPositionInput } from "./criticalInventory";

/**
 * Flags every Inventory position already classified OVERSTOCKED by the
 * Inventory Engine (classifyStockStatus, Milestone 2.2) as a recommendation
 * candidate — excess stock ties up working capital and warehouse space,
 * which is a real business concern even though it's not an urgent stockout
 * risk.
 *
 * Pure — no Prisma/database access, no new calculation. Reuses the same
 * InventoryPositionInput shape as findCriticalInventoryPositions, since
 * both rules scan the same joined data.
 *
 * @param positions - current Inventory rows joined with product/warehouse names
 */
export function findOverstockedPositions(
  positions: InventoryPositionInput[],
): RecommendationCandidate[] {
  return positions
    .filter((position) => position.stockStatus === StockStatus.OVERSTOCKED)
    .map((position) => {
      // Guaranteed non-null by classifyStockStatus's contract whenever
      // stockStatus === OVERSTOCKED. The ratio is computed from the
      // unrounded reorderPoint (precision matters for the actual figure);
      // reorderPointDisplay is rounded to whole units for display only.
      const reorderPoint = position.reorderPoint as number;
      const ratio = position.onHandQty / reorderPoint;
      const reorderPointDisplay = Math.round(reorderPoint);

      return {
        category: RecommendationCategory.INVENTORY,
        severity: RecommendationSeverity.WARNING,
        triggerCondition: "stockStatus === OVERSTOCKED (onHandQty > 4x reorderPoint)",
        supportingMetrics: {
          onHandQty: position.onHandQty,
          reorderPoint: reorderPointDisplay,
          ratioToReorderPoint: Math.round(ratio * 100) / 100,
        },
        justification:
          `${position.productName} at ${position.warehouseName} is overstocked: ` +
          `${position.onHandQty} units on hand, about ${ratio.toFixed(1)}x its reorder point of ${reorderPointDisplay} units.`,
        productId: position.productId,
        supplierId: null,
        warehouseId: position.warehouseId,
      };
    });
}
