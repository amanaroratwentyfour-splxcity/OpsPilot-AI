import type ExcelJS from "exceljs";
import type { ParsedWorkbook } from "./parseWorkbook";
import { WORKBOOK_SHEETS, dataTypeLabel, type ColumnDataType } from "./workbookSchema";
import { errorIssue, type ValidationIssue } from "./validationIssue";

const HEADER_ROW = 1;

/**
 * Pass 1 of 3 (DATA_IMPORT_ARCHITECTURE.md §3.1): checks the workbook's
 * shape — required sheets present, required columns present, no duplicate
 * headers, and every non-blank cell's value is the right kind of thing for
 * its column. Never checks business ranges (§3.2's job) or cross-sheet
 * references (§3.3's job) — a column that's the wrong *type* is a
 * structural problem; a column with the right type but a bad *value* is a
 * business-rule problem.
 *
 * Runs to completion: a missing sheet or column is reported and that
 * sheet/column is simply skipped by the rest of this pass (and, naturally,
 * by business/referential validation too, since there's nothing there to
 * check) — nothing stops the whole run.
 */
export function validateStructure(parsed: ParsedWorkbook): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const sheetDefinition of WORKBOOK_SHEETS) {
    const sheet = parsed.sheets[sheetDefinition.name];

    if (!sheet.present) {
      if (sheetDefinition.required) {
        issues.push(
          errorIssue(
            sheetDefinition.name,
            null,
            null,
            "SHEET_MISSING",
            `Required sheet "${sheetDefinition.name}" is missing.`,
          ),
        );
      }
      continue;
    }

    if (sheetDefinition.required && sheet.rows.length === 0) {
      issues.push(
        errorIssue(
          sheetDefinition.name,
          null,
          null,
          "SHEET_EMPTY",
          `Sheet "${sheetDefinition.name}" is required but has no data rows.`,
        ),
      );
    }

    for (const [header, count] of Array.from(countHeaderOccurrences(sheet.headers))) {
      if (count > 1) {
        issues.push(
          errorIssue(
            sheetDefinition.name,
            HEADER_ROW,
            header,
            "DUPLICATE_HEADER",
            `Column "${header}" appears ${count} times in the header row — column headers must be unique.`,
          ),
        );
      }
    }

    const presentColumns = sheetDefinition.columns.filter((column) => {
      const present = sheet.headers.includes(column.header);
      if (!present && column.required) {
        issues.push(
          errorIssue(
            sheetDefinition.name,
            HEADER_ROW,
            column.header,
            "COLUMN_MISSING",
            `Required column "${column.header}" is missing.`,
          ),
        );
      }
      return present;
    });

    for (const column of presentColumns) {
      for (const row of sheet.rows) {
        const value = row.values[column.header];
        if (isBlank(value)) continue;
        if (!matchesDataType(value, column.dataType)) {
          issues.push(
            errorIssue(
              sheetDefinition.name,
              row.rowNumber,
              column.header,
              "WRONG_DATA_TYPE",
              `"${formatValue(value)}" is not a valid ${dataTypeLabel(column.dataType, column.enumValues)}.`,
            ),
          );
        }
      }
    }
  }

  return issues;
}

function countHeaderOccurrences(headers: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const header of headers) {
    if (!header) continue;
    counts.set(header, (counts.get(header) ?? 0) + 1);
  }
  return counts;
}

export function isBlank(value: ExcelJS.CellValue): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function matchesDataType(value: ExcelJS.CellValue, dataType: ColumnDataType): boolean {
  switch (dataType) {
    case "text":
    case "enum":
      return true; // shape is "any non-blank value"; enum membership is a business rule
    case "boolean":
      return value === true || value === false || value === "TRUE" || value === "FALSE";
    case "wholeNumber":
      return typeof value === "number" && Number.isInteger(value);
    case "decimal":
      return typeof value === "number";
    case "date":
      return value instanceof Date;
  }
}

function formatValue(value: ExcelJS.CellValue): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}
