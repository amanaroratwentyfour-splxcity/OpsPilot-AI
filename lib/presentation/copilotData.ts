import { prisma } from "@/lib/db/prisma";
import {
  RecommendationCategory,
  RecommendationSeverity,
  RecommendationStatus,
} from "@/lib/generated/prisma";

export interface CopilotFilters {
  status?: RecommendationStatus;
  severity?: RecommendationSeverity;
  category?: RecommendationCategory;
}

/**
 * Operations Copilot page data: AIRecommendation rows (the persisted
 * output of the Recommendation Persistence Orchestrator) joined with
 * product/supplier/warehouse names, plus the KPI counts the page header
 * needs. A plain read — the deterministic recommendations and any AI
 * narratives are both already persisted; this page never computes either.
 */
export async function getCopilotOverview(filters: CopilotFilters = {}) {
  const where = {
    status: filters.status ?? RecommendationStatus.ACTIVE,
    severity: filters.severity,
    category: filters.category,
  };

  // KPIs are scoped to the same severity/category filters as the list
  // itself (but not `status`, since byStatus needs every status and
  // activeSeverity needs every severity within ACTIVE) — so the KPI row
  // always summarizes exactly what's shown below it, not the whole table.
  const filterScope = { severity: filters.severity, category: filters.category };

  const [recommendations, statusCounts, activeSeverityCounts] = await Promise.all([
    prisma.aIRecommendation.findMany({
      where,
      select: {
        id: true,
        category: true,
        severity: true,
        status: true,
        metricJustification: true,
        aiNarrative: true,
        createdAt: true,
        updatedAt: true,
        product: { select: { id: true, name: true, sku: true } },
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    }),
    prisma.aIRecommendation.groupBy({ by: ["status"], where: filterScope, _count: true }),
    prisma.aIRecommendation.groupBy({
      by: ["severity"],
      where: { status: "ACTIVE", ...filterScope },
      _count: true,
    }),
  ]);

  const items = recommendations.map((r) => ({
    id: r.id,
    category: r.category,
    severity: r.severity,
    status: r.status,
    justification: r.metricJustification,
    aiNarrative: r.aiNarrative,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    entityName: r.product?.name ?? r.supplier?.name ?? r.warehouse?.name ?? null,
    entityLink: r.product ? `/inventory/${r.product.id}` : r.supplier ? `/suppliers/${r.supplier.id}` : null,
  }));

  const byStatus = { ACTIVE: 0, ACCEPTED: 0, DISMISSED: 0, SNOOZED: 0 };
  for (const group of statusCounts) {
    byStatus[group.status as keyof typeof byStatus] = group._count;
  }

  const activeSeverity = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  for (const group of activeSeverityCounts) {
    activeSeverity[group.severity as keyof typeof activeSeverity] = group._count;
  }

  const activeTotal = activeSeverity.CRITICAL + activeSeverity.WARNING + activeSeverity.INFO;
  const activeNarrated = await prisma.aIRecommendation.count({
    where: { status: "ACTIVE", aiNarrative: { not: null }, ...filterScope },
  });

  return {
    items,
    kpis: {
      byStatus,
      activeSeverity,
      activeTotal,
      narratedCoveragePercent: activeTotal > 0 ? (activeNarrated / activeTotal) * 100 : 0,
    },
  };
}
