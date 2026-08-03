import type ExcelJS from "exceljs";
import type { ParsedSheet, ParsedWorkbook, ParsedRow } from "./parseWorkbook";
import { WORKBOOK_SHEETS, type WorkbookColumnDefinition, type WorkbookSheetDefinition } from "./workbookSchema";
import { errorIssue, warningIssue, type ValidationIssue } from "./validationIssue";
import { isBlank } from "./structuralValidation";

/**
 * Pass 2 of 3 (DATA_IMPORT_ARCHITECTURE.md §3.2): checks that values with
 * the right *shape* (structural pass already confirmed that) also satisfy
 * the business rules attached to them — required fields actually filled
 * in, numbers in range, enum values recognized, natural keys unique within
 * their sheet, plus a handful of sheet-specific rules (conditional
 * requirements, date ordering) that aren't generic enough to express as
 * schema metadata.
 */
export function validateBusinessRules(parsed: ParsedWorkbook): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const sheetDefinition of WORKBOOK_SHEETS) {
    const sheet = parsed.sheets[sheetDefinition.name];
    if (!sheet.present) continue;

    const presentColumns = sheetDefinition.columns.filter((column) => sheet.headers.includes(column.header));

    for (const row of sheet.rows) {
      for (const column of presentColumns) {
        validateRequiredNotBlank(sheetDefinition, column, row, issues);
        validateNumericRule(sheetDefinition, column, row, issues);
        validateEnumMembership(sheetDefinition, column, row, issues);
      }
    }

    validateNaturalKeyUniqueness(sheetDefinition, sheet, issues);
  }

  const demandHistory = parsed.sheets.DemandHistory;
  if (demandHistory?.present) validateDemandHistoryRules(demandHistory, issues);

  const purchaseOrders = parsed.sheets.PurchaseOrders;
  if (purchaseOrders?.present) validatePurchaseOrderRules(purchaseOrders, issues);

  const products = parsed.sheets.Products;
  if (products?.present) validateProductRules(products, issues);

  return issues;
}

function validateRequiredNotBlank(
  sheetDefinition: WorkbookSheetDefinition,
  column: WorkbookColumnDefinition,
  row: ParsedRow,
  issues: ValidationIssue[],
): void {
  if (!column.required) return;
  if (isBlank(row.values[column.header])) {
    issues.push(
      errorIssue(
        sheetDefinition.name,
        row.rowNumber,
        column.header,
        "REQUIRED_FIELD_BLANK",
        `${column.header} is required but blank.`,
      ),
    );
  }
}

function validateNumericRule(
  sheetDefinition: WorkbookSheetDefinition,
  column: WorkbookColumnDefinition,
  row: ParsedRow,
  issues: ValidationIssue[],
): void {
  const rule = column.numericRule;
  if (!rule) return;
  const value = row.values[column.header];
  if (typeof value !== "number") return; // wrong-type cells are reported by structural validation, not here

  const violatesRule = rule.exclusive ? value <= rule.min : value < rule.min;
  if (violatesRule) {
    const bound = rule.exclusive ? `greater than ${rule.min}` : `${rule.min} or greater`;
    issues.push(
      errorIssue(
        sheetDefinition.name,
        row.rowNumber,
        column.header,
        "NUMERIC_OUT_OF_RANGE",
        `${column.header} is ${value}, but must be ${bound}.`,
      ),
    );
  }
}

function validateEnumMembership(
  sheetDefinition: WorkbookSheetDefinition,
  column: WorkbookColumnDefinition,
  row: ParsedRow,
  issues: ValidationIssue[],
): void {
  if (column.dataType !== "enum") return;
  const value = row.values[column.header];
  if (isBlank(value)) return;

  const stringValue = String(value).trim();
  const allowedValues = column.enumValues ?? [];
  if (!allowedValues.includes(stringValue)) {
    issues.push(
      errorIssue(
        sheetDefinition.name,
        row.rowNumber,
        column.header,
        "ENUM_INVALID",
        `"${stringValue}" is not a valid ${column.header}. Must be one of: ${allowedValues.join(", ")}.`,
      ),
    );
  }
}

