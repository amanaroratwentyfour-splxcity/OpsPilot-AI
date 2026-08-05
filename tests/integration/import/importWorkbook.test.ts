import { describe, expect, it } from "vitest";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateTemplateWorkbook } from "@/lib/import/templateGenerator";
import { parseWorkbook, type ParsedWorkbook } from "@/lib/import/parseWorkbook";
import { importWorkbook } from "@/lib/import/importWorkbook";
import { recalculateAllInventory } from "@/lib/domain/inventory/recalculate";
import { recalculateAllSupplierReliability } from "@/lib/domain/suppliers/recalculate";
import { recalculateAllForecasts } from "@/lib/domain/forecasting/recalculate";
import { recalculateABCClassification } from "@/lib/domain/analytics/recalculate";
import { recalculateAllRecommendations } from "@/lib/domain/recommendations/recalculate";

/**
 * Integration tests against the real database. Every test that performs a
 * successful import runs inside a rolled-back transaction (same discipline
 * as every other engine's integration tests in this project) so the real
 * seeded dataset is never permanently touched. The one exception is the
 * "rollback safety" test at the bottom, which deliberately does NOT use
 * that wrapper — see its own comment for why that's still safe.
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

async function parsedTemplate(): Promise<ParsedWorkbook> {
  const buffer = await generateTemplateWorkbook();
  return parseWorkbook(buffer);
}

describe("importWorkbook (integration)", () => {
  it("replaces the existing business dataset with the workbook's contents", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const parsed = await parsedTemplate();

      const counts = await importWorkbook(parsed, tx);

      expect(counts).toEqual({
        products: 3,
        suppliers: 2,
        warehouses: 2,
        inventory: 3,
        demandHistory: 3,
        purchaseOrders: 2,
        purchaseOrderItems: 2,
      });

      // The old seeded catalog (203 products, 812 inventory positions, ...)
      // must be completely gone — only the freshly imported rows remain.
      expect(await tx.product.count()).toBe(3);
      expect(await tx.supplier.count()).toBe(2);
      expect(await tx.warehouse.count()).toBe(2);
      expect(await tx.inventory.count()).toBe(3);
      expect(await tx.demandHistory.count()).toBe(3);
      expect(await tx.purchaseOrder.count()).toBe(2);
      expect(await tx.purchaseOrderItem.count()).toBe(2);

      // Derived data tied to the old catalog must be gone too — nothing
      // orphaned pointing at products/suppliers/warehouses that no longer exist.
      expect(await tx.aIRecommendation.count()).toBe(0);
      expect(await tx.forecast.count()).toBe(0);
      expect(await tx.inventoryTransaction.count()).toBe(0);
    });
  }, 30000);

  it("resolves natural-key references to real, joinable foreign keys", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const parsed = await parsedTemplate();
      await importWorkbook(parsed, tx);

      const inventoryRow = await tx.inventory.findFirst({
        where: {
          product: { sku: "DAI-0001" },
          warehouse: { name: "Delhi Distribution Center" },
        },
        include: { product: true, warehouse: true },
      });
      expect(inventoryRow).not.toBeNull();
      expect(inventoryRow?.onHandQty).toBe(850);

      const itemRow = await tx.purchaseOrderItem.findFirst({
        where: { purchaseOrder: { status: "RECEIVED" }, product: { sku: "DAI-0001" } },
        include: { purchaseOrder: { include: { supplier: true, warehouse: true } } },
      });
      expect(itemRow).not.toBeNull();
      expect(itemRow?.purchaseOrder.supplier.name).toBe("Amrit Agro Foods Pvt. Ltd.");
      expect(itemRow?.purchaseOrder.warehouse.name).toBe("Delhi Distribution Center");

      const productWithSupplier = await tx.product.findUniqueOrThrow({
        where: { sku: "DAI-0001" },
        include: { primarySupplier: true },
      });
      expect(productWithSupplier.primarySupplier?.name).toBe("Amrit Agro Foods Pvt. Ltd.");
    });
  }, 30000);

  it("produces data the existing recalculation pipeline can process without reimplementing any formula", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const parsed = await parsedTemplate();
      await importWorkbook(parsed, tx);

      // Exactly the same five orchestrators app/api/import-center/import/route.ts
      // calls, in the same order — proving imported data is valid input for the
      // unmodified Operations Engines, not a parallel/duplicated calculation.
      await recalculateAllInventory(tx);
      await recalculateAllSupplierReliability(tx);
      await recalculateAllForecasts(tx);
      await recalculateABCClassification(tx);
      await recalculateAllRecommendations(tx);

      // DAI-0001 has exactly 2 weeks of DemandHistory in the template's own
      // example data — enough for the Inventory Engine's ≥2-week threshold —
      // so its Inventory rows should now carry real, engine-computed values.
      const recalculatedInventory = await tx.inventory.findMany({
        where: { product: { sku: "DAI-0001" } },
      });
      expect(recalculatedInventory.length).toBeGreaterThan(0);
      for (const row of recalculatedInventory) {
        expect(row.lastCalculatedAt).not.toBeNull();
      }

      // ABC Classification and Supplier Reliability are exactly the kind of
      // derived data the Executive Dashboard and Analytics pages read —
      // confirming they're populated is the safe proxy for "the dashboard
      // reflects imported data" without invoking presentation-layer code
      // (which reads the live `prisma` singleton directly and can't run
      // inside a test transaction).
      const classifiedProducts = await tx.product.count({ where: { abcClass: { not: null } } });
      expect(classifiedProducts).toBeGreaterThan(0);
    });
  }, 30000);

  it("never touches calculated fields itself — they start at schema defaults until recalculation runs", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const parsed = await parsedTemplate();
      await importWorkbook(parsed, tx);

      const inventoryRows = await tx.inventory.findMany();
      for (const row of inventoryRows) {
        expect(row.safetyStock).toBe(0);
        expect(row.reorderPoint).toBe(0);
        expect(row.stockStatus).toBe("HEALTHY");
        expect(row.lastCalculatedAt).toBeNull();
      }

      const products = await tx.product.findMany();
      expect(products.every((p) => p.abcClass === null)).toBe(true);

      const suppliers = await tx.supplier.findMany();
      expect(suppliers.every((s) => s.reliabilityScore === null)).toBe(true);
    });
  }, 30000);
});

describe("importWorkbook rollback safety (integration)", () => {
  /**
   * Deliberately NOT wrapped in runInRolledBackTransaction: the point of
   * this test is that importWorkbook(parsed) — called with no `db` arg, so
   * it opens and manages its own real transaction — rolls itself back
   * automatically when a write fails partway through. That rollback IS the
   * safety mechanism being tested, so it has to be exercised for real
   * against the real database; there is nothing to undo afterward because,
   * by definition of a rolled-back transaction, nothing was ever
   * committed. Before/after counts prove it.
   */
  it("leaves the database completely unchanged when a write fails mid-import", async () => {
    const before = {
      products: await prisma.product.count(),
      suppliers: await prisma.supplier.count(),
      warehouses: await prisma.warehouse.count(),
      inventory: await prisma.inventory.count(),
    };

    const brokenWorkbook: ParsedWorkbook = {
      sheets: {
        Warehouses: {
          name: "Warehouses",
          present: true,
          headers: ["Warehouse Name", "Location", "Capacity Units"],
          rows: [
            {
              rowNumber: 2,
              values: { "Warehouse Name": "Rollback Test Warehouse", Location: "Nowhere", "Capacity Units": 100 },
            },
          ],
        },
        Suppliers: {
          name: "Suppliers",
          present: true,
          headers: ["Supplier Name", "Contracted Lead Time Days"],
          rows: [{ rowNumber: 2, values: { "Supplier Name": "Rollback Test Supplier", "Contracted Lead Time Days": 5 } }],
        },
        Products: {
          name: "Products",
          present: true,
          headers: ["SKU", "Product Name", "Category", "Unit of Measure", "Unit Cost", "Unit Price", "Lead Time Days", "Perishable"],
          rows: [
            {
              rowNumber: 2,
              values: {
                SKU: "ROLLBACK-TEST-0001",
                "Product Name": "Rollback Test Product",
                Category: "DAIRY",
                "Unit of Measure": "pc",
                "Unit Cost": 1,
                "Unit Price": 2,
                "Lead Time Days": 3,
                Perishable: "FALSE",
              },
            },
          ],
        },
        // References a SKU that doesn't exist anywhere in the Products sheet
        // above — buildImportPlan resolves this to `undefined`, which Prisma
        // rejects at the database boundary, deliberately triggering a
        // mid-transaction failure.
        Inventory: {
          name: "Inventory",
          present: true,
          headers: ["Product SKU", "Warehouse Name", "On-Hand Quantity"],
          rows: [
            {
              rowNumber: 2,
              values: { "Product SKU": "DOES-NOT-EXIST", "Warehouse Name": "Rollback Test Warehouse", "On-Hand Quantity": 10 },
            },
          ],
        },
        DemandHistory: { name: "DemandHistory", present: true, headers: [], rows: [] },
        PurchaseOrders: { name: "PurchaseOrders", present: false, headers: [], rows: [] },
        PurchaseOrderItems: { name: "PurchaseOrderItems", present: false, headers: [], rows: [] },
      },
    };

    await expect(importWorkbook(brokenWorkbook)).rejects.toThrow();

    const after = {
      products: await prisma.product.count(),
      suppliers: await prisma.supplier.count(),
      warehouses: await prisma.warehouse.count(),
      inventory: await prisma.inventory.count(),
    };

    expect(after).toEqual(before);
  }, 30000);
});
