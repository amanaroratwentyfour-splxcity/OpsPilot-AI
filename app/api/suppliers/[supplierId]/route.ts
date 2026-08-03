import { NextResponse } from "next/server";
import { getSupplierDetail } from "@/lib/presentation/suppliersData";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(
  async (_request: Request, { params }: { params: { supplierId: string } }) => {
    const detail = await getSupplierDetail(params.supplierId);
    if (!detail) {
      throw new ApiError("Supplier not found", 404);
    }
    return NextResponse.json(detail);
  },
);
