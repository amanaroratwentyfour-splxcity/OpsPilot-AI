/**
 * One issue found while validating an uploaded workbook. Mirrors the
 * `RecommendationSeverity` vocabulary the rest of the product already uses
 * (CRITICAL/WARNING/INFO), reduced to two levels here — a validation issue
 * either blocks import or it doesn't; there's no informational tier for a
 * spreadsheet cell. See DATA_IMPORT_ARCHITECTURE.md §3.
 */
export type ValidationSeverity = "ERROR" | "WARNING";

export interface ValidationIssue {
  severity: ValidationSeverity;
  sheet: string;
  /** 1-indexed Excel row number, or null for a sheet-level issue (e.g. a missing sheet). */
  row: number | null;
  /** Column header, or null for a sheet/row-level issue. */
  column: string | null;
  message: string;
  /** Stable identifier (e.g. "PRODUCT_SKU_DUPLICATE") for consistent testing and tooling. */
  ruleCode: string;
}

export function errorIssue(
  sheet: string,
  row: number | null,
  column: string | null,
  ruleCode: string,
  message: string,
): ValidationIssue {
  return { severity: "ERROR", sheet, row, column, ruleCode, message };
}

export function warningIssue(
  sheet: string,
  row: number | null,
  column: string | null,
  ruleCode: string,
  message: string,
): ValidationIssue {
  return { severity: "WARNING", sheet, row, column, ruleCode, message };
}
