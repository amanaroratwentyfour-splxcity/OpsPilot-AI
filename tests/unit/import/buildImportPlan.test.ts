import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { generateTemplateWorkbook } from "@/lib/import/templateGenerator";
import { parseWorkbook } from "@/lib/import/parseWorkbook";
import { buildImportPlan } from "@/lib/import/buildImportPlan";

describe("buildImportPlan", () => {
  it("resolves every natural-key relationship in the template's own example data", async () => {
    const buffer = await generateTemplateWorkbook();
    const parsed = await parseWorkbook(buffer);
    const plan = buildImportPlan(parsed);

    expect(plan.warehouses).toHaveLength(2);
    expect(plan.suppliers).toHaveLength(2);
    expect(plan.products).toHaveLength(3);
    expect(plan.inventory).toHaveLength(3);
    expect(plan.demandHistory).toHaveLength(3);
    expect(plan.purchaseOrders).toHaveLength(2);
    expect(plan.purchaseOrderItems).toHaveLength(2);

    const warehouseIds = new Set(plan.warehouses.map((w) => w.id));
    const supplierIds = new Set(plan.suppliers.map((s) => s.id));
    const productIds = new Set(plan.products.map((p) => p.id));
    const purchaseOrderIds = new Set(plan.purchaseOrders.map((po) => po.id));

    for (const row of plan.inventory) {
      expect(productIds.has(row.productId as string)).toBe(true);
      expect(warehouseIds.has(row.warehouseId as string)).toBe(true);
    }
    for (const row of plan.demandHistory) {
      expect(productIds.has(row.productId as string)).toBe(true);
    }
    for (const row of plan.purchaseOrders) {
      expect(supplierIds.has(row.supplierId as string)).toBe(true);
      expect(warehouseIds.has(row.warehouseId as string)).toBe(true);
    }
    for (const row of plan.purchaseOrderItems) {
      expect(purchaseOrderIds.has(row.purchaseOrderId as string)).toBe(true);
      expect(productIds.has(row.productId as string)).toBe(true);
    }
  });

  it("resolves an optional Primary Supplier Name reference, and leaves it null when blank", async () => {
    const buffer = await generateTemplateWorkbook();
    const parsed = await parseWorkbook(buffer);
    const plan = buildImportPlan(parsed);

    const withSupplier = plan.products.find((p) => p.sku === "DAI-0001");
    const supplier = plan.suppliers.find((s) => s.name === "Amrit Agro Foods Pvt. Ltd.");
    expect(withSupplier?.primarySupplierId).toBe(supplier?.id);

    // The template's 3rd example product (SNK-0005) leaves Primary Supplier Name blank.
    const withoutSupplier = plan.products.find((p) => p.sku === "SNK-0005");
    expect(withoutSupplier?.primarySupplierId).toBeNull();
  });

  it("assigns every entity a real, unique UUID", async () => {
    const buffer = await generateTemplateWorkbook();
    const parsed = await parseWorkbook(buffer);
    const plan = buildImportPlan(parsed);

    const allIds = [
      ...plan.warehouses.map((w) => w.id),
      ...plan.suppliers.map((s) => s.id),
      ...plan.products.map((p) => p.id),
      ...plan.purchaseOrders.map((po) => po.id),
    ] as string[];

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of allIds) {
      expect(id).toMatch(uuidPattern);
    }
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("never assigns a calculated field — those are left to schema defaults for the Operations Engines to fill in", async () => {
    const buffer = await generateTemplateWorkbook();
    const parsed = await parseWorkbook(buffer);
    const plan = buildImportPlan(parsed);

    for (const row of plan.inventory) {
      expect(row).not.toHaveProperty("safetyStock");
      expect(row).not.toHaveProperty("reorderPoint");
      expect(row).not.toHaveProperty("stockStatus");
    }
    for (const row of plan.products) {
      expect(row).not.toHaveProperty("abcClass");
    }
    for (const row of plan.suppliers) {
      expect(row).not.toHaveProperty("reliabilityScore");
    }
  });

  it("produces empty arrays, not an error, when PurchaseOrders/PurchaseOrderItems are absent", async () => {
    const baseBuffer = await generateTemplateWorkbook();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(baseBuffer as unknown as ExcelJS.Buffer);
    workbook.removeWorksheet("PurchaseOrders");
    workbook.removeWorksheet("PurchaseOrderItems");
    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;

    const parsed = await parseWorkbook(buffer);
    const plan = buildImportPlan(parsed);

    expect(plan.purchaseOrders).toEqual([]);
    expect(plan.purchaseOrderItems).toEqual([]);
    // Everything else is unaffected.
    expect(plan.products).toHaveLength(3);
    expect(plan.inventory).toHaveLength(3);
  });

  it("resolves date columns to real Date objects, not strings", async () => {
    const buffer = await generateTemplateWorkbook();
    const parsed = await parseWorkbook(buffer);
    const plan = buildImportPlan(parsed);

    for (const row of plan.demandHistory) {
      expect(row.periodDate).toBeInstanceOf(Date);
    }
    for (const row of plan.purchaseOrders) {
      expect(row.orderDate).toBeInstanceOf(Date);
    }
  });
});
