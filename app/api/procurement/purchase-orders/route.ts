import { NextRequest, NextResponse } from "next/server";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";
import { createPurchaseOrder, ProcurementActionError } from "@/lib/presentation/procurementActions";

/**
 * Creates a DRAFT purchase order with a single line item — the action
 * behind the Procurement page's "Create PO" button on an EOQ suggestion.
 * HTTP-level validation only; the actual write lives in
 * lib/presentation/procurementActions.ts so it can be exercised directly
 * in integration tests, same as every other write in this app.
 */
export const POST = withRouteErrorHandling(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const productId = body?.productId;
  const supplierId = body?.supplierId;
  const warehouseId = body?.warehouseId;
  const quantity = Number(body?.quantity);

  if (typeof productId !== "string" || !productId) {
    throw new ApiError("productId is required", 400);
  }
  if (typeof supplierId !== "string" || !supplierId) {
    throw new ApiError("supplierId is required", 400);
  }
  if (typeof warehouseId !== "string" || !warehouseId) {
    throw new ApiError("warehouseId is required", 400);
  }

  try {
    const purchaseOrder = await createPurchaseOrder({ productId, supplierId, warehouseId, quantity });
    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    if (error instanceof ProcurementActionError) {
      throw new ApiError(error.message, error.status);
    }
    throw error;
  }
});
