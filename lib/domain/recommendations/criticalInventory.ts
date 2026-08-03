import { RecommendationCategory, RecommendationSeverity, StockStatus } from "@/lib/generated/prisma/enums";
import type { RecommendationCandidate } from "./recommendationCandidate";

export interface InventoryPositionInput {
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  onHandQty: number;
  /** Inventory.reorderPoint, as already computed by the Inventory Engine. */
  reorderPoint: number | null;
  /** Inventory.stockStatus, as already classified by classifyStockStatus
   *  (Milestone 2.2) — this rule reads the classification, it does not
   *  recompute the onHandQty/reorderPoint ratio itself. */
  stockStatus: StockStatus | null;
}

/**
 * Flags every Inventory position already classified CRITICAL by the
 * Inventory Engine (classifyStockStatus, Milestone 2.2) as a recommendation
 * candidate.
 *
 * Pure — no Prisma/database access, no new calculation. classifyStockStatus
 * guarantees `reorderPoint` is a positive number whenever it returns
 * CRITICAL (see stockStatus.ts), so it is safe to read directly here.
 *
 * @param positions - current Inventory rows joined with product/warehouse
 *   names, for whichever positions the caller wants scanned
 */
export function findCriticalInventoryPositions(
  positions: InventoryPositionInput[],
): RecommendationCandidate[] {
  return positions
    .filter((position) => position.stockStatus === StockStatus.CRITICAL)
    .map((position) => {
      // Guaranteed non-null by classifyStockStatus's contract whenever
      // stockStatus === CRITICAL. Rounded to whole units for display only
      // (reorderPoint is a computed, generally fractional value) — the
      // underlying comparison and classification already happened in
      // classifyStockStatus against the unrounded figure.
      const reorderPoint = position.reorderPoint as number;
      const reorderPointDisplay = Math.round(reorderPoint);

      return {
        category: RecommendationCategory.INVENTORY,
        severity: RecommendationSeverity.CRITICAL,
        triggerCondition: "stockStatus === CRITICAL (onHandQty <= reorderPoint)",
        supportingMetrics: {
          onHandQty: position.onHandQty,
          reorderPoint: reorderPointDisplay,
        },
        justification:
          `${position.productName} at ${position.warehouseName} is critically low: ` +
          `${position.onHandQty} units on hand against a reorder point of ${reorderPointDisplay} units.`,
        productId: position.productId,
        supplierId: null,
        warehouseId: position.warehouseId,
      };
    });
}
