import { beforeAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { generateTemplateWorkbook } from "@/lib/import/templateGenerator";
import { WORKBOOK_SHEETS } from "@/lib/import/workbookSchema";

const EXPECTED_SHEET_ORDER = [
  "Products",
  "Suppliers",
  "Warehouses",
  "Inventory",
  "DemandHistory",
  "PurchaseOrders",
  "PurchaseOrderItems",
  "Instructions",
  "DataDictionary",
];

describe("generateTemplateWorkbook", () => {
  let workbook: ExcelJS.Workbook;

  beforeAll(async () => {
    const buffer = await generateTemplateWorkbook();
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  });

  it("contains exactly the 9 required worksheets, in order", () => {
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(EXPECTED_SHEET_ORDER);
  });

  describe.each(WORKBOOK_SHEETS)("$name sheet", (sheetDefinition) => {
    function getSheet() {
      const worksheet = workbook.getWorksheet(sheetDefinition.name);
      if (!worksheet) throw new Error(`Worksheet ${sheetDefinition.name} not found`);
      return worksheet;
    }

    it("has the exact business-friendly column headers, in order, with no UUID/id column", () => {
      const worksheet = getSheet();
      const headerRow = worksheet.getRow(1);
      const headers = sheetDefinition.columns.map((_, index) => String(headerRow.getCell(index + 1).value));

      expect(headers).toEqual(sheetDefinition.columns.map((column) => column.header));
      expect(headers.some((header) => /id$/i.test(header.replace(/\s/g, "")))).toBe(false);
    });

    it("freezes the header row", () => {
      const worksheet = getSheet();
      // Round-tripping through real .xlsx serialization fills in Excel's own
      // view defaults (zoom, workbookViewId, ...) alongside what we set —
      // only the freeze-pane fields we actually configure are asserted here.
      expect(worksheet.views).toMatchObject([{ state: "frozen", ySplit: 1 }]);
    });

    it("bolds every header cell, in a required (red) or optional (dark) color", () => {
      const worksheet = getSheet();
      const headerRow = worksheet.getRow(1);
      sheetDefinition.columns.forEach((column, index) => {
        const cell = headerRow.getCell(index + 1);
        expect(cell.font?.bold).toBe(true);
        const color = (cell.font?.color as { argb?: string } | undefined)?.argb;
        expect(color).toBe(column.required ? "FFB00020" : "FF1A1A1A");
      });
    });

    it("includes 2 or 3 example rows matching the schema's example data", () => {
      const worksheet = getSheet();
      expect(sheetDefinition.exampleRows.length).toBeGreaterThanOrEqual(2);
      expect(sheetDefinition.exampleRows.length).toBeLessThanOrEqual(3);

      sheetDefinition.exampleRows.forEach((expectedRow, rowIndex) => {
        const row = worksheet.getRow(rowIndex + 2);
        expectedRow.forEach((expectedValue, columnIndex) => {
          if (expectedValue === "") return; // blank optional cell
          const actual = row.getCell(columnIndex + 1).value;
          if (typeof expectedValue === "number") {
            expect(actual).toBeCloseTo(expectedValue, 5);
          } else if (actual instanceof Date) {
            expect(actual.toISOString().slice(0, 10)).toBe(expectedValue);
          } else {
            expect(actual).toBe(expectedValue);
          }
        });
      });
    });

    it("applies a dropdown/range data validation to every non-text column, and none to text columns", () => {
      const worksheet = getSheet();
      const dataRow = worksheet.getRow(2);
      sheetDefinition.columns.forEach((column, index) => {
        const cell = dataRow.getCell(index + 1);
        if (column.dataType === "text") {
          expect(cell.dataValidation).toBeUndefined();
        } else {
          expect(cell.dataValidation).toBeDefined();
        }
      });
    });

    it("has an enum dropdown listing exactly the Prisma enum values for enum columns", () => {
      const worksheet = getSheet();
      const dataRow = worksheet.getRow(2);
      sheetDefinition.columns.forEach((column, index) => {
        if (column.dataType !== "enum") return;
        const validation = dataRow.getCell(index + 1).dataValidation;
        expect(validation?.type).toBe("list");
        expect(validation?.formulae?.[0]).toBe(`"${(column.enumValues ?? []).join(",")}"`);
      });
    });

    it("carries the sheet's purpose as a note on the first header cell", () => {
      const worksheet = getSheet();
      expect(worksheet.getCell(1, 1).note).toBe(sheetDefinition.purpose);
    });
  });

  it("Instructions sheet documents every data sheet plus the auto-generated-fields rule", () => {
    const worksheet = workbook.getWorksheet("Instructions")!;
    const sectionValues: string[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      sectionValues.push(String(row.getCell(1).value));
    });

    for (const sheet of WORKBOOK_SHEETS) {
      expect(sectionValues.some((section) => section.startsWith(sheet.name))).toBe(true);
    }
    expect(sectionValues).toContain("Fields generated automatically — do not enter these");
  });

  it("DataDictionary sheet has one row per column across all data sheets", () => {
    const worksheet = workbook.getWorksheet("DataDictionary")!;
    const expectedRowCount = WORKBOOK_SHEETS.reduce((sum, sheet) => sum + sheet.columns.length, 0);

    let actualRowCount = 0;
    worksheet.eachRow((_row, rowNumber) => {
      if (rowNumber > 1) actualRowCount++;
    });

    expect(actualRowCount).toBe(expectedRowCount);
    expect(worksheet.getRow(1).values).toEqual([
      undefined,
      "Sheet Name",
      "Column Name",
      "Required?",
      "Data Type",
      "Description",
      "Example Value",
    ]);
  });

  it("names the workbook creator", () => {
    expect(workbook.creator).toBe("OpsPilot AI");
  });
});
