import { NextResponse } from "next/server";
import { getSuppliersList } from "@/lib/presentation/suppliersData";
import { withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async () => {
  const result = await getSuppliersList();
  return NextResponse.json(result);
});
