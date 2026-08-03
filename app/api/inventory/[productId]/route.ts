import { NextResponse } from "next/server";
import { getInventoryDetail } from "@/lib/presentation/inventoryData";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(
  async (_request: Request, { params }: { params: { productId: string } }) => {
    const detail = await getInventoryDetail(params.productId);
    if (!detail) {
      throw new ApiError("Product not found", 404);
    }
    return NextResponse.json(detail);
  },
);
