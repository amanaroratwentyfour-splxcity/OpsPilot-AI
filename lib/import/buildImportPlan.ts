import { randomUUID } from "node:crypto";
import type ExcelJS from "exceljs";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ProductCategory, PurchaseOrderStatus } from "@/lib/generated/prisma";
import type { ParsedRow, ParsedWorkbook } from "./parseWorkbook";

/**
 * Pure transformation: an already-validated ParsedWorkbook in, the exact
 * Prisma `createMany` input arrays out, with every natural-key reference
 * (SKU, Warehouse Name, Supplier Name, PO Reference) resolved to a freshly
 * generated UUID. No database access happens here — this function can be
 * unit-tested with nothing but a parsed workbook in memory (see
 * importWorkbook.ts for the transactional delete+insert that consumes it).
 *
 * UUIDs are generated client-side and wired up before any row is written,
 * mirroring the same resolve-before-write pattern prisma/seed.ts already
 * uses (see DATA_DICTIONARY.md §2.1) — a workbook's own PO Reference values
 * exist only to link PurchaseOrderItems to PurchaseOrders within this
 * import; they are never stored as-is.
 *
 * Deliberately never sets a calculated field (Inventory.safetyStock/
 * reorderPoint/stockStatus, Product.abcClass, Supplier.reliabilityScore) —
 * every one of those is left to the schema's own default and is populated
 * immediately after import by the existing Operations Engines, per
 * DATA_IMPORT_ARCHITECTURE.md's "Business data only" design principle.
 */
export interface ImportPlan {
  warehouses: Prisma.WarehouseCreateManyInput[];
  suppliers: Prisma.SupplierCreateManyInput[];
  products: Prisma.ProductCreateManyInput[];
  inventory: Prisma.InventoryCreateManyInput[];
  demandHistory: Prisma.DemandHistoryCreateManyInput[];
  purchaseOrders: Prisma.PurchaseOrderCreateManyInput[];
  purchaseOrderItems: Prisma.PurchaseOrderItemCreateManyInput[];
}

export function buildImportPlan(parsed: ParsedWorkbook): ImportPlan {
  const warehouseIdByName = new Map<string, string>();
  const warehouses = parsed.sheets.Warehouses.rows.map((row) => {
    const id = randomUUID();
    const name = requiredString(row, "Warehouse Name");
    warehouseIdByName.set(name, id);
    return {
      id,
      name,
      location: requiredString(row, "Location"),
      capacityUnits: requiredNumber(row, "Capacity Units"),
    };
  });

  const supplierIdByName = new Map<string, string>();
  const suppliers = parsed.sheets.Suppliers.rows.map((row) => {
    const id = randomUUID();
    const name = requiredString(row, "Supplier Name");
    supplierIdByName.set(name, id);
    return {
      id,
      name,
      contactEmail: optionalString(row, "Contact Email"),
      contactPhone: optionalString(row, "Contact Phone"),
      contractedLeadTimeDays: requiredNumber(row, "Contracted Lead Time Days"),
      paymentTerms: optionalString(row, "Payment Terms"),
    };
  });

  const productIdBySku = new Map<string, string>();
  const products = parsed.sheets.Products.rows.map((row) => {
    const id = randomUUID();
    const sku = requiredString(row, "SKU");
    productIdBySku.set(sku, id);
    const primarySupplierName = optionalString(row, "Primary Supplier Name");
    return {
      id,
      sku,
      name: requiredString(row, "Product Name"),
      category: requiredString(row, "Category") as ProductCategory,
      unitOfMeasure: requiredString(row, "Unit of Measure"),
      unitCost: requiredNumber(row, "Unit Cost"),
      unitPrice: requiredNumber(row, "Unit Price"),
      leadTimeDays: requiredNumber(row, "Lead Time Days"),
      perishable: requiredBoolean(row, "Perishable"),
      primarySupplierId: primarySupplierName ? (supplierIdByName.get(primarySupplierName) ?? null) : null,
    };
  });

  const inventory = parsed.sheets.Inventory.rows.map((row) => ({
    id: randomUUID(),
    productId: productIdBySku.get(requiredString(row, "Product SKU"))!,
    warehouseId: warehouseIdByName.get(requiredString(row, "Warehouse Name"))!,
    onHandQty: requiredNumber(row, "On-Hand Quantity"),
  }));

  const demandHistory = parsed.sheets.DemandHistory.rows.map((row) => ({
    id: randomUUID(),
    productId: productIdBySku.get(requiredString(row, "Product SKU"))!,
    periodDate: requiredDate(row, "Period Date"),
    quantitySold: requiredNumber(row, "Quantity Sold"),
  }));

  const purchaseOrderIdByReference = new Map<string, string>();
  const purchaseOrders = parsed.sheets.PurchaseOrders.rows.map((row) => {
    const id = randomUUID();
    const reference = requiredString(row, "PO Reference");
    purchaseOrderIdByReference.set(reference, id);
    return {
      id,
      status: requiredString(row, "Status") as PurchaseOrderStatus,
      orderDate: requiredDate(row, "Order Date"),
      expectedDeliveryDate: optionalDate(row, "Expected Delivery Date"),
      actualDeliveryDate: optionalDate(row, "Actual Delivery Date"),
      supplierId: supplierIdByName.get(requiredString(row, "Supplier Name"))!,
      warehouseId: warehouseIdByName.get(requiredString(row, "Warehouse Name"))!,
    };
  });

  const purchaseOrderItems = parsed.sheets.PurchaseOrderItems.rows.map((row) => ({
    id: randomUUID(),
    purchaseOrderId: purchaseOrderIdByReference.get(requiredString(row, "PO Reference"))!,
    productId: productIdBySku.get(requiredString(row, "Product SKU"))!,
    quantity: requiredNumber(row, "Quantity"),
    unitCost: requiredNumber(row, "Unit Cost"),
  }));

  return { warehouses, suppliers, products, inventory, demandHistory, purchaseOrders, purchaseOrderItems };
}

function isBlank(value: ExcelJS.CellValue): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function requiredString(row: ParsedRow, column: string): string {
  return String(row.values[column]).trim();
}

function optionalString(row: ParsedRow, column: string): string | null {
  const value = row.values[column];
  return isBlank(value) ? null : String(value).trim();
}

function requiredNumber(row: ParsedRow, column: string): number {
  return row.values[column] as number;
}

function requiredBoolean(row: ParsedRow, column: string): boolean {
  const value = row.values[column];
  return value === true || value === "TRUE";
}

function requiredDate(row: ParsedRow, column: string): Date {
  return row.values[column] as Date;
}

function optionalDate(row: ParsedRow, column: string): Date | null {
  const value = row.values[column];
  return value instanceof Date ? value : null;
}
