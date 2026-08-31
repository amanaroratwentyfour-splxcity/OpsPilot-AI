import { NextRequest, NextResponse } from "next/server";
import { getProcurementOverview } from "@/lib/presentation/procurementData";
import { PurchaseOrderStatus } from "@/lib/generated/prisma";
import { parseEnumParam, parsePaginationParams, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const { page, pageSize } = parsePaginationParams(params);
  const result = await getProcurementOverview({
    status: parseEnumParam(params, "status", Object.values(PurchaseOrderStatus)),
    supplierId: params.get("supplierId") ?? undefined,
    warehouseId: params.get("warehouseId") ?? undefined,
    page,
    pageSize,
  });
  return NextResponse.json(result);
});
