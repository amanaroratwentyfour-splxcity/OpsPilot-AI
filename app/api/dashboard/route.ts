import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/presentation/dashboardData";
import { withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async () => {
  const summary = await getDashboardSummary();
  return NextResponse.json(summary);
});
