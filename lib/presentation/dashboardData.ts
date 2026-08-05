import { prisma } from "@/lib/db/prisma";
import { getCompanyAnalyticsSnapshot } from "@/lib/domain/analytics/recalculate";
import { LOW_RELIABILITY_THRESHOLD, WAREHOUSE_UTILIZATION_THRESHOLDS } from "@/lib/domain/config";
import { buildExecutiveBrief } from "./executiveBrief";
import type { RecommendationEntityType } from "./recommendationExplain";

const SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;

/**
 * Everything the Executive Dashboard page needs, composed from multiple
 * already-built engines: the Analytics company snapshot, plus raw
 * Inventory/Supplier/PurchaseOrder/AIRecommendation aggregates. Called
 * directly by app/page.tsx (Server Component, no HTTP round-trip for its
 * own render) and by app/api/dashboard/route.ts (thin JSON wrapper, for
 * client-side refetches and any external consumer) — one shared
 * implementation, not duplicated logic.
 */
export async function getDashboardSummary() {
  const snapshot = await getCompanyAnalyticsSnapshot();

  const [warehouses, stockStatusGroups, suppliers, overduePurchaseOrderCount, recommendationGroups, activeRecommendations] =
    await Promise.all([
      prisma.warehouse.findMany({ select: { id: true, name: true } }),
      prisma.inventory.groupBy({ by: ["stockStatus"], _count: true }),
      prisma.supplier.findMany({ select: { reliabilityScore: true } }),
      prisma.purchaseOrder.count({
        where: { status: "IN_TRANSIT", expectedDeliveryDate: { lt: new Date() } },
      }),
      prisma.aIRecommendation.groupBy({ by: ["severity"], where: { status: "ACTIVE" }, _count: true }),
      prisma.aIRecommendation.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          category: true,
          severity: true,
          metricJustification: true,
          aiNarrative: true,
          createdAt: true,
          productId: true,
          supplierId: true,
          warehouseId: true,
          product: { select: { name: true } },
          supplier: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
        take: 50,
      }),
    ]);

  const warehouseNameById = new Map(warehouses.map((w) => [w.id, w.name]));
  const warehouseUtilizations = snapshot.warehouseUtilizations.map((w) => ({
    warehouseId: w.warehouseId,
    warehouseName: warehouseNameById.get(w.warehouseId) ?? "Unknown Warehouse",
    utilizationPercent: w.utilizationPercent,
  }));

  const stockStatusCounts = { CRITICAL: 0, LOW: 0, HEALTHY: 0, OVERSTOCKED: 0 };
  for (const group of stockStatusGroups) {
    stockStatusCounts[group.stockStatus as keyof typeof stockStatusCounts] = group._count;
  }

  const scoredSuppliers = suppliers.filter((s) => s.reliabilityScore !== null);
  const belowThresholdCount = scoredSuppliers.filter(
    (s) => (s.reliabilityScore as number) < LOW_RELIABILITY_THRESHOLD,
  ).length;
  const averageReliability =
    scoredSuppliers.length > 0
      ? scoredSuppliers.reduce((sum, s) => sum + (s.reliabilityScore as number), 0) / scoredSuppliers.length
      : null;

  const recommendationCounts = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  for (const group of recommendationGroups) {
    recommendationCounts[group.severity as keyof typeof recommendationCounts] = group._count;
  }
  const totalActiveRecommendations =
    recommendationCounts.CRITICAL + recommendationCounts.WARNING + recommendationCounts.INFO;

  const topRecommendations = [...activeRecommendations]
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] -
        SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER],
    )
    .slice(0, 6)
    .map((r) => {
      const entityType: RecommendationEntityType = r.productId
        ? "product"
        : r.supplierId
          ? "supplier"
          : r.warehouseId
            ? "warehouse"
            : null;
      return {
        id: r.id,
        category: r.category,
        severity: r.severity,
        justification: r.metricJustification,
        aiNarrative: r.aiNarrative,
        entityName: r.product?.name ?? r.supplier?.name ?? r.warehouse?.name ?? null,
        entityType,
        createdAt: r.createdAt,
      };
    });

  const brief = buildExecutiveBrief({
    operationsHealthScore: snapshot.operationsHealthScore,
    stockStatusCounts,
    supplierReliability: { belowThresholdCount },
    forecastAccuracy: snapshot.operationsHealthComponents.avgForecastAccuracy,
    overduePurchaseOrderCount,
    warehouseUtilizations,
    warehouseCriticalThreshold: WAREHOUSE_UTILIZATION_THRESHOLDS.critical,
    topPriorityItem: topRecommendations[0]
      ? { entityName: topRecommendations[0].entityName, justification: topRecommendations[0].justification }
      : null,
  });

  return {
    brief,
    operationsHealthScore: snapshot.operationsHealthScore,
    operationsHealthComponents: snapshot.operationsHealthComponents,
    inventoryTurnover: snapshot.inventoryTurnover,
    warehouseUtilizations,
    stockStatusCounts,
    supplierReliability: {
      average: averageReliability,
      belowThresholdCount,
      totalScored: scoredSuppliers.length,
      totalSuppliers: suppliers.length,
    },
    overduePurchaseOrderCount,
    recommendationCounts: { ...recommendationCounts, total: totalActiveRecommendations },
    topRecommendations,
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;
