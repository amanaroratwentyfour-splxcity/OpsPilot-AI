import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  recalculateAllInventory,
  recalculateInventoryForProduct,
} from "@/lib/domain/inventory/recalculate";

/**
 * Integration tests against the real seeded database (prisma/dev.db).
 *
 * Every test runs inside a Prisma interactive transaction and always
 * throws at the end to force a rollback — real reads and real writes are
 * exercised (this is not mocked), but the transaction never commits, so
 * running this suite never leaves a persistent change in the seeded
 * dataset built in Milestone 1.3.
 */

class RollbackForTest extends Error {}

async function runInRolledBackTransaction(fn: (tx: Prisma.TransactionClient) => Promise<void>) {
  await expect(
    prisma.$transaction(async (tx) => {
      await fn(tx);
      throw new RollbackForTest();
    }),
  ).rejects.toThrow(RollbackForTest);
}

describe("recalculateInventoryForProduct (integration)", () => {
  it("recomputes and persists metrics for a real seeded product", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { sku: "DAI-0001" } });

      const metrics = await recalculateInventoryForProduct(product.id, tx);

      expect(metrics.productId).toBe(product.id);
      expect(metrics.demandStatistics).not.toBeNull();
      expect(metrics.safetyStock).not.toBeNull();
      expect(metrics.reorderPoint).not.toBeNull();
      expect(metrics.safetyStock!).toBeGreaterThan(0);
      expect(metrics.reorderPoint!).toBeGreaterThan(metrics.safetyStock!);
      expect(metrics.warehouses.length).toBeGreaterThan(0);

      // Confirm the write actually happened (read-your-own-writes within
      // the same transaction), not just that the in-memory metrics look right.
      const updatedRows = await tx.inventory.findMany({ where: { productId: product.id } });
      expect(updatedRows.length).toBe(metrics.warehouses.length);

      for (const row of updatedRows) {
        const expected = metrics.warehouses.find((w) => w.warehouseId === row.warehouseId)!;
        expect(row.safetyStock).toBeCloseTo(metrics.safetyStock!, 6);
        expect(row.reorderPoint).toBeCloseTo(metrics.reorderPoint!, 6);
        expect(row.stockStatus).toBe(expected.stockStatus);
        expect(row.lastCalculatedAt).not.toBeNull();
      }
    });
  });

  it("leaves Inventory rows unchanged for a product with insufficient demand history", async () => {
    await runInRolledBackTransaction(async (tx) => {
      // Construct a synthetic product with only 1 week of demand history —
      // no real seeded product has this little history, so we build one to
      // exercise the "skip rather than guess" path.
      const supplier = await tx.supplier.findFirstOrThrow();
      const warehouse = await tx.warehouse.findFirstOrThrow();

      const product = await tx.product.create({
        data: {
          sku: `TEST-${randomUUID()}`,
          name: "Test Product With Sparse History",
          category: "HOUSEHOLD",
          unitOfMeasure: "unit",
          unitCost: 10,
          unitPrice: 15,
          leadTimeDays: 7,
          primarySupplierId: supplier.id,
        },
      });

      const originalInventory = await tx.inventory.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          onHandQty: 500,
          safetyStock: 42, // deliberately distinctive sentinel values
          reorderPoint: 99,
        },
      });

      await tx.demandHistory.create({
        data: { productId: product.id, periodDate: new Date("2026-01-05"), quantitySold: 700 },
      });

      const metrics = await recalculateInventoryForProduct(product.id, tx);

      expect(metrics.safetyStock).toBeNull();
      expect(metrics.reorderPoint).toBeNull();

      const unchangedRow = await tx.inventory.findUniqueOrThrow({
        where: { id: originalInventory.id },
      });
      expect(unchangedRow.safetyStock).toBe(42);
      expect(unchangedRow.reorderPoint).toBe(99);
      expect(unchangedRow.lastCalculatedAt).toBeNull();
    });
  });
});

describe("recalculateAllInventory (integration)", () => {
  it("processes the entire seeded catalog with no products skipped", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const totalProducts = await tx.product.count();

      const result = await recalculateAllInventory(tx);

      expect(result.productsProcessed).toBe(totalProducts);
      expect(result.productsSkipped).toBe(0);
      expect(result.warnings).toEqual([]);
    });
  }, 30000);
});
