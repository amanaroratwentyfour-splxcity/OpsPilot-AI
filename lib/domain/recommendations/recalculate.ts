import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCompanyAnalyticsSnapshot } from "../analytics/recalculate";
import { findCriticalInventoryPositions } from "./criticalInventory";
import { findOverstockedPositions } from "./overstockedInventory";
import { findLowReliabilitySuppliers } from "./lowReliabilitySuppliers";
import { findOverduePurchaseOrders } from "./overduePurchaseOrders";
import { findWarehousesNearCapacity } from "./warehousesNearCapacity";
import { findDemandIncreaseCandidates, type DemandTrendInput } from "./demandIncrease";
import { pickMoreAccurateForecast } from "./pickMoreAccurateForecast";
import { computeRecommendationSyncPlan, type ExistingRecommendationRow } from "./syncPlan";
import type { RecommendationCandidate } from "./recommendationCandidate";

/** Accepts either the shared Prisma singleton or a transaction client. */
type Db = typeof prisma | Prisma.TransactionClient;

function meanOrNull(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

/**
 * Fetches every completed engine's current output and runs all six
 * Recommendation Rule Engine functions (Milestone "Operations Copilot —
 * Recommendation Rule Engine") over it. Read-only — no formulas and no
 * writes live here; this is pure I/O shaping plus composition, exactly
 * like every other engine's orchestrator.
 *
 * Reuses getCompanyAnalyticsSnapshot (Analytics Engine) for warehouse
 * utilization rather than re-querying/recomputing it — the one place this
 * orchestrator calls into another engine's orchestrator instead of raw
 * Prisma.
 *
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton, so tests can run this inside a transaction that's rolled
 *   back afterward with zero persistent side effects.
 */
export async function generateAllRecommendationCandidates(
  db: Db = prisma,
): Promise<RecommendationCandidate[]> {
  const inventoryRows = await db.inventory.findMany({
    select: {
      onHandQty: true,
      reorderPoint: true,
      stockStatus: true,
      product: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
  });
  const positions = inventoryRows.map((row) => ({
    productId: row.product.id,
    productName: row.product.name,
    warehouseId: row.warehouse.id,
    warehouseName: row.warehouse.name,
    onHandQty: row.onHandQty,
    reorderPoint: row.reorderPoint,
    stockStatus: row.stockStatus,
  }));

  const suppliers = await db.supplier.findMany({
    select: { id: true, name: true, reliabilityScore: true },
  });
  const supplierPositions = suppliers.map((s) => ({
    supplierId: s.id,
    supplierName: s.name,
    reliabilityScore: s.reliabilityScore,
  }));

  const inTransitOrders = await db.purchaseOrder.findMany({
    where: { status: "IN_TRANSIT" },
    select: {
      id: true,
      status: true,
      expectedDeliveryDate: true,
      supplier: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
  });
  const orderPositions = inTransitOrders.map((order) => ({
    purchaseOrderId: order.id,
    supplierId: order.supplier.id,
    supplierName: order.supplier.name,
    warehouseId: order.warehouse.id,
    warehouseName: order.warehouse.name,
    status: order.status,
    expectedDeliveryDate: order.expectedDeliveryDate,
  }));

  const snapshot = await getCompanyAnalyticsSnapshot(db);
  const warehouses = await db.warehouse.findMany({ select: { id: true, name: true } });
  const warehouseNameById = new Map(warehouses.map((w) => [w.id, w.name]));
  const warehouseUtilizations = snapshot.warehouseUtilizations.map((w) => ({
    warehouseId: w.warehouseId,
    warehouseName: warehouseNameById.get(w.warehouseId) ?? "",
    utilizationPercent: w.utilizationPercent,
  }));

  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
      forecasts: {
        orderBy: { periodDate: "asc" },
        select: { method: true, forecastQty: true, mape: true },
      },
    },
  });
  const demandTrendInputs: DemandTrendInput[] = products.map((product) => {
    const movingAverage = product.forecasts.filter((f) => f.method === "MOVING_AVERAGE");
    const exponentialSmoothing = product.forecasts.filter(
      (f) => f.method === "EXPONENTIAL_SMOOTHING",
    );

    const chosen = pickMoreAccurateForecast({
      movingAverage: {
        forecastSeries: movingAverage.map((f) => f.forecastQty),
        aggregateMAPE: meanOrNull(
          movingAverage.map((f) => f.mape).filter((m): m is number => m !== null),
        ),
      },
      exponentialSmoothing: {
        forecastSeries: exponentialSmoothing.map((f) => f.forecastQty),
        aggregateMAPE: meanOrNull(
          exponentialSmoothing.map((f) => f.mape).filter((m): m is number => m !== null),
        ),
      },
    });

    return {
      productId: product.id,
      productName: product.name,
      forecastSeries: chosen.forecastSeries,
      aggregateMAPE: chosen.aggregateMAPE,
    };
  });

  return [
    ...findCriticalInventoryPositions(positions),
    ...findOverstockedPositions(positions),
    ...findLowReliabilitySuppliers(supplierPositions),
    ...findOverduePurchaseOrders(orderPositions),
    ...findWarehousesNearCapacity(warehouseUtilizations),
    ...findDemandIncreaseCandidates(demandTrendInputs),
  ];
}

