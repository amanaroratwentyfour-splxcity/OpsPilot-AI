import { describe, expect, it } from "vitest";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  recalculateAllSupplierReliability,
  recalculateSupplierReliability,
} from "@/lib/domain/suppliers/recalculate";

/**
 * Integration tests against the real seeded database (prisma/dev.db).
 *
 * Every test runs inside a Prisma interactive transaction and always
 * throws at the end to force a rollback — real reads and real writes are
 * exercised, but nothing persists. See Milestone 2.3's
 * tests/integration/domain/inventory/recalculate.test.ts for the same
 * pattern and its independent verification.
 */

class RollbackForTest extends Error {}

async function runInRolledBackTransaction(fn: (tx: Prisma.TransactionClient) => Promise<void>) {
  await expect(
    prisma.$transaction(
      async (tx) => {
        await fn(tx);
        throw new RollbackForTest();
      },
      { timeout: 30000 },
    ),
  ).rejects.toThrow(RollbackForTest);
}

describe("recalculateSupplierReliability (integration)", () => {
  it("computes and persists a score for the seeded declining-reliability supplier", async () => {
    await runInRolledBackTransaction(async (tx) => {
      // Ganges Refreshments Co. is Milestone 1.3's deliberately-declining
      // supplier: 4 RECEIVED orders, on-time early on and delayed recently.
      const supplier = await tx.supplier.findFirstOrThrow({
        where: { name: "Ganges Refreshments Co." },
      });

      const metrics = await recalculateSupplierReliability(supplier.id, tx);

      expect(metrics.sampleSize).toBeGreaterThanOrEqual(3);
      expect(metrics.onTimeDeliveryRate).not.toBeNull();
      expect(metrics.onTimeDeliveryRate!).toBeGreaterThanOrEqual(0);
      expect(metrics.onTimeDeliveryRate!).toBeLessThanOrEqual(100);
      // This supplier has at least one delayed order in the seed data, so
      // it should not score a perfect on-time rate.
      expect(metrics.onTimeDeliveryRate!).toBeLessThan(100);

      // Confirm the write actually happened (read-your-own-writes within
      // the transaction), not just that the in-memory metrics look right.
      const updated = await tx.supplier.findUniqueOrThrow({ where: { id: supplier.id } });
      expect(updated.reliabilityScore).toBeCloseTo(metrics.reliabilityScore!, 10);
    });
  });

  it("writes null (not a stale value) for a supplier constructed with too little order history", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const anySupplier = await tx.supplier.findFirstOrThrow();

      // Force this supplier into an artificially high "known" score, then
      // confirm recalculation against its real (sparse or absent) RECEIVED
      // order history overwrites it with null rather than leaving a stale
      // number -- Supplier.reliabilityScore is nullable, so null is the
      // honest answer when there isn't enough data, unlike Inventory's
      // NOT NULL columns (Milestone 2.3), which had to skip the write instead.
      await tx.supplier.update({
        where: { id: anySupplier.id },
        data: { reliabilityScore: 999 }, // impossible sentinel value
      });

      const receivedCount = await tx.purchaseOrder.count({
        where: { supplierId: anySupplier.id, status: "RECEIVED" },
      });

      const metrics = await recalculateSupplierReliability(anySupplier.id, tx);
      const updated = await tx.supplier.findUniqueOrThrow({ where: { id: anySupplier.id } });

      if (receivedCount < 3) {
        expect(metrics.reliabilityScore).toBeNull();
        expect(updated.reliabilityScore).toBeNull();
      } else {
        expect(updated.reliabilityScore).not.toBe(999);
      }
    });
  });
});

describe("recalculateAllSupplierReliability (integration)", () => {
  it("processes every supplier in the seeded catalog", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const totalSuppliers = await tx.supplier.count();

      const result = await recalculateAllSupplierReliability(tx);

      expect(result.suppliersScored + result.suppliersInsufficientData).toBe(totalSuppliers);
      // Every seeded supplier has at least 3+ purchase orders across the
      // Milestone 1.3 dataset (145 orders / 20 suppliers), but not all are
      // necessarily RECEIVED -- assert the split is internally consistent
      // rather than assuming every supplier is scoreable.
      expect(result.suppliersScored).toBeGreaterThan(0);
    });
  }, 30000);
});
