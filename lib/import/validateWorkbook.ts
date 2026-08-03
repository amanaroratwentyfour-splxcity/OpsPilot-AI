import { parseWorkbook, WorkbookParseError, type ParsedWorkbook } from "./parseWorkbook";
import { validateStructure } from "./structuralValidation";
import { validateBusinessRules } from "./businessValidation";
import { validateReferences } from "./referentialValidation";
import { buildValidationReport, type ValidationReport } from "./validationReport";
import { errorIssue } from "./validationIssue";

export interface SheetSummary {
  name: string;
  present: boolean;
  rowCount: number;
}

export interface WorkbookValidationResult {
  report: ValidationReport;
  sheetSummary: SheetSummary[];
}

/**
 * Runs all three validation passes (structural → business → referential)
 * against an already-parsed workbook and combines the result into one
 * report. Separated from validateWorkbook() below so the Import Engine can
 * re-validate a workbook it has already parsed itself, without parsing the
 * same file twice.
 */
export function validateParsedWorkbook(parsed: ParsedWorkbook): ValidationReport {
  const issues = [
    ...validateStructure(parsed),
    ...validateBusinessRules(parsed),
    ...validateReferences(parsed),
  ];
  return buildValidationReport(issues);
}

/**
 * The single entry point for validating an uploaded workbook: read it,
 * then run all three passes in order, and return one combined report.
 * Never throws — even a corrupted file that can't be parsed at all comes
 * back as a normal report with one FILE_UNREADABLE issue, so callers never
 * need a separate error-handling path for "the file itself was bad."
 *
 * This function never writes to the database — see
 * DATA_IMPORT_ARCHITECTURE.md §1.2/§4.
 */
export async function validateWorkbook(buffer: Buffer | ArrayBuffer): Promise<WorkbookValidationResult> {
  try {
    const parsed = await parseWorkbook(buffer);
    const sheetSummary: SheetSummary[] = Object.values(parsed.sheets).map((sheet) => ({
      name: sheet.name,
      present: sheet.present,
      rowCount: sheet.rows.length,
    }));

    return { report: validateParsedWorkbook(parsed), sheetSummary };
  } catch (error) {
    const message =
      error instanceof WorkbookParseError
        ? error.message
        : "The uploaded file could not be read as a .xlsx workbook.";
    return {
      report: buildValidationReport([errorIssue("(file)", null, null, "FILE_UNREADABLE", message)]),
      sheetSummary: [],
    };
  }
}
