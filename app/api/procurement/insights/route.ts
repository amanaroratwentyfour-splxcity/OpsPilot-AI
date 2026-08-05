import { NextRequest, NextResponse } from "next/server";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";
import { ClaudeProcurementInsightProvider, type ProcurementInsightInput } from "@/lib/ai/procurementInsightProvider";

/**
 * On-demand AI content for Procurement's "Generate Procurement Insights"
 * button — mirrors app/api/inventory/insights/route.ts exactly. If no
 * ANTHROPIC_API_KEY is configured, ClaudeProcurementInsightProvider returns
 * all-null and this still responds 200 — AI unavailability is never an
 * error state.
 */
export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    throw new ApiError("Request body is required", 400);
  }

  const input: ProcurementInsightInput = {
    openPurchaseOrders: typeof body.openPurchaseOrders === "number" ? body.openPurchaseOrders : 0,
    overduePurchaseOrders: typeof body.overduePurchaseOrders === "number" ? body.overduePurchaseOrders : 0,
    flaggedProducts: typeof body.flaggedProducts === "number" ? body.flaggedProducts : 0,
    risks: Array.isArray(body.risks) ? body.risks : [],
  };

  const result = await new ClaudeProcurementInsightProvider().generateInsights(input);
  return NextResponse.json(result);
});
