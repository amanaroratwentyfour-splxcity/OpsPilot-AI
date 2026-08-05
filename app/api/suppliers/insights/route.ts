import { NextRequest, NextResponse } from "next/server";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";
import { ClaudeSupplierInsightProvider, type SupplierInsightInput } from "@/lib/ai/supplierInsightProvider";

/**
 * On-demand AI content for Suppliers' "Generate Supplier Insights" button
 * — mirrors app/api/procurement/insights/route.ts exactly. If no
 * ANTHROPIC_API_KEY is configured, ClaudeSupplierInsightProvider returns
 * all-null and this still responds 200 — AI unavailability is never an
 * error state.
 */
export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    throw new ApiError("Request body is required", 400);
  }

  const input: SupplierInsightInput = {
    totalSuppliers: typeof body.totalSuppliers === "number" ? body.totalSuppliers : 0,
    averageReliability: typeof body.averageReliability === "number" ? body.averageReliability : null,
    belowThreshold: typeof body.belowThreshold === "number" ? body.belowThreshold : 0,
    flaggedSuppliers: Array.isArray(body.flaggedSuppliers) ? body.flaggedSuppliers : [],
  };

  const result = await new ClaudeSupplierInsightProvider().generateInsights(input);
  return NextResponse.json(result);
});
