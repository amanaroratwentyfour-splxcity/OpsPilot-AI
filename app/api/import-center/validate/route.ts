import { NextRequest, NextResponse } from "next/server";
import { validateWorkbook } from "@/lib/import/validateWorkbook";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const XLSX_EXTENSION = ".xlsx";

/**
 * Reads an uploaded workbook and returns a Validation Report — never
 * writes to the database. See DATA_IMPORT_ARCHITECTURE.md §1.2/§3. Import
 * (committing validated data) is a separate, later milestone; this route
 * is stateless — it re-parses and re-validates on every call rather than
 * staging anything server-side, since there is nothing yet to reuse a
 * staged workbook for.
 */
export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    throw new ApiError('A file is required (form field "file").', 400);
  }
  if (!file.name.toLowerCase().endsWith(XLSX_EXTENSION)) {
    throw new ApiError("Please upload a .xlsx file.", 400);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(`File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB size limit.`, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { report, sheetSummary } = await validateWorkbook(buffer);

  return NextResponse.json({ fileName: file.name, report, sheetSummary });
});
