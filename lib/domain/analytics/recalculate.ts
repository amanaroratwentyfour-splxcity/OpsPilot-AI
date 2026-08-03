import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { computeAnnualDemand } from "../procurement/annualDemand";
import { computeUsageValue } from "./usageValue";
import { classifyABC, type ProductUsageValue } from "./abcClassification";
import { computeCompanyAnalyticsSnapshot, type CompanyAnalyticsSnapshot } from "./companyAnalytics";

/** Accepts either the shared Prisma singleton or a transaction client. */
type Db = typeof prisma | Prisma.TransactionClient;

export interface RecalculateABCClassificationResult {
  productsClassified: number;
  productsExcluded: number;
  warnings: string[];
}

/**
 * Recalculates and persists ABC classification for the ENTIRE product
 * catalog in one pass. There is no per-product variant — see
 * abcClassification.ts for why that would be meaningless for this metric.
 *
 * Pure I/O plus composition — no formulas live here. Fetches every
 * product's demand history and unit cost in a single batch query, derives
 * each product's annual demand via computeAnnualDemand (reused from the
 * Procurement Engine, Milestone 2.4 — the trailing-52-week convention is
 * not reimplemented here), turns that into a usage value via
 * computeUsageValue, hands the whole batch to classifyABC, and writes the
 * results back.
 *
 * A product is excluded from classification (and reported in `warnings`)
 * only if its usage value is genuinely uncomputable (negative/non-finite
 * unitCost or annual demand — a data-integrity problem, not a normal
 * "no sales yet" product, which legitimately gets usage value 0 and lands
 * in Class C by construction).
 *
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton, so tests can run this inside a transaction that's rolled
 *   back afterward with zero persistent side effects.
 */
export async function recalculateABCClassification(
  db: Db = prisma,
): Promise<RecalculateABCClassificationResult> {
  const products = await db.product.findMany({
    select: {
      id: true,
      sku: true,
      unitCost: true,
      demandHistory: {
        orderBy: { periodDate: "asc" },
        select: { quantitySold: true },
      },
    },
  });

  const warnings: string[] = [];
  const usageValues: ProductUsageValue[] = [];

  for (const product of products) {
    const series = product.demandHistory.map((entry) => entry.quantitySold);
    const { annualDemand } = computeAnnualDemand(series);
    const usageValue = computeUsageValue(annualDemand, product.unitCost);

    if (usageValue === null) {
      warnings.push(
        `Product ${product.id} (${product.sku}): invalid unitCost or annual demand — excluded from ABC classification.`,
      );
      continue;
    }

    usageValues.push({ productId: product.id, sku: product.sku, usageValue });
  }

  const classifications = classifyABC(usageValues);

  if (classifications === null) {
    return {
      productsClassified: 0,
      productsExcluded: products.length,
      warnings: [
        ...warnings,
        "ABC classification refused: no product in the catalog has a positive usage value.",
      ],
    };
  }

  for (const result of classifications) {
    await db.product.update({
      where: { id: result.productId },
      data: { abcClass: result.abcClass },
    });
  }

  return {
    productsClassified: classifications.length,
    productsExcluded: products.length - classifications.length,
    warnings,
  };
}

/**
 * Computes Inventory Turnover, every warehouse's Utilization, and the
 * Operations Health Score, all in one pass.
 *
 * Unlike recalculateABCClassification, this is READ-ONLY — it writes
 * nothing. None of these three metrics are persisted anywhere
 * (OPERATIONS_ENGINE_SPEC.md §4.6/§4.7/§4.10 all describe them as computed
 * on read), so there is no "recalculate" step, only a "compute a snapshot
 * right now" one. It lives alongside recalculateABCClassification in this
 * file because both are Analytics Engine orchestrators over the same kind
 * of full-catalog data, not because this one recalculates anything.
 *
 * Pure I/O plus composition — no formulas live here (see
 * companyAnalytics.ts and its component files). Fetches every product's
 * demand history/unit cost, every Inventory row, every warehouse's total
 * on-hand stock, every supplier's reliability score, and every forecast's
 * MAPE, in five batch queries, and hands the shaped result to
 * computeCompanyAnalyticsSnapshot.
 *
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton, so tests can run this inside a transaction that's rolled
 *   back afterward with zero persistent side effects.
 */
export async function getCompanyAnalyticsSnapshot(
  db: Db = prisma,
): Promise<CompanyAnalyticsSnapshot> {
  const products = await db.product.findMany({
    select: {
      unitCost: true,
      demandHistory: {
        orderBy: { periodDate: "asc" },
        select: { quantitySold: true },
      },
    },
  });
  const productInputs = products.map((product) => ({
    annualDemand: computeAnnualDemand(product.demandHistory.map((entry) => entry.quantitySold))
      .annualDemand,
    unitCost: product.unitCost,
  }));

  const inventoryRows = await db.inventory.findMany({
    select: {
      onHandQty: true,
      reorderPoint: true,
      product: { select: { unitCost: true } },
    },
  });
  const inventoryRowInputs = inventoryRows.map((row) => ({
    onHandQty: row.onHandQty,
    unitCost: row.product.unitCost,
    reorderPoint: row.reorderPoint,
  }));

  const warehouses = await db.warehouse.findMany({
    select: {
      id: true,
      capacityUnits: true,
      inventory: { select: { onHandQty: true } },
    },
  });
  const warehouseInputs = warehouses.map((warehouse) => ({
    warehouseId: warehouse.id,
    totalOnHand: warehouse.inventory.reduce((sum, row) => sum + row.onHandQty, 0),
    capacityUnits: warehouse.capacityUnits,
  }));

  const suppliers = await db.supplier.findMany({ select: { reliabilityScore: true } });
  const supplierReliabilityScores = suppliers.map((supplier) => supplier.reliabilityScore);

  const forecasts = await db.forecast.findMany({ select: { mape: true } });
  const forecastMapeValues = forecasts.map((forecast) => forecast.mape);

  return computeCompanyAnalyticsSnapshot({
    products: productInputs,
    inventoryRows: inventoryRowInputs,
    warehouses: warehouseInputs,
    supplierReliabilityScores,
    forecastMapeValues,
  });
}
