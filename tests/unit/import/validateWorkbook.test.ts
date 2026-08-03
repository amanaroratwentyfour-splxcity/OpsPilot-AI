import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { generateTemplateWorkbook } from "@/lib/import/templateGenerator";
import { validateWorkbook } from "@/lib/import/validateWorkbook";
import type { ValidationIssue } from "@/lib/import/validationIssue";

/** Generates the real template, applies a mutation to it via ExcelJS, and returns the re-serialized buffer. */
async function buildMutatedWorkbook(mutate: (workbook: ExcelJS.Workbook) => void): Promise<Buffer> {
  const baseBuffer = await generateTemplateWorkbook();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(baseBuffer as unknown as ExcelJS.Buffer);
  mutate(workbook);
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

function withCode(issues: ValidationIssue[], ruleCode: string): ValidationIssue[] {
  return issues.filter((issue) => issue.ruleCode === ruleCode);
}

describe("validateWorkbook", () => {
  it("produces zero issues for the freshly generated template's own example rows", async () => {
    const buffer = await generateTemplateWorkbook();
    const { report } = await validateWorkbook(buffer as unknown as Buffer);
    expect(report.issues).toEqual([]);
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(0);
    expect(report.blocked).toBe(false);
  });

  it("reports a single FILE_UNREADABLE issue for a file that isn't a real workbook, rather than throwing", async () => {
    const { report } = await validateWorkbook(Buffer.from("not an excel file"));
    expect(report.blocked).toBe(true);
    expect(withCode(report.issues, "FILE_UNREADABLE")).toHaveLength(1);
  });

  describe("structural validation", () => {
    it("flags a missing required sheet", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.removeWorksheet("Warehouses");
      });
      const { report } = await validateWorkbook(buffer);
      const issues = withCode(report.issues, "SHEET_MISSING");
      expect(issues).toHaveLength(1);
      expect(issues[0].sheet).toBe("Warehouses");
      expect(report.blocked).toBe(true);
    });

    it("does not flag a missing optional sheet", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.removeWorksheet("PurchaseOrders");
        workbook.removeWorksheet("PurchaseOrderItems");
      });
      const { report } = await validateWorkbook(buffer);
      expect(withCode(report.issues, "SHEET_MISSING")).toHaveLength(0);
      expect(report.blocked).toBe(false);
    });

    it("flags a missing required column", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("Products")!.getCell(1, 3).value = "Not Category";
      });
      const { report } = await validateWorkbook(buffer);
      expect(withCode(report.issues, "COLUMN_MISSING").some((issue) => issue.column === "Category")).toBe(true);
    });

    it("flags a duplicate header", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("Products")!.getCell(1, 2).value = "SKU";
      });
      const { report } = await validateWorkbook(buffer);
      expect(withCode(report.issues, "DUPLICATE_HEADER").length).toBeGreaterThan(0);
    });

    it("flags a text value in a numeric column as the wrong data type", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("Products")!.getCell(2, 5).value = "fifteen";
      });
      const { report } = await validateWorkbook(buffer);
      const issues = withCode(report.issues, "WRONG_DATA_TYPE");
      expect(issues.some((i) => i.sheet === "Products" && i.column === "Unit Cost" && i.row === 2)).toBe(true);
    });

    it("flags a non-integer value in a whole-number column as the wrong data type", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("Products")!.getCell(2, 7).value = 4.5;
      });
      const { report } = await validateWorkbook(buffer);
      expect(withCode(report.issues, "WRONG_DATA_TYPE").some((i) => i.column === "Lead Time Days")).toBe(true);
    });
  });

  describe("business rule validation", () => {
    it("flags a blank required cell", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("Products")!.getCell(2, 1).value = null;
      });
      const { report } = await validateWorkbook(buffer);
      expect(
        withCode(report.issues, "REQUIRED_FIELD_BLANK").some((i) => i.column === "SKU" && i.row === 2),
      ).toBe(true);
    });

    it("flags a numeric value below its required range", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("Inventory")!.getCell(2, 3).value = -5;
      });
      const { report } = await validateWorkbook(buffer);
      expect(
        withCode(report.issues, "NUMERIC_OUT_OF_RANGE").some((i) => i.sheet === "Inventory" && i.row === 2),
      ).toBe(true);
    });

    it("flags an invalid enum value", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("Products")!.getCell(2, 3).value = "Dairy";
      });
      const { report } = await validateWorkbook(buffer);
      expect(withCode(report.issues, "ENUM_INVALID").some((i) => i.row === 2)).toBe(true);
    });

    it("flags a duplicate natural key within a sheet", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        const worksheet = workbook.getWorksheet("Warehouses")!;
        worksheet.getCell(3, 1).value = worksheet.getCell(2, 1).value;
      });
      const { report } = await validateWorkbook(buffer);
      expect(withCode(report.issues, "DUPLICATE_NATURAL_KEY").length).toBeGreaterThanOrEqual(2);
    });

    it("flags a DemandHistory Period Date in the future", async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("DemandHistory")!.getCell(2, 2).value = future;
      });
      const { report } = await validateWorkbook(buffer);
      expect(withCode(report.issues, "DATE_IN_FUTURE").length).toBeGreaterThan(0);
    });

    it("requires Actual Delivery Date when Status is RECEIVED", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("PurchaseOrders")!.getCell(2, 7).value = null;
      });
      const { report } = await validateWorkbook(buffer);
      expect(withCode(report.issues, "PO_RECEIVED_MISSING_ACTUAL_DATE")).toHaveLength(1);
    });

    it("warns, without blocking, when Unit Price is below Unit Cost", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("Products")!.getCell(2, 6).value = 1;
      });
      const { report } = await validateWorkbook(buffer);
      const issues = withCode(report.issues, "PRODUCT_PRICE_BELOW_COST");
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("WARNING");
      expect(report.blocked).toBe(false);
    });
  });

  describe("referential validation", () => {
    it("flags an Inventory row referencing an unknown Product SKU", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("Inventory")!.getCell(2, 1).value = "NOT-A-REAL-SKU";
      });
      const { report } = await validateWorkbook(buffer);
      expect(
        withCode(report.issues, "REFERENCE_NOT_FOUND").some(
          (i) => i.sheet === "Inventory" && i.column === "Product SKU",
        ),
      ).toBe(true);
    });

    it("does not flag a blank optional reference (Primary Supplier Name)", async () => {
      const buffer = await generateTemplateWorkbook();
      const { report } = await validateWorkbook(buffer as unknown as Buffer);
      // The template's own 3rd example row (SNK-0005) already leaves Primary Supplier Name blank.
      expect(
        withCode(report.issues, "REFERENCE_NOT_FOUND").some((i) => i.column === "Primary Supplier Name"),
      ).toBe(false);
    });

    it("flags a PurchaseOrderItems row referencing an unknown PO Reference", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        workbook.getWorksheet("PurchaseOrderItems")!.getCell(2, 1).value = "PO-9999";
      });
      const { report } = await validateWorkbook(buffer);
      expect(
        withCode(report.issues, "REFERENCE_NOT_FOUND").some((i) => i.sheet === "PurchaseOrderItems"),
      ).toBe(true);
    });

    it("warns, without blocking, when a PurchaseOrders row has no matching PurchaseOrderItems rows", async () => {
      const buffer = await buildMutatedWorkbook((workbook) => {
        // Repoint the only item referencing PO-1001 onto PO-1002, leaving PO-1001 with none.
        workbook.getWorksheet("PurchaseOrderItems")!.getCell(2, 1).value = "PO-1002";
      });
      const { report } = await validateWorkbook(buffer);
      const issues = withCode(report.issues, "PURCHASE_ORDER_HAS_NO_ITEMS");
      expect(issues.some((i) => i.severity === "WARNING")).toBe(true);
      expect(report.blocked).toBe(false);
    });
  });

  it("sorts issues by sheet in workbook order, then ERROR before WARNING, then by row", async () => {
    const buffer = await buildMutatedWorkbook((workbook) => {
      const products = workbook.getWorksheet("Products")!;
      products.getCell(4, 6).value = 1; // row 4: WARNING (price below cost)
      products.getCell(2, 1).value = null; // row 2: ERROR (required blank)
    });
    const { report } = await validateWorkbook(buffer);
    const productsIssues = report.issues.filter((issue) => issue.sheet === "Products");
    expect(productsIssues[0].severity).toBe("ERROR");
    expect(productsIssues[0].row).toBe(2);
    expect(productsIssues[productsIssues.length - 1].severity).toBe("WARNING");

    // Products (workbook position 1) must sort before Warehouses (position 3).
    const firstWarehousesIndex = report.issues.findIndex((issue) => issue.sheet === "Warehouses");
    const lastProductsIndex = report.issues.map((issue) => issue.sheet).lastIndexOf("Products");
    if (firstWarehousesIndex !== -1) {
      expect(lastProductsIndex).toBeLessThan(firstWarehousesIndex);
    }
  });
});
