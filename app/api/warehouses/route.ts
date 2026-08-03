import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async () => {
  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, name: true, location: true, capacityUnits: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(warehouses);
});
