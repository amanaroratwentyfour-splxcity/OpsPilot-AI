import { computeUsageValue } from "./usageValue";
import { computeInventoryValue } from "./inventoryValue";
import { computeInventoryTurnover } from "./turnover";
import { computeTurnoverHealth } from "./turnoverHealth";
import { computeWarehouseUtilization } from "./warehouseUtilization";
import { computeWarehouseUtilizationHealth } from "./warehouseUtilizationHealth";
import { computeInventoryHealthScore } from "../inventory/healthScore";
import { computeOperationsHealthScore } from "./operationsHealthScore";

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function meanOrNull(values: number[]): number | null {
  return values.length > 0 ? mean(values) : null;
}

export interface CompanyAnalyticsProductInput {
  /** From computeAnnualDemand (Procurement Engine) — reused, not recomputed. */
  annualDemand: number;
  unitCost: number;
}

export interface CompanyAnalyticsInventoryRowInput {
  onHandQty: number;
  unitCost: number;
  reorderPoint: number | null;
}

export interface CompanyAnalyticsWarehouseInput {
  warehouseId: string;
  totalOnHand: number;
  capacityUnits: number;
}

export interface CompanyAnalyticsInput {
  products: CompanyAnalyticsProductInput[];
  inventoryRows: CompanyAnalyticsInventoryRowInput[];
  warehouses: CompanyAnalyticsWarehouseInput[];
  /** Supplier.reliabilityScore for every supplier (null = not yet scored). */
  supplierReliabilityScores: (number | null)[];
  /** Forecast.mape for every forecast row in scope (null = undefined for that period). */
  forecastMapeValues: (number | null)[];
}

export interface WarehouseUtilizationResult {
  warehouseId: string;
  utilizationPercent: number | null;
}

export interface CompanyAnalyticsSnapshot {
  inventoryTurnover: number | null;
  warehouseUtilizations: WarehouseUtilizationResult[];
  operationsHealthScore: number | null;
  /** The five inputs computeOperationsHealthScore actually blended (or
   *  excluded, if null) — exposed so a caller can show the breakdown, not
   *  just the headline number, per the product's explainability principle. */
  operationsHealthComponents: {
    avgInventoryHealth: number | null;
    avgSupplierReliability: number | null;
    avgForecastAccuracy: number | null;
    avgWarehouseUtilizationHealth: number | null;
    turnoverHealth: number | null;
  };
}

/**
 * The Analytics Engine's cohesive batch composition layer: computes
 * Inventory Turnover, every warehouse's Utilization, and the Operations
 * Health Score together, in one pass over pre-fetched, company-wide data —
 * because Operations Health Score is *built from* the other two (plus
 * Inventory Health Score and Supplier Reliability Score from earlier
 * engines, and Forecast Accuracy), treating them as three unrelated
 * calculations would mean computing the same underlying aggregates twice.
 *
 * Contains no new formulas beyond the ratios/scores already defined in
 * this engine — every number is produced by calling an already-tested
 * function exactly once per relevant row, reusing computeUsageValue (ABC
 * Analysis, Milestone "Analytics Engine — ABC Analysis") for COGS and
 * computeInventoryHealthScore (Inventory Engine, Milestone 2.2) for the
 * inventory-health component, rather than duplicating either.
 *
 * Pure — no Prisma/database access. This is the layer
 * getCompanyAnalyticsSnapshot (recalculate.ts) delegates to.
 *
 * @param input - pre-fetched, already-shaped data; the orchestrator's job
 *   is to produce exactly this shape, this function's job is to compute
 *   from it
 */
export function computeCompanyAnalyticsSnapshot(
  input: CompanyAnalyticsInput,
): CompanyAnalyticsSnapshot {
  // --- Inventory Turnover: COGS / AverageInventoryValue ---
  const cogsValues = input.products
    .map((product) => computeUsageValue(product.annualDemand, product.unitCost))
    .filter((value): value is number => value !== null);
  const totalCogs = cogsValues.reduce((sum, value) => sum + value, 0);

  const inventoryValues = input.inventoryRows
    .map((row) => computeInventoryValue(row.onHandQty, row.unitCost))
    .filter((value): value is number => value !== null);
  const totalInventoryValue = inventoryValues.reduce((sum, value) => sum + value, 0);

  const inventoryTurnover = computeInventoryTurnover(totalCogs, totalInventoryValue);
  const turnoverHealth =
    inventoryTurnover !== null ? computeTurnoverHealth(inventoryTurnover) : null;

  // --- Warehouse Utilization, per warehouse ---
  const warehouseUtilizations: WarehouseUtilizationResult[] = input.warehouses.map((warehouse) => ({
    warehouseId: warehouse.warehouseId,
    utilizationPercent: computeWarehouseUtilization(warehouse.totalOnHand, warehouse.capacityUnits),
  }));

  const utilizationHealthValues = warehouseUtilizations
    .map((warehouse) =>
      warehouse.utilizationPercent !== null
        ? computeWarehouseUtilizationHealth(warehouse.utilizationPercent)
        : null,
    )
    .filter((value): value is number => value !== null);
  const avgWarehouseUtilizationHealth = meanOrNull(utilizationHealthValues);

  // --- Inventory Health, averaged across all Inventory rows ---
  const inventoryHealthValues = input.inventoryRows
    .map((row) => computeInventoryHealthScore(row.onHandQty, row.reorderPoint))
    .filter((value): value is number => value !== null);
  const avgInventoryHealth = meanOrNull(inventoryHealthValues);

  // --- Supplier Reliability, averaged across scored suppliers ---
  const validReliabilityScores = input.supplierReliabilityScores.filter(
    (score): score is number => score !== null,
  );
  const avgSupplierReliability = meanOrNull(validReliabilityScores);

  // --- Forecast Accuracy: 100 - average MAPE, floored at 0 ---
  const validMapeValues = input.forecastMapeValues.filter((mape): mape is number => mape !== null);
  const avgForecastAccuracy =
    validMapeValues.length > 0 ? Math.max(0, 100 - mean(validMapeValues)) : null;

  const operationsHealthScore = computeOperationsHealthScore({
    inventoryHealth: avgInventoryHealth,
    supplierReliability: avgSupplierReliability,
    forecastAccuracy: avgForecastAccuracy,
    warehouseUtilizationHealth: avgWarehouseUtilizationHealth,
    turnoverHealth,
  });

  return {
    inventoryTurnover,
    warehouseUtilizations,
    operationsHealthScore,
    operationsHealthComponents: {
      avgInventoryHealth,
      avgSupplierReliability,
      avgForecastAccuracy,
      avgWarehouseUtilizationHealth,
      turnoverHealth,
    },
  };
}