export interface RecalculateRecommendationsResult {
  candidatesGenerated: number;
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

/**
 * Fetches the currently-ACTIVE AIRecommendation rows, computes the sync
 * plan (syncPlan.ts) against the supplied candidates, and executes it.
 * Rows in ACCEPTED/DISMISSED/SNOOZED are never fetched here, so they can
 * never be touched even by mistake.
 *
 * Wrapped in a single Prisma transaction so the table is never left
 * partially synchronized if an error occurs mid-way — unlike every earlier
 * engine's recalculation (which only ever does one kind of write),
 * this operation does inserts, updates, and deletes together, so a
 * mid-run failure has a real partial-state risk the others don't.
 *
 * If `db` is already a transaction client (e.g. a test's rolled-back
 * transaction), the sync runs directly against it instead of opening a
 * nested one — Prisma doesn't support nested interactive transactions, and
 * running inside the caller's existing transaction is already atomic.
 *
 * @param candidates - typically generateAllRecommendationCandidates's output
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton, opening its own transaction in that case.
 */
export async function syncRecommendations(
  candidates: RecommendationCandidate[],
  db: Db = prisma,
): Promise<RecalculateRecommendationsResult> {
  if (db === prisma) {
    return prisma.$transaction((tx) => runSync(candidates, tx));
  }
  return runSync(candidates, db);
}

async function runSync(
  candidates: RecommendationCandidate[],
  db: Db,
): Promise<RecalculateRecommendationsResult> {
  const existingActiveRows = await db.aIRecommendation.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      category: true,
      severity: true,
      metricJustification: true,
      productId: true,
      supplierId: true,
      warehouseId: true,
    },
  });
  const existingActive: ExistingRecommendationRow[] = existingActiveRows;

  const plan = computeRecommendationSyncPlan(existingActive, candidates);

  if (plan.toInsert.length > 0) {
    await db.aIRecommendation.createMany({
      data: plan.toInsert.map((candidate) => ({
        category: candidate.category,
        severity: candidate.severity,
        metricJustification: candidate.justification,
        productId: candidate.productId,
        supplierId: candidate.supplierId,
        warehouseId: candidate.warehouseId,
      })),
    });
  }

  for (const { id, candidate } of plan.toUpdate) {
    await db.aIRecommendation.update({
      where: { id },
      data: { severity: candidate.severity, metricJustification: candidate.justification },
    });
  }

  if (plan.toDelete.length > 0) {
    await db.aIRecommendation.deleteMany({ where: { id: { in: plan.toDelete } } });
  }

  return {
    candidatesGenerated: candidates.length,
    created: plan.toInsert.length,
    updated: plan.toUpdate.length,
    deleted: plan.toDelete.length,
    unchanged: candidates.length - plan.toInsert.length - plan.toUpdate.length,
  };
}

/**
 * Top-level entry point: generates fresh candidates from every completed
 * engine's current output, then synchronizes them into AIRecommendation.
 * There is no per-entity variant — every one of the six rule functions is
 * a whole-catalog/company-wide scan (two aren't even entity-scoped), so
 * "recalculate recommendations for just one product" has no meaning here,
 * the same reasoning as ABC Analysis having no per-product variant.
 *
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton, so tests can run this inside a transaction that's rolled
 *   back afterward with zero persistent side effects.
 */
export async function recalculateAllRecommendations(
  db: Db = prisma,
): Promise<RecalculateRecommendationsResult> {
  const candidates = await generateAllRecommendationCandidates(db);
  return syncRecommendations(candidates, db);
}
