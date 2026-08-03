import { WORKBOOK_SHEETS } from "./workbookSchema";
import type { ValidationIssue } from "./validationIssue";

export interface ValidationReport {
  /** Sorted: by sheet in workbook tab order, then ERROR before WARNING, then by row. */
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  /** true when errorCount > 0 — the workbook cannot be imported until every ERROR is fixed. */
  blocked: boolean;
}

const SEVERITY_RANK: Record<ValidationIssue["severity"], number> = { ERROR: 0, WARNING: 1 };
const SHEET_RANK = new Map(WORKBOOK_SHEETS.map((sheet, index) => [sheet.name, index]));

export function buildValidationReport(issues: readonly ValidationIssue[]): ValidationReport {
  const sorted = [...issues].sort((a, b) => {
    const sheetDelta = sheetRank(a.sheet) - sheetRank(b.sheet);
    if (sheetDelta !== 0) return sheetDelta;
    const severityDelta = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severityDelta !== 0) return severityDelta;
    return (a.row ?? 0) - (b.row ?? 0);
  });

  const errorCount = sorted.filter((issue) => issue.severity === "ERROR").length;

  return {
    issues: sorted,
    errorCount,
    warningCount: sorted.length - errorCount,
    blocked: errorCount > 0,
  };
}

function sheetRank(sheetName: string): number {
  return SHEET_RANK.get(sheetName) ?? Number.MAX_SAFE_INTEGER;
}
