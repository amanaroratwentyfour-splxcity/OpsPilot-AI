import { NextRequest, NextResponse } from "next/server";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";
import { ClaudeInventoryInsightProvider, type InventoryInsightInput } from "@/lib/ai/inventoryInsightProvider";

/**
 * On-demand AI content for the Inventory Intelligence page's chart
 * Intelligence Footers — mirrors app/api/dashboard/insights/route.ts
 * exactly. Triggered by an explicit button click, not generated on every
 * page load. If no ANTHROPIC_API_KEY is configured,
 * ClaudeInventoryInsightProvider returns all-null and this still responds
 * 200 — AI unavailability is never an error state.
 */
export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    throw new ApiError("Request body is required", 400);
  }

  const input: InventoryInsightInput = {
    totalPositions: typeof body.totalPositions === "number" ? body.totalPositions : 0,
    critical: typeof body.critical === "number" ? body.critical : 0,
    overstocked: typeof body.overstocked === "number" ? body.overstocked : 0,
    avgHealthScore: typeof body.avgHealthScore === "number" ? body.avgHealthScore : null,
    categoryBreakdown: Array.isArray(body.categoryBreakdown) ? body.categoryBreakdown : [],
    warehouseBreakdown: Array.isArray(body.warehouseBreakdown) ? body.warehouseBreakdown : [],
  };

  const result = await new ClaudeInventoryInsightProvider().generateInsights(input);
  return NextResponse.json(result);
});
