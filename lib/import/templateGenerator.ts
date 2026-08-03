import ExcelJS from "exceljs";
import {
  BOOLEAN_VALUES,
  WORKBOOK_SHEETS,
  dataTypeLabel,
  type WorkbookColumnDefinition,
  type WorkbookSheetDefinition,
} from "./workbookSchema";

/**
 * Generates OpsPilot_Template.xlsx from workbookSchema.ts — the workbook a
 * user downloads, fills with their own company's data, and (in a later
 * milestone) uploads back. This module only builds the file; it does not
 * read, parse, or validate anything (see DATA_IMPORT_ARCHITECTURE.md —
 * parsing/validation/import are separate, not-yet-built milestones).
 */

const HEADER_ROW = 1;
const VALIDATED_ROW_COUNT = 500;
const MIN_COLUMN_WIDTH = 14;
const MAX_COLUMN_WIDTH = 42;
const COLUMN_WIDTH_PADDING = 2;

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8ECF3" },
};

const REQUIRED_HEADER_FONT_COLOR = "FFB00020";
const OPTIONAL_HEADER_FONT_COLOR = "FF1A1A1A";

const REFERENCE_SHEET_DESCRIPTION =
  "Sheet-by-sheet guidance, required vs. optional sheets, how relationships between sheets work, and every rule to follow before uploading.";
const DATA_DICTIONARY_DESCRIPTION =
  "Every worksheet, column, requirement, data type, description, and example value in this workbook, in one flat reference table.";

export async function generateTemplateWorkbook(): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OpsPilot AI";
  workbook.created = new Date();

  for (const sheet of WORKBOOK_SHEETS) {
    addDataSheet(workbook, sheet);
  }
  addInstructionsSheet(workbook);
  addDataDictionarySheet(workbook);

  return workbook.xlsx.writeBuffer();
}

function addDataSheet(workbook: ExcelJS.Workbook, sheet: WorkbookSheetDefinition): void {
  const worksheet = workbook.addWorksheet(sheet.name, {
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  });

  worksheet.columns = sheet.columns.map((column) => ({ header: column.header }));
  styleHeaderRow(worksheet, sheet.columns);

  for (const row of sheet.exampleRows) {
    worksheet.addRow(row.map((value, index) => toCellValue(value, sheet.columns[index])));
  }

  sheet.columns.forEach((column, index) => {
    const columnNumber = index + 1;
    const excelColumn = worksheet.getColumn(columnNumber);
    const exampleValues = sheet.exampleRows.map((row) => row[index]);
    excelColumn.width = computeColumnWidth(column.header, exampleValues);
    applyColumnDataType(worksheet, columnNumber, column);
  });

  worksheet.getCell(HEADER_ROW, 1).note = sheet.purpose;
}

/** Converts an example value from workbookSchema's plain string/number form into the real cell type its column declares — a date column's example must be written as an actual Date, not the string "2026-06-01", or the workbook would fail its own structural validation. */
function toCellValue(value: string | number, column: WorkbookColumnDefinition): ExcelJS.CellValue {
  if (value === "") return null;
  if (column.dataType === "date" && typeof value === "string") return new Date(value);
  return value;
}

function styleHeaderRow(worksheet: ExcelJS.Worksheet, columns: readonly WorkbookColumnDefinition[]): void {
  const headerRow = worksheet.getRow(HEADER_ROW);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.font = {
      bold: true,
      color: { argb: column.required ? REQUIRED_HEADER_FONT_COLOR : OPTIONAL_HEADER_FONT_COLOR },
    };
    cell.fill = HEADER_FILL;
    cell.note = `${column.description}${column.required ? " (Required)" : " (Optional)"}`;
  });
  headerRow.commit();
}

/** Applies the Excel-native numeric format and, where practical, a cell-level dropdown/range validation. */
function applyColumnDataType(
  worksheet: ExcelJS.Worksheet,
  columnNumber: number,
  column: WorkbookColumnDefinition,
): void {
  const validation = buildDataValidation(column);
  const numFmt = dateOrNumberFormat(column);

  for (let row = HEADER_ROW + 1; row <= HEADER_ROW + VALIDATED_ROW_COUNT; row++) {
    const cell = worksheet.getCell(row, columnNumber);
    if (numFmt) cell.numFmt = numFmt;
    if (validation) cell.dataValidation = validation;
  }
}

function dateOrNumberFormat(column: WorkbookColumnDefinition): string | undefined {
  if (column.dataType === "date") return "yyyy-mm-dd";
  if (column.dataType === "decimal") return "0.00";
  return undefined;
}

