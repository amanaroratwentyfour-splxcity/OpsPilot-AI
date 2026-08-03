import type { Prisma } from "@/lib/generated/prisma/client";
import { PurchaseOrderStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { computeSupplierMetrics, type SupplierMetrics } from "./supplierMetrics";

/** Accepts either the shared Prisma singleton or a transaction client. */
type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Recalculates and persists the Reliability Score for one supplier.
 *
 * Pure I/O plus composition — no formulas live here (see supplierMetrics.ts
 * and its three component files: onTimeDeliveryRate.ts,
 * leadTimeConsistency.ts, priceStability.ts). Fetches this supplier's
 * purchase order history once, derives the two shapes the domain layer
 * needs from it (RECEIVED orders with valid dates for delivery-performance
 * components; unit cost history grouped by product, from orders of any
 * status, for price stability), hands them to computeSupplierMetrics, and
 * writes the result back.
 *
 * Unlike the Inventory Engine's orchestrator (Milestone 2.3), this always
 * writes the computed value — including `null` — rather than skipping the
 * write when data is insufficient. That's a schema difference, not an
 * inconsistency: `Inventory.safetyStock`/`reorderPoint`/`stockStatus` are
 * NOT NULL columns (skipping was the only way to avoid overwriting real
 * data with a guess), whereas `Supplier.reliabilityScore` is nullable and
 * `null` is exactly the correct, honest value when a supplier doesn't yet
 * have enough order history to be scored.
 *
 * @param supplierId
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton, so tests can run this inside a transaction that's rolled
 *   back afterward with zero persistent side effects.
 */
export async function recalculateSupplierReliability(
  supplierId: string,
  db: Db = prisma,
): Promise<SupplierMetrics> {
  const supplier = await db.supplier.findUniqueOrThrow({
    where: { id: supplierId },
    select: {
      contractedLeadTimeDays: true,
      purchaseOrders: {
        select: {
          status: true,
          orderDate: true,
          expectedDeliveryDate: true,
          actualDeliveryDate: true,
          items: { select: { productId: true, unitCost: true } },
        },
      },
    },
  });

  const receivedOrders = supplier.purchaseOrders
    .filter(
      (order): order is typeof order & { expectedDeliveryDate: Date; actualDeliveryDate: Date } =>
        order.status === PurchaseOrderStatus.RECEIVED &&
        order.expectedDeliveryDate !== null &&
        order.actualDeliveryDate !== null,
    )
    .map((order) => ({
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      actualDeliveryDate: order.actualDeliveryDate,
    }));

  const unitCostsByProduct = new Map<string, number[]>();
  for (const order of supplier.purchaseOrders) {
    for (const item of order.items) {
      const existing = unitCostsByProduct.get(item.productId) ?? [];
      existing.push(item.unitCost);
      unitCostsByProduct.set(item.productId, existing);
    }
  }

  const metrics = computeSupplierMetrics(
    supplierId,
    receivedOrders,
    supplier.contractedLeadTimeDays,
    unitCostsByProduct,
  );

  await db.supplier.update({
    where: { id: supplierId },
    data: { reliabilityScore: metrics.reliabilityScore },
  });

  return metrics;
}

export interface RecalculateAllSupplierReliabilityResult {
  suppliersScored: number;
  suppliersInsufficientData: number;
}

/**
 * Runs recalculateSupplierReliability for every supplier, sequentially
 * (see Milestone 2.3's recalculateAllInventory for the same SQLite
 * single-writer rationale).
 */
export async function recalculateAllSupplierReliability(
  db: Db = prisma,
): Promise<RecalculateAllSupplierReliabilityResult> {
  const suppliers = await db.supplier.findMany({ select: { id: true } });
  let suppliersScored = 0;
  let suppliersInsufficientData = 0;

  for (const { id } of suppliers) {
    const metrics = await recalculateSupplierReliability(id, db);
    if (metrics.reliabilityScore === null) {
      suppliersInsufficientData += 1;
    } else {
      suppliersScored += 1;
    }
  }

  return { suppliersScored, suppliersInsufficientData };
}
