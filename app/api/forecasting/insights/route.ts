import { NextRequest, NextResponse } from "next/server";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";
import { ClaudeForecastInsightProvider, type ForecastInsightInput } from "@/lib/ai/forecastInsightProvider";

/**
 * On-demand AI content for Forecasting's "Generate Forecast Insights"
 * button — mirrors app/api/suppliers/insights/route.ts exactly. If no
 * ANTHROPIC_API_KEY is configured, ClaudeForecastInsightProvider returns
 * all-null and this still responds 200 — AI unavailability is never an
 * error state.
 */
export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    throw new ApiError("Request body is required", 400);
  }

  const input: ForecastInsightInput = {
    movingAverageAccuracy: typeof body.movingAverageAccuracy === "number" ? body.movingAverageAccuracy : null,
    exponentialSmoothingAccuracy:
      typeof body.exponentialSmoothingAccuracy === "number" ? body.exponentialSmoothingAccuracy : null,
    productsRequiringAttention: Array.isArray(body.productsRequiringAttention) ? body.productsRequiringAttention : [],
  };

  const result = await new ClaudeForecastInsightProvider().generateInsights(input);
  return NextResponse.json(result);
});
