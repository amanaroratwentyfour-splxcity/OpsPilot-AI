import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { RecommendationStatus } from "@/lib/generated/prisma";
import { ApiError, withRouteErrorHandling } from "@/lib/api/http";

const VALID_STATUSES = Object.values(RecommendationStatus);

/**
 * Updates a recommendation's status (Accept/Dismiss/Snooze) — the one
 * write action the Recommendation panel needs to be interactive. A plain
 * status write, no domain logic: it doesn't touch metricJustification,
 * aiNarrative, or any other field, and it's exactly the RecommendationStatus
 * workflow the schema already defines. The Persistence Orchestrator (POST
 * /api/recalculate) never overwrites this — matched ACTIVE rows only ever
 * get severity/metricJustification refreshed; non-ACTIVE rows are never
 * touched at all.
 */
export const PATCH = withRouteErrorHandling(
  async (request: Request, { params }: { params: { id: string } }) => {
    const body = await request.json().catch(() => null);
    const status = body?.status;

    if (!status || !VALID_STATUSES.includes(status)) {
      throw new ApiError(`status must be one of ${VALID_STATUSES.join(", ")}`, 400);
    }

    try {
      const updated = await prisma.aIRecommendation.update({
        where: { id: params.id },
        data: { status },
        select: { id: true, status: true },
      });
      return NextResponse.json(updated);
    } catch {
      throw new ApiError("Recommendation not found", 404);
    }
  },
);
