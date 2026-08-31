import { StockStatus } from "@/lib/generated/prisma";
import { computeDemandStatistics, type DemandStatistics } from "./demandStatistics";
import { computeSafetyStock } from "./safetyStock";
import { computeReorderPoint } from "./reorderPoint";
import { classifyStockStatus } from "./stockStatus";
import { computeInventoryHealthScore } from "./healthScore";

export interface WarehouseStockInput {
  warehouseId: string;
  onHandQty: number;
}

export interface WarehouseInventoryMetrics {
  warehouseId: string;
  onHandQty: number;
  stockStatus: StockStatus | null;
  healthScore: number | null;
}

/**
 * A single typed bundle of every Inventory Engine metric computed for one
 * product, across every warehouse it's stocked at.
 */
export interface ProductInventoryMetrics {
  productId: string;
  demandStatistics: DemandStatistics | null;
  safetyStock: number | null;
  reorderPoint: number | null;
  warehouses: WarehouseInventoryMetrics[];
}

/**
 * Composes the Inventory Engine's pure calculation functions —
 * computeDemandStatistics, computeSafetyStock, computeReorderPoint,
 * classifyStockStatus, computeInventoryHealthScore — into a single typed
 * result for one product. Contains no formulas of its own: every number in
 * the returned object is produced by one of those five already-tested
 * functions, called exactly once each (per warehouse, for the two that are
 * warehouse-specific).
 *
 * Pure — no Prisma/database access. This is the layer
 * recalculateInventoryForProduct (recalculate.ts) delegates to, so the
 * database-touching orchestrator never re-implements or duplicates a
 * formula; it only fetches inputs, calls this function, and persists the
 * result.
 *
 * Safety Stock and Reorder Point are computed once per product (see the
 * "no per-warehouse DemandHistory" limitation in OPERATIONS_ENGINE_SPEC.md
 * §4.2) and apply to every warehouse; Stock Status and Health Score are
 * computed once per warehouse, since on-hand quantity varies by warehouse.
 *
 * @param productId
 * @param weeklyQuantities - the product's weekly demand history, any order
 *   (e.g. DemandHistory.quantitySold for this product)
 * @param leadTimeDays - Product.leadTimeDays
 * @param warehouseStock - current on-hand quantity per warehouse this
 *   product has an Inventory row for
 */
export function computeProductInventoryMetrics(
  productId: string,
  weeklyQuantities: number[],
  leadTimeDays: number,
  warehouseStock: WarehouseStockInput[],
): ProductInventoryMetrics {
  const demandStatistics = computeDemandStatistics(weeklyQuantities);

  const safetyStock = demandStatistics
    ? computeSafetyStock(demandStatistics.stdDevDaily, leadTimeDays)
    : null;

  const reorderPoint = demandStatistics
    ? computeReorderPoint(demandStatistics.avgDailyDemand, leadTimeDays, safetyStock)
    : null;

  const warehouses = warehouseStock.map(({ warehouseId, onHandQty }) => ({
    warehouseId,
    onHandQty,
    stockStatus: classifyStockStatus(onHandQty, reorderPoint),
    healthScore: computeInventoryHealthScore(onHandQty, reorderPoint),
  }));

  return { productId, demandStatistics, safetyStock, reorderPoint, warehouses };
}
