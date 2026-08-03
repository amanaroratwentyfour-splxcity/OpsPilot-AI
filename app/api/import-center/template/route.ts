import { NextResponse } from "next/server";
import { generateTemplateWorkbook } from "@/lib/import/templateGenerator";
import { withRouteErrorHandling } from "@/lib/api/http";

const TEMPLATE_FILE_NAME = "OpsPilot_Template.xlsx";
const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Generates OpsPilot_Template.xlsx on every request — there is no static
 * file checked in, so the template can never drift out of sync with
 * lib/import/workbookSchema.ts (the same definitions a future validation
 * milestone will check uploads against).
 */
export const GET = withRouteErrorHandling(async () => {
  const buffer = await generateTemplateWorkbook();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${TEMPLATE_FILE_NAME}"`,
    },
  });
});
