import { NextRequest, NextResponse } from "next/server";
import { getInventoryList } from "@/lib/presentation/inventoryData";
import { ProductCategory, StockStatus } from "@/lib/generated/prisma/enums";
import { parseEnumParam, parsePaginationParams, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const { page, pageSize } = parsePaginationParams(params);
  const result = await getInventoryList({
    warehouseId: params.get("warehouseId") ?? undefined,
    category: parseEnumParam(params, "category", Object.values(ProductCategory)),
    stockStatus: parseEnumParam(params, "stockStatus", Object.values(StockStatus)),
    page,
    pageSize,
  });
  return NextResponse.json(result);
});
