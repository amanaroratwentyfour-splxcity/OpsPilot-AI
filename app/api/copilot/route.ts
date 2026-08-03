import { NextRequest, NextResponse } from "next/server";
import { getCopilotOverview } from "@/lib/presentation/copilotData";
import {
  RecommendationCategory,
  RecommendationSeverity,
  RecommendationStatus,
} from "@/lib/generated/prisma/enums";
import { parseEnumParam, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const result = await getCopilotOverview({
    status: parseEnumParam(params, "status", Object.values(RecommendationStatus)),
    severity: parseEnumParam(params, "severity", Object.values(RecommendationSeverity)),
    category: parseEnumParam(params, "category", Object.values(RecommendationCategory)),
  });
  return NextResponse.json(result);
});
