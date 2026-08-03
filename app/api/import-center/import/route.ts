import { NextRequest, NextResponse } from "next/server";
import { parseWorkbook, WorkbookParseError } from "@/lib/import/parseWorkbook";
import { validateParsedWorkbook } from "@/lib/import/validateWorkbook";
import { importWorkbook } from "@/lib/import/importWorkbook";
import { recalculateAllInventory } from "@/lib/domain/inventory/recalculate";
import { recalculateAllSupplierReliability } from "@/lib/domain/suppliers/recalculate";
import { recalculateAllForecasts } from "@/lib/domain/forecasting/recalculate";
import { recalculateABCClassification } from "@/lib/domain/analytics/recalculate";
import { recalculateAllRecommendations } from "@/lib/domain/recommendations/recalculate";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const XLSX_EXTENSION = ".xlsx";

/**
 * Commits a workbook's contents as the new business dataset, then
 * regenerates every calculated value from it. Stateless like
 * /api/import-center/validate — the uploaded file is re-parsed and
 * re-validated from scratch here rather than trusting a client-reported
 * "already validated" flag (defense in depth, same discipline as every
 * other route in this app). See DATA_IMPORT_ARCHITECTURE.md §4 for the
 * transaction design and delete/insert ordering this delegates to.
 *
 * The five recalculate* calls are exactly the ones POST /api/recalculate
 * already runs, in the same dependency order — no formula is reimplemented
 * here; this route only sequences the same existing engines.
 */
export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const startedAt = Date.now();

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

  const parsed = await parseWorkbook(buffer).catch((error: unknown) => {
    throw new ApiError(
      error instanceof WorkbookParseError ? error.message : "The uploaded file could not be read as a .xlsx workbook.",
      400,
    );
  });

  const report = validateParsedWorkbook(parsed);
  if (report.blocked) {
    throw new ApiError(
      `This workbook has ${report.errorCount} validation error(s) and cannot be imported. Please validate it again.`,
      400,
    );
  }

  const imported = await importWorkbook(parsed);

  let recalculated = true;
  try {
    await recalculateAllInventory();
    await recalculateAllSupplierReliability();
    await recalculateAllForecasts();
    await recalculateABCClassification();
    await recalculateAllRecommendations();
  } catch (error) {
    // The import itself already committed and is valid — a recalculation
    // failure here doesn't undo it. Same reasoning as /api/recalculate:
    // report what happened rather than claiming a false all-or-nothing
    // guarantee. The user can retry via the existing Recalculate action.
    console.error("Import succeeded but recalculation failed", error);
    recalculated = false;
  }

  return NextResponse.json({
    imported,
    recalculated,
    durationMs: Date.now() - startedAt,
  });
});
