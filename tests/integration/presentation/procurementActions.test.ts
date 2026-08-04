import { describe, expect, it } from "vitest";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createPurchaseOrder, ProcurementActionError } from "@/lib/presentation/procurementActions";

/**
 * Integration tests against the real seeded database (prisma/dev.db).
 *
 * Every test runs inside a Prisma interactive transaction and always
 * throws at the end to force a rollback — real reads and real writes are
 * exercised, but nothing persists. Same pattern as
 * tests/integration/domain/inventory/recalculate.test.ts.
 *
 * Regression coverage for the Procurement "no way to create a PO" UX gap
 * (UX_AUDIT.md P1): the EOQ Suggestions table computed a suggested reorder
 * quantity but had no action to turn it into a real purchase order.
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

describe("createPurchaseOrder (integration)", () => {
  it("creates a DRAFT purchase order with one line item, snapshotting the product's current unit cost", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { sku: "DAI-0001" } });
      const supplier = await tx.supplier.findFirstOrThrow();
      const warehouse = await tx.warehouse.findFirstOrThrow();

      const created = await createPurchaseOrder(
        { productId: product.id, supplierId: supplier.id, warehouseId: warehouse.id, quantity: 250 },
        tx,
      );

      expect(created.status).toBe("DRAFT");

      const persisted = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: created.id },
        include: { items: true },
      });
      expect(persisted.supplierId).toBe(supplier.id);
      expect(persisted.warehouseId).toBe(warehouse.id);
      expect(persisted.items).toHaveLength(1);
      expect(persisted.items[0].productId).toBe(product.id);
      expect(persisted.items[0].quantity).toBe(250);
      expect(persisted.items[0].unitCost).toBe(product.unitCost);
    });
  });

  it("rejects a zero or negative quantity without touching the database", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { sku: "DAI-0001" } });
      const supplier = await tx.supplier.findFirstOrThrow();
      const warehouse = await tx.warehouse.findFirstOrThrow();
      const countBefore = await tx.purchaseOrder.count();

      await expect(
        createPurchaseOrder(
          { productId: product.id, supplierId: supplier.id, warehouseId: warehouse.id, quantity: 0 },
          tx,
        ),
      ).rejects.toThrow(ProcurementActionError);

      expect(await tx.purchaseOrder.count()).toBe(countBefore);
    });
  });

  it("rejects an unknown productId with a 404-flavored error", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const supplier = await tx.supplier.findFirstOrThrow();
      const warehouse = await tx.warehouse.findFirstOrThrow();

      await expect(
        createPurchaseOrder(
          { productId: "not-a-real-product-id", supplierId: supplier.id, warehouseId: warehouse.id, quantity: 10 },
          tx,
        ),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
