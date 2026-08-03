import type ExcelJS from "exceljs";
import type { ParsedSheet, ParsedWorkbook } from "./parseWorkbook";
import { WORKBOOK_SHEETS } from "./workbookSchema";
import { errorIssue, warningIssue, type ValidationIssue } from "./validationIssue";
import { isBlank } from "./structuralValidation";

/**
 * Pass 3 of 3 (DATA_IMPORT_ARCHITECTURE.md §3.3): checks that every
 * natural-key reference in every sheet actually resolves to a row
 * somewhere else in the workbook. Driven entirely by each sheet's
 * `references` metadata in workbookSchema.ts — there is no per-relationship
 * hardcoded check here, so a new reference only needs to be added once, in
 * the schema.
 */
export function validateReferences(parsed: ParsedWorkbook): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const sheetDefinition of WORKBOOK_SHEETS) {
    const sheet = parsed.sheets[sheetDefinition.name];
    if (!sheet.present) continue;

    for (const reference of sheetDefinition.references) {
      if (!sheet.headers.includes(reference.column)) continue; // missing column already reported structurally

      const targetSheet = parsed.sheets[reference.targetSheet];
      const targetKeys = targetSheet?.present ? buildKeySet(targetSheet, reference.targetColumn) : new Set<string>();

      for (const row of sheet.rows) {
        const rawValue = row.values[reference.column];
        if (isBlank(rawValue)) continue; // blank required fields are reported by business validation; blank optional fields have nothing to resolve

        const normalized = normalizeReferenceValue(rawValue);
        if (!targetKeys.has(normalized)) {
          issues.push(
            errorIssue(
              sheetDefinition.name,
              row.rowNumber,
              reference.column,
              "REFERENCE_NOT_FOUND",
              `${reference.column} "${normalized}" does not match any row in ${reference.targetSheet} (${reference.targetColumn}).`,
            ),
          );
        }
      }
    }
  }

  validatePurchaseOrdersHaveItems(parsed, issues);

  return issues;
}

function buildKeySet(sheet: ParsedSheet, column: string): Set<string> {
  const values = new Set<string>();
  if (!sheet.headers.includes(column)) return values;
  for (const row of sheet.rows) {
    const value = row.values[column];
    if (isBlank(value)) continue;
    values.add(normalizeReferenceValue(value));
  }
  return values;
}

function normalizeReferenceValue(value: ExcelJS.CellValue): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** Not a foreign-key check in the strict sense (nothing is broken if it fails) — a soft, cross-sheet completeness signal. */
function validatePurchaseOrdersHaveItems(parsed: ParsedWorkbook, issues: ValidationIssue[]): void {
  const purchaseOrders = parsed.sheets.PurchaseOrders;
  const items = parsed.sheets.PurchaseOrderItems;
  if (!purchaseOrders?.present) return;

  const referencedPOs = new Set<string>();
  if (items?.present) {
    for (const row of items.rows) {
      const reference = row.values["PO Reference"];
      if (!isBlank(reference)) referencedPOs.add(normalizeReferenceValue(reference));
    }
  }

  for (const row of purchaseOrders.rows) {
    const reference = row.values["PO Reference"];
    if (isBlank(reference)) continue;
    const normalized = normalizeReferenceValue(reference);
    if (!referencedPOs.has(normalized)) {
      issues.push(
        warningIssue(
          "PurchaseOrders",
          row.rowNumber,
          "PO Reference",
          "PURCHASE_ORDER_HAS_NO_ITEMS",
          `PO Reference "${normalized}" has no matching rows in PurchaseOrderItems.`,
        ),
      );
    }
  }
}
