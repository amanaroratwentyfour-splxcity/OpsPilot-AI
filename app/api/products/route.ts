import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withRouteErrorHandling } from "@/lib/api/http";

/**
 * Lightweight product catalog, reused across Inventory/Procurement/
 * Forecasting/Analytics pages for pickers and filters. Not engine-specific
 * — a plain read of Product columns, no domain calculations.
 */
export const GET = withRouteErrorHandling(async () => {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      abcClass: true,
      unitOfMeasure: true,
    },
    orderBy: { sku: "asc" },
  });

  return NextResponse.json(products);
});