function validateNaturalKeyUniqueness(
  sheetDefinition: WorkbookSheetDefinition,
  sheet: ParsedSheet,
  issues: ValidationIssue[],
): void {
  if (sheetDefinition.naturalKey.length === 0) return;
  const keyColumns = sheetDefinition.naturalKey.filter((column) => sheet.headers.includes(column));
  if (keyColumns.length === 0) return; // the key column itself is missing — already a COLUMN_MISSING structural error

  const rowsByKey = new Map<string, number[]>();
  for (const row of sheet.rows) {
    const parts = keyColumns.map((column) => normalizeKeyPart(row.values[column]));
    if (parts.some((part) => part === null)) continue; // a blank key component is already a REQUIRED_FIELD_BLANK error
    const key = parts.join("␟");
    const rowNumbers = rowsByKey.get(key) ?? [];
    rowNumbers.push(row.rowNumber);
    rowsByKey.set(key, rowNumbers);
  }

  const keyLabel = keyColumns.join(" + ");
  for (const [, rowNumbers] of Array.from(rowsByKey)) {
    if (rowNumbers.length < 2) continue;
    for (const rowNumber of rowNumbers) {
      issues.push(
        errorIssue(
          sheetDefinition.name,
          rowNumber,
          keyLabel,
          "DUPLICATE_NATURAL_KEY",
          `Duplicate ${keyLabel}: rows ${rowNumbers.join(", ")} all have the same value. Each must be unique.`,
        ),
      );
    }
  }
}

function normalizeKeyPart(value: ExcelJS.CellValue): string | null {
  if (isBlank(value)) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function validateDemandHistoryRules(sheet: ParsedSheet, issues: ValidationIssue[]): void {
  const today = new Date();
  for (const row of sheet.rows) {
    const periodDate = row.values["Period Date"];
    if (periodDate instanceof Date && periodDate.getTime() > today.getTime()) {
      issues.push(
        errorIssue(
          "DemandHistory",
          row.rowNumber,
          "Period Date",
          "DATE_IN_FUTURE",
          `Period Date ${formatDate(periodDate)} is in the future.`,
        ),
      );
    }
  }
}

function validatePurchaseOrderRules(sheet: ParsedSheet, issues: ValidationIssue[]): void {
  for (const row of sheet.rows) {
    const status = row.values.Status;
    const orderDate = row.values["Order Date"];
    const expectedDate = row.values["Expected Delivery Date"];
    const actualDate = row.values["Actual Delivery Date"];

    if (status === "RECEIVED" && isBlank(actualDate)) {
      issues.push(
        errorIssue(
          "PurchaseOrders",
          row.rowNumber,
          "Actual Delivery Date",
          "PO_RECEIVED_MISSING_ACTUAL_DATE",
          "Status is RECEIVED, so Actual Delivery Date is required.",
        ),
      );
    }

    if (!(orderDate instanceof Date)) continue;
    if (expectedDate instanceof Date && expectedDate.getTime() < orderDate.getTime()) {
      issues.push(
        warningIssue(
          "PurchaseOrders",
          row.rowNumber,
          "Expected Delivery Date",
          "PO_DATE_BEFORE_ORDER_DATE",
          `Expected Delivery Date ${formatDate(expectedDate)} is before Order Date ${formatDate(orderDate)}.`,
        ),
      );
    }
    if (actualDate instanceof Date && actualDate.getTime() < orderDate.getTime()) {
      issues.push(
        warningIssue(
          "PurchaseOrders",
          row.rowNumber,
          "Actual Delivery Date",
          "PO_DATE_BEFORE_ORDER_DATE",
          `Actual Delivery Date ${formatDate(actualDate)} is before Order Date ${formatDate(orderDate)}.`,
        ),
      );
    }
  }
}

function validateProductRules(sheet: ParsedSheet, issues: ValidationIssue[]): void {
  for (const row of sheet.rows) {
    const unitCost = row.values["Unit Cost"];
    const unitPrice = row.values["Unit Price"];
    if (typeof unitCost === "number" && typeof unitPrice === "number" && unitPrice < unitCost) {
      issues.push(
        warningIssue(
          "Products",
          row.rowNumber,
          "Unit Price",
          "PRODUCT_PRICE_BELOW_COST",
          `Unit Price (${unitPrice}) is less than Unit Cost (${unitCost}).`,
        ),
      );
    }
  }
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
