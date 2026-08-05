import { NextRequest, NextResponse } from "next/server";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";
import { ClaudeAnalyticsInsightProvider, type AnalyticsInsightInput } from "@/lib/ai/analyticsInsightProvider";

/**
 * On-demand AI content for Analytics' "Generate Analytics Insights"
 * button — mirrors app/api/forecasting/insights/route.ts exactly. If no
 * ANTHROPIC_API_KEY is configured, ClaudeAnalyticsInsightProvider returns
 * all-null and this still responds 200 — AI unavailability is never an
 * error state.
 */
export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    throw new ApiError("Request body is required", 400);
  }

  const input: AnalyticsInsightInput = {
    totalInventoryValue: typeof body.totalInventoryValue === "number" ? body.totalInventoryValue : 0,
    highestValueWarehouseName:
      typeof body.highestValueWarehouseName === "string" ? body.highestValueWarehouseName : null,
    classCounts:
      body.classCounts && typeof body.classCounts === "object"
        ? { A: body.classCounts.A ?? 0, B: body.classCounts.B ?? 0, C: body.classCounts.C ?? 0 }
        : { A: 0, B: 0, C: 0 },
    inventoryTurnover: typeof body.inventoryTurnover === "number" ? body.inventoryTurnover : null,
    warehouseUtilizations: Array.isArray(body.warehouseUtilizations) ? body.warehouseUtilizations : [],
  };

  const result = await new ClaudeAnalyticsInsightProvider().generateInsights(input);
  return NextResponse.json(result);
});
