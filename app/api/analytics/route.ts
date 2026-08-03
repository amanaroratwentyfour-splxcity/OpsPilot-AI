import { NextResponse } from "next/server";
import { getAnalyticsOverview } from "@/lib/presentation/analyticsData";
import { withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async () => {
  const result = await getAnalyticsOverview();
  return NextResponse.json(result);
});
