import { NextRequest, NextResponse } from "next/server";
import { getForecastData } from "@/lib/presentation/forecastingData";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async (request: NextRequest) => {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) {
    throw new ApiError("productId is required", 400);
  }
  const data = await getForecastData(productId);
  if (!data) {
    throw new ApiError("Product not found", 404);
  }
  return NextResponse.json(data);
});
