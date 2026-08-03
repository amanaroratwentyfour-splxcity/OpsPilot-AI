import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildImportPlan, type ImportPlan } from "./buildImportPlan";
import type { ParsedWorkbook } from "./parseWorkbook";

/** Accepts either the shared Prisma singleton or a transaction client — same convention as every lib/domain recalculate.ts orchestrator. */
type Db = typeof prisma | Prisma.TransactionClient;

export interface ImportCounts {
  products: number;
  suppliers: number;
  warehouses: number;
  inventory: number;
  demandHistory: number;
  purchaseOrders: number;
  purchaseOrderItems: number;
}

/**
 * Replaces every existing business-data row with the contents of an
 * already-validated workbook, inside one transaction. Never touches
 * calculated fields (safety stock, reorder point, ABC class, supplier
 * reliability, forecasts, recommendations) — those are wiped along with
 * everything else and are the Operations Engines' job to regenerate, via
 * the recalculation pipeline the caller runs immediately after this
 * commits (see app/api/import-center/import/route.ts).
 *
 * @param parsed - output of parseWorkbook(), already confirmed
 *   `!validateParsedWorkbook(parsed).blocked` by the caller.
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton, opening its own transaction in that case. Accepting this as
 *   a parameter (rather than importing the singleton directly) is what
 *   lets integration tests run the whole import inside a transaction that
 *   gets rolled back afterward, with zero persistent side effects.
 */
export async function importWorkbook(parsed: ParsedWorkbook, db: Db = prisma): Promise<ImportCounts> {
  const plan = buildImportPlan(parsed);

  if (db === prisma) {
    return prisma.$transaction((tx) => runImport(plan, tx), { timeout: 60000 });
  }
  return runImport(plan, db);
}

/**
 * Delete order is children-before-parents, satisfying every `ON DELETE
 * RESTRICT` constraint in the schema; insert order is the exact reverse
 * (parents before children). See DATA_IMPORT_ARCHITECTURE.md §4.1 for the
 * dependency reasoning behind this specific ordering.
 */
async function runImport(plan: ImportPlan, db: Db): Promise<ImportCounts> {
  await db.aIRecommendation.deleteMany({});
  await db.inventoryTransaction.deleteMany({});
  await db.purchaseOrderItem.deleteMany({});
  await db.forecast.deleteMany({});
  await db.demandHistory.deleteMany({});
  await db.inventory.deleteMany({});
  await db.purchaseOrder.deleteMany({});
  await db.product.deleteMany({});
  await db.supplier.deleteMany({});
  await db.warehouse.deleteMany({});

  await db.warehouse.createMany({ data: plan.warehouses });
  await db.supplier.createMany({ data: plan.suppliers });
  await db.product.createMany({ data: plan.products });
  await db.inventory.createMany({ data: plan.inventory });
  await db.demandHistory.createMany({ data: plan.demandHistory });
  await db.purchaseOrder.createMany({ data: plan.purchaseOrders });
  await db.purchaseOrderItem.createMany({ data: plan.purchaseOrderItems });

  return {
    products: plan.products.length,
    suppliers: plan.suppliers.length,
    warehouses: plan.warehouses.length,
    inventory: plan.inventory.length,
    demandHistory: plan.demandHistory.length,
    purchaseOrders: plan.purchaseOrders.length,
    purchaseOrderItems: plan.purchaseOrderItems.length,
  };
}
