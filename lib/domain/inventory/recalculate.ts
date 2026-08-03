import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { computeProductInventoryMetrics, type ProductInventoryMetrics } from "./productMetrics";

/** Accepts either the shared Prisma singleton or a transaction client. */
type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Recalculates and persists Inventory Engine metrics for one product.
 *
 * This function is pure I/O plus composition — it contains no formulas of
 * its own (see productMetrics.ts, which is where computeDemandStatistics,
 * computeSafetyStock, computeReorderPoint, classifyStockStatus, and
 * computeInventoryHealthScore are actually composed). Its only job is:
 * fetch this product's demand history / lead time / current Inventory rows,
 * hand them to computeProductInventoryMetrics, and write the result back.
 *
 * If the product has insufficient demand history (< 2 weeks — see
 * computeDemandStatistics), safetyStock/reorderPoint are `null` per the
 * domain layer's contract. Rather than overwrite existing Inventory rows
 * with a misleading default (e.g. 0, which would imply "needs no buffer at
 * all"), this function leaves those rows untouched. The same applies, per
 * warehouse, if a row's on-hand quantity is invalid (e.g. negative) and
 * therefore its stock status can't be classified. Callers can detect this
 * from the returned metrics (`safetyStock`/`reorderPoint` will be `null`,
 * or a given warehouse's `stockStatus` will be `null`).
 *
 * @param productId
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton. Accepting this as a parameter (rather than importing the
 *   singleton directly) is what lets tests run this inside a transaction
 *   that gets rolled back afterward, with zero persistent side effects on
 *   the real database.
 */
export async function recalculateInventoryForProduct(
  productId: string,
  db: Db = prisma,
): Promise<ProductInventoryMetrics> {
  const product = await db.product.findUniqueOrThrow({
    where: { id: productId },
    select: {
      leadTimeDays: true,
      demandHistory: { select: { quantitySold: true } },
      inventory: { select: { id: true, warehouseId: true, onHandQty: true } },
    },
  });

  const metrics = computeProductInventoryMetrics(
    productId,
    product.demandHistory.map((entry) => entry.quantitySold),
    product.leadTimeDays,
    product.inventory.map((inv) => ({ warehouseId: inv.warehouseId, onHandQty: inv.onHandQty })),
  );

  const now = new Date();

  for (const inv of product.inventory) {
    const warehouseMetrics = metrics.warehouses.find((w) => w.warehouseId === inv.warehouseId);

    if (
      !warehouseMetrics ||
      metrics.safetyStock === null ||
      metrics.reorderPoint === null ||
      warehouseMetrics.stockStatus === null
    ) {
      continue;
    }

    await db.inventory.update({
      where: { id: inv.id },
      data: {
        safetyStock: metrics.safetyStock,
        reorderPoint: metrics.reorderPoint,
        stockStatus: warehouseMetrics.stockStatus,
        lastCalculatedAt: now,
      },
    });
  }

  return metrics;
}

export interface RecalculateAllInventoryResult {
  productsProcessed: number;
  productsSkipped: number;
  warnings: string[];
}

/**
 * Runs recalculateInventoryForProduct for every product in the catalog.
 *
 * Sequential, not parallel: SQLite allows only one writer at a time, so
 * concurrent writes would just serialize behind the scenes anyway — running
 * sequentially keeps a single product's failure isolated and the whole
 * operation easy to reason about and log.
 */
export async function recalculateAllInventory(
  db: Db = prisma,
): Promise<RecalculateAllInventoryResult> {
  const products = await db.product.findMany({ select: { id: true } });
  const warnings: string[] = [];
  let productsSkipped = 0;

  for (const { id } of products) {
    const metrics = await recalculateInventoryForProduct(id, db);
    if (metrics.safetyStock === null || metrics.reorderPoint === null) {
      productsSkipped += 1;
      warnings.push(
        `Product ${id}: insufficient demand history (< 2 weeks) — Inventory rows left unchanged.`,
      );
    }
  }

  return { productsProcessed: products.length, productsSkipped, warnings };
}
