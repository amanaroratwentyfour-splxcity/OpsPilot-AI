import { NextRequest, NextResponse } from "next/server";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";
import {
  ClaudeDashboardInsightProvider,
  type DashboardInsightInput,
} from "@/lib/ai/dashboardInsightProvider";

/**
 * On-demand AI content for the Executive Dashboard's chart Intelligence
 * Footers and Operations Health Score panel (DESIGN_SPECIFICATION.md
 * §7.2/§4). Deliberately triggered by an explicit button click, not
 * generated on every page load — same "optional enhancement, never
 * blocking" pattern as /api/copilot/narrate. If no ANTHROPIC_API_KEY is
 * configured, ClaudeDashboardInsightProvider returns all-null and this
 * still responds 200 — AI unavailability is never an error state.
 *
 * Nothing here is persisted: there's no schema field for these three
 * strings, so results live only in the requesting browser's session
 * state and are regenerated on request, never cached server-side.
 */
export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    throw new ApiError("Request body is required", 400);
  }

  const input: DashboardInsightInput = {
    operationsHealthScore: typeof body.operationsHealthScore === "number" ? body.operationsHealthScore : null,
    healthComponents: Array.isArray(body.healthComponents) ? body.healthComponents : [],
    warehouseUtilizations: Array.isArray(body.warehouseUtilizations) ? body.warehouseUtilizations : [],
    stockStatusCounts: body.stockStatusCounts ?? { CRITICAL: 0, LOW: 0, HEALTHY: 0, OVERSTOCKED: 0 },
  };

  const result = await new ClaudeDashboardInsightProvider().generateInsights(input);
  return NextResponse.json(result);
});
