import { describe, expect, it } from "vitest";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getCompanyAnalyticsSnapshot,
  recalculateABCClassification,
} from "@/lib/domain/analytics/recalculate";

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
      { timeout: 60000 },
    ),
  ).rejects.toThrow(RollbackForTest);
}

describe("recalculateABCClassification (integration)", () => {
  it("classifies the entire seeded catalog in one batch, with no exclusions", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const totalProducts = await tx.product.count();

      const result = await recalculateABCClassification(tx);

      expect(result.productsClassified).toBe(totalProducts);
      expect(result.productsExcluded).toBe(0);
      expect(result.warnings).toEqual([]);
    });
  }, 30000);

  it("persists a class for every product and produces all three classes", async () => {
    await runInRolledBackTransaction(async (tx) => {
      await recalculateABCClassification(tx);

      const distribution = await tx.product.groupBy({
        by: ["abcClass"],
        _count: true,
      });

      const classes = distribution.map((row) => row.abcClass);
      expect(classes).toContain("A");
      expect(classes).toContain("B");
      expect(classes).toContain("C");

      // No product should be left unclassified after a full run.
      const unclassified = await tx.product.count({ where: { abcClass: null } });
      expect(unclassified).toBe(0);
    });
  }, 30000);

  it("classifies the empirically-verified top usage-value product as Class A", async () => {
    await runInRolledBackTransaction(async (tx) => {
      await recalculateABCClassification(tx);

      // BEV-0012 (NovaFizz Apple Juice 1L) was confirmed via a direct SQL
      // query against the seeded data to be the catalog's #1 product by
      // usage value (annualDemand x unitCost), sitting at ~1.1% cumulative
      // value — comfortably inside the 80% Class A cutoff. Deliberately
      // NOT the highest-raw-demand SKU (BEV-0001, the "hero" cola product,
      // which has the lowest unit cost in its category and lands in Class
      // B at ~93% cumulative instead): usage value peaks where demand and
      // unit cost trade off, not at either extreme of the catalog, which
      // is exactly the kind of realistic nuance ABC Analysis is meant to
      // surface — verified empirically here rather than assumed.
      const topProduct = await tx.product.findUniqueOrThrow({ where: { sku: "BEV-0012" } });
      expect(topProduct.abcClass).toBe("A");

      const heroVolumeProduct = await tx.product.findUniqueOrThrow({ where: { sku: "BEV-0001" } });
      expect(heroVolumeProduct.abcClass).toBe("B");
    });
  }, 30000);

  it("is idempotent: recalculating twice in a row produces the same classification", async () => {
    await runInRolledBackTransaction(async (tx) => {
      await recalculateABCClassification(tx);
      const firstPass = await tx.product.findMany({ select: { id: true, abcClass: true } });

      await recalculateABCClassification(tx);
      const secondPass = await tx.product.findMany({ select: { id: true, abcClass: true } });

      const firstById = new Map(firstPass.map((p) => [p.id, p.abcClass]));
      for (const product of secondPass) {
        expect(product.abcClass).toBe(firstById.get(product.id));
      }
    });
  }, 30000);
});

describe("getCompanyAnalyticsSnapshot (integration)", () => {
  it("is read-only: never writes anything", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const beforeAbcClasses = await tx.product.findMany({ select: { abcClass: true } });
      const beforeReliabilityScores = await tx.supplier.findMany({
        select: { reliabilityScore: true },
      });

      await getCompanyAnalyticsSnapshot(tx);

      const afterAbcClasses = await tx.product.findMany({ select: { abcClass: true } });
      const afterReliabilityScores = await tx.supplier.findMany({
        select: { reliabilityScore: true },
      });

      expect(afterAbcClasses).toEqual(beforeAbcClasses);
      expect(afterReliabilityScores).toEqual(beforeReliabilityScores);
    });
  }, 30000);

  it("computes warehouse utilization matching the values baked into the seed script's capacity calibration", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const snapshot = await getCompanyAnalyticsSnapshot(tx);

      // Confirmed via a direct SQL query against the seeded data: warehouse
      // capacities were calibrated FROM these exact target utilizations in
      // Milestone 1.3, so recomputing utilization now should reproduce them.
      const byWarehouseName = new Map<string, number | null>();
      const warehouses = await tx.warehouse.findMany({ select: { id: true, name: true } });
      for (const warehouse of warehouses) {
        const result = snapshot.warehouseUtilizations.find((w) => w.warehouseId === warehouse.id);
        byWarehouseName.set(warehouse.name, result?.utilizationPercent ?? null);
      }

      expect(byWarehouseName.get("NovaFoods Mumbai Distribution Center")).toBeCloseTo(91, 0);
      expect(byWarehouseName.get("NovaFoods Delhi Distribution Center")).toBeCloseTo(78, 0);
      expect(byWarehouseName.get("NovaFoods Bengaluru Distribution Center")).toBeCloseTo(63, 0);
      expect(byWarehouseName.get("NovaFoods Kolkata Distribution Center")).toBeCloseTo(46, 0);
    });
  }, 30000);

  it("computes a non-null Inventory Turnover and Operations Health Score from the full seeded dataset", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const snapshot = await getCompanyAnalyticsSnapshot(tx);

      expect(snapshot.inventoryTurnover).not.toBeNull();
      expect(snapshot.inventoryTurnover!).toBeGreaterThan(0);

      // Every seeded supplier has a reliabilityScore and every seeded
      // forecast has a mape (confirmed via direct query: 20/20 suppliers,
      // 4872/4872 forecasts) -- so all five Operations Health Score
      // components should be available, no renormalization needed.
      const components = snapshot.operationsHealthComponents;
      expect(components.avgInventoryHealth).not.toBeNull();
      expect(components.avgSupplierReliability).not.toBeNull();
      expect(components.avgForecastAccuracy).not.toBeNull();
      expect(components.avgWarehouseUtilizationHealth).not.toBeNull();
      expect(components.turnoverHealth).not.toBeNull();

      expect(snapshot.operationsHealthScore).not.toBeNull();
      expect(snapshot.operationsHealthScore!).toBeGreaterThanOrEqual(0);
      expect(snapshot.operationsHealthScore!).toBeLessThanOrEqual(100);
    });
  }, 30000);
});
