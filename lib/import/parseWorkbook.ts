import ExcelJS from "exceljs";
import { WORKBOOK_SHEETS } from "./workbookSchema";

const HEADER_ROW = 1;

/** Thrown when the uploaded file isn't a workbook ExcelJS can open at all. */
export class WorkbookParseError extends Error {}

export interface ParsedRow {
  /** 1-indexed row number as it appears in the actual worksheet — used to point validation issues at the right cell. */
  rowNumber: number;
  /** Cell values keyed by the actual header text found in that column (not necessarily the expected one). */
  values: Record<string, ExcelJS.CellValue>;
}

export interface ParsedSheet {
  name: string;
  present: boolean;
  /** Actual header row values, trimmed, in column order (blank string for an empty header cell). Empty array if absent. */
  headers: string[];
  rows: ParsedRow[];
}

export interface ParsedWorkbook {
  /** Keyed by expected sheet name (from workbookSchema) — every data sheet is always present as a key, even if absent from the file. */
  sheets: Record<string, ParsedSheet>;
}

/**
 * Reads an uploaded .xlsx file into a structured, positionally-aligned
 * representation — no validation happens here (see structuralValidation.ts,
 * businessValidation.ts, referentialValidation.ts). Only the 7 data sheets
 * defined in workbookSchema.ts are read; Instructions/DataDictionary are
 * output-only and never parsed back.
 */
export async function parseWorkbook(buffer: Buffer | ArrayBuffer): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as ExcelJS.Buffer);
  } catch {
    throw new WorkbookParseError("The uploaded file could not be read as a .xlsx workbook.");
  }

  const sheets: Record<string, ParsedSheet> = {};
  for (const sheetDefinition of WORKBOOK_SHEETS) {
    sheets[sheetDefinition.name] = parseSheet(workbook, sheetDefinition.name);
  }
  return { sheets };
}

function parseSheet(workbook: ExcelJS.Workbook, sheetName: string): ParsedSheet {
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    return { name: sheetName, present: false, headers: [], rows: [] };
  }

  const headers = readHeaderRow(worksheet);
  const rows: ParsedRow[] = [];

  for (let rowNumber = HEADER_ROW + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (isRowBlank(row, headers.length)) continue;

    const values: Record<string, ExcelJS.CellValue> = {};
    headers.forEach((header, index) => {
      if (!header) return; // ignore a column with no header — nothing to key it by
      values[header] = row.getCell(index + 1).value;
    });
    rows.push({ rowNumber, values });
  }

  return { name: sheetName, present: true, headers, rows };
}

/** Reads row 1 positionally (including empty header cells) so later column-index lookups stay aligned even if a header is missing. */
function readHeaderRow(worksheet: ExcelJS.Worksheet): string[] {
  const headerRow = worksheet.getRow(HEADER_ROW);
  const headers: string[] = [];
  for (let col = 1; col <= headerRow.cellCount; col++) {
    const value = headerRow.getCell(col).value;
    headers.push(value === null || value === undefined ? "" : String(value).trim());
  }
  return headers;
}

function isRowBlank(row: ExcelJS.Row, columnCount: number): boolean {
  for (let col = 1; col <= columnCount; col++) {
    const value = row.getCell(col).value;
    if (value !== null && value !== undefined && String(value).trim() !== "") return false;
  }
  return true;
}