function buildDataValidation(column: WorkbookColumnDefinition): ExcelJS.DataValidation | undefined {
  switch (column.dataType) {
    case "enum":
      return {
        type: "list",
        allowBlank: !column.required,
        formulae: [`"${(column.enumValues ?? []).join(",")}"`],
        showErrorMessage: true,
        errorTitle: "Invalid value",
        error: `Must be one of: ${(column.enumValues ?? []).join(", ")}.`,
      };
    case "boolean":
      return {
        type: "list",
        allowBlank: !column.required,
        formulae: [`"${BOOLEAN_VALUES.join(",")}"`],
        showErrorMessage: true,
        errorTitle: "Invalid value",
        error: `Must be ${BOOLEAN_VALUES.join(" or ")}.`,
      };
    case "wholeNumber":
      return {
        type: "whole",
        operator: column.numericRule?.exclusive ? "greaterThan" : "greaterThanOrEqual",
        formulae: [column.numericRule?.min ?? 0],
        allowBlank: !column.required,
        showErrorMessage: true,
        errorTitle: "Invalid value",
        error: numericRuleErrorMessage(column, "whole number"),
      };
    case "decimal":
      return {
        type: "decimal",
        operator: column.numericRule?.exclusive ? "greaterThan" : "greaterThanOrEqual",
        formulae: [column.numericRule?.min ?? 0],
        allowBlank: !column.required,
        showErrorMessage: true,
        errorTitle: "Invalid value",
        error: numericRuleErrorMessage(column, "number"),
      };
    case "date":
      return {
        type: "date",
        operator: "between",
        formulae: ["2000-01-01", "2100-12-31"],
        allowBlank: !column.required,
        showErrorMessage: true,
        errorTitle: "Invalid value",
        error: "Must be a valid date.",
      };
    case "text":
      return undefined;
  }
}

function numericRuleErrorMessage(column: WorkbookColumnDefinition, kind: "whole number" | "number"): string {
  const rule = column.numericRule;
  if (!rule) return `Must be a ${kind}.`;
  return rule.exclusive
    ? `Must be a ${kind} greater than ${rule.min}.`
    : `Must be a ${kind}, ${rule.min} or greater.`;
}

function computeColumnWidth(header: string, exampleValues: ReadonlyArray<string | number>): number {
  const longest = [header, ...exampleValues.map((value) => String(value))].reduce(
    (max, value) => Math.max(max, value.length),
    0,
  );
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longest + COLUMN_WIDTH_PADDING));
}

function addInstructionsSheet(workbook: ExcelJS.Workbook): void {
  const worksheet = workbook.addWorksheet("Instructions", {
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  });

  worksheet.columns = [{ header: "Section" }, { header: "Details" }];
  styleHeaderRow(worksheet, [
    { header: "Section", required: true, dataType: "text", description: "Topic." },
    { header: "Details", required: true, dataType: "text", description: REFERENCE_SHEET_DESCRIPTION },
  ]);

  const rows: [string, string][] = [
    [
      "Overview",
      "This workbook lets you replace OpsPilot AI's demo dataset with your own company's operations data. Fill in each sheet below, then upload the completed workbook from the Import Center page.",
    ],
    ...WORKBOOK_SHEETS.map((sheet): [string, string] => [
      `${sheet.name} (${sheet.required ? "Required" : "Optional"})`,
      sheet.purpose,
    ]),
    [
      "How relationships work",
      "Sheets reference each other by business-friendly natural keys instead of database IDs. For example, the Inventory sheet refers to a product by its SKU (from the Products sheet) and a warehouse by its Warehouse Name (from the Warehouses sheet). Every reference must exactly match a row that exists elsewhere in this workbook.",
    ],
    [
      "Rules you must follow",
      "Do not rename any worksheet tab or column header — they must match exactly.\nDo not leave a required column (shown in red on the header row) blank.\nKeep each natural key unique within its sheet (e.g. no two Warehouses rows with the same Warehouse Name).\nDelete the example rows before entering your own data — they are for illustration only.",
    ],
    [
      "Fields generated automatically — do not enter these",
      "Safety Stock, Reorder Point, and Stock Status (Inventory); ABC Class (Products); Supplier Reliability Score (Suppliers); all Forecasts and AI Recommendations. These are calculated by OpsPilot AI's Operations Engines immediately after import — they do not appear anywhere in this workbook and should never be entered by hand.",
    ],
  ];

  for (const row of rows) {
    const addedRow = worksheet.addRow(row);
    addedRow.getCell(2).alignment = { wrapText: true, vertical: "top" };
    addedRow.getCell(1).font = { bold: true };
  }

  worksheet.getColumn(1).width = 34;
  worksheet.getColumn(2).width = 100;
}

function addDataDictionarySheet(workbook: ExcelJS.Workbook): void {
  const worksheet = workbook.addWorksheet("DataDictionary", {
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  });

  const columns: WorkbookColumnDefinition[] = [
    { header: "Sheet Name", required: true, dataType: "text", description: "Which worksheet this row describes." },
    { header: "Column Name", required: true, dataType: "text", description: "Exact column header." },
    { header: "Required?", required: true, dataType: "text", description: "Whether the column must be filled in." },
    { header: "Data Type", required: true, dataType: "text", description: "Expected kind of value." },
    { header: "Description", required: true, dataType: "text", description: DATA_DICTIONARY_DESCRIPTION },
    { header: "Example Value", required: true, dataType: "text", description: "A realistic value for this column." },
  ];

  worksheet.columns = columns.map((column) => ({ header: column.header }));
  styleHeaderRow(worksheet, columns);

  for (const sheet of WORKBOOK_SHEETS) {
    sheet.columns.forEach((column, index) => {
      const exampleValue = sheet.exampleRows[0]?.[index] ?? "";
      worksheet.addRow([
        sheet.name,
        column.header,
        column.required ? "Required" : "Optional",
        dataTypeLabel(column.dataType, column.enumValues),
        column.description,
        String(exampleValue),
      ]);
    });
  }

  const widths = [20, 26, 12, 20, 60, 30];
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });
  worksheet.getColumn(5).alignment = { wrapText: true, vertical: "top" };
}
