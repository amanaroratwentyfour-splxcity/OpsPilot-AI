import { prisma } from "@/lib/db/prisma";
import { computeInventoryHealthScore } from "@/lib/domain/inventory/healthScore";
import { computeDemandStatistics } from "@/lib/domain/inventory/demandStatistics";
import { getCompanyAnalyticsSnapshot } from "@/lib/domain/analytics/recalculate";
import type { ProductCategory, StockStatus } from "@/lib/generated/prisma/enums";

export interface InventoryListFilters {
  warehouseId?: string;
  category?: ProductCategory;
  stockStatus?: StockStatus;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Inventory Intelligence list view: persisted Inventory rows (onHandQty,
 * safetyStock, reorderPoint, stockStatus were all written by
 * recalculateAllInventory) joined with Product/Warehouse, plus healthScore
 * computed live per row via computeInventoryHealthScore — the one field
 * this page needs that isn't a persisted column.
 *
 * KPIs and the category chart are computed over the full filtered set (812
 * rows max, cheap); only the table itself is paginated for display. This
 * intentionally fetches all matching rows and slices in JS rather than
 * pushing pagination down to the database — the KPIs/chart need the full
 * filtered set regardless, and at this dataset's scale (a few hundred
 * rows/category at most) that scan is cheap. A real multi-warehouse
 * deployment would push page/pageSize into a DB-level skip/take and
 * compute the aggregates with a separate query.
 */
export async function getInventoryList(filters: InventoryListFilters = {}) {
  const [rows, snapshot] = await Promise.all([
    prisma.inventory.findMany({
      where: {
        warehouseId: filters.warehouseId,
        stockStatus: filters.stockStatus,
        product: filters.category ? { category: filters.category } : undefined,
      },
      select: {
        id: true,
        onHandQty: true,
        safetyStock: true,
        reorderPoint: true,
        stockStatus: true,
        product: { select: { id: true, sku: true, name: true, category: true, unitCost: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: [{ stockStatus: "asc" }, { product: { sku: "asc" } }],
    }),
    // Company-wide, not affected by this page's warehouse/category/status
    // filters (there is no per-filter turnover calculation — see
    // buildInventoryBrief's caller) — the same value the Executive
    // Dashboard already shows, reused rather than recomputed.
    getCompanyAnalyticsSnapshot(),
  ]);

  const items = rows.map((row) => ({
    inventoryId: row.id,
    productId: row.product.id,
    sku: row.product.sku,
    name: row.product.name,
    category: row.product.category,
    warehouseId: row.warehouse.id,
    warehouseName: row.warehouse.name,
    onHandQty: row.onHandQty,
    safetyStock: row.safetyStock,
    reorderPoint: row.reorderPoint,
    stockStatus: row.stockStatus,
    healthScore: computeInventoryHealthScore(row.onHandQty, row.reorderPoint),
    inventoryValue: row.onHandQty * row.product.unitCost,
  }));

  const kpis = {
    totalPositions: items.length,
    critical: items.filter((i) => i.stockStatus === "CRITICAL").length,
    low: items.filter((i) => i.stockStatus === "LOW").length,
    healthy: items.filter((i) => i.stockStatus === "HEALTHY").length,
    overstocked: items.filter((i) => i.stockStatus === "OVERSTOCKED").length,
    totalValue: items.reduce((sum, i) => sum + i.inventoryValue, 0),
  };

  const categoryBreakdown = Object.entries(
    items.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([category, count]) => ({ category, count }));

  // Presentation-layer aggregations over the already-fetched `items` array —
  // no new domain calculation, purely grouping/summarizing values
  // computeInventoryHealthScore and classifyStockStatus already produced,
  // the same pattern healthScoreContributors.ts uses for the dashboard.
  const scoredItems = items.filter((i): i is typeof items[number] & { healthScore: number } => i.healthScore !== null);
  const avgHealthScore =
    scoredItems.length > 0 ? scoredItems.reduce((sum, i) => sum + i.healthScore, 0) / scoredItems.length : null;

  const overstockedValue = items
    .filter((i) => i.stockStatus === "OVERSTOCKED")
    .reduce((sum, i) => sum + i.inventoryValue, 0);

  const warehouseBreakdown = Object.values(
    items.reduce<Record<string, { warehouseId: string; warehouseName: string; critical: number; overstocked: number; total: number }>>(
      (acc, i) => {
        const entry = (acc[i.warehouseId] ??= {
          warehouseId: i.warehouseId,
          warehouseName: i.warehouseName,
          critical: 0,
          overstocked: 0,
          total: 0,
        });
        entry.total += 1;
        if (i.stockStatus === "CRITICAL") entry.critical += 1;
        if (i.stockStatus === "OVERSTOCKED") entry.overstocked += 1;
        return acc;
      },
      {},
    ),
  );

  const worstItem = (status: "CRITICAL" | "OVERSTOCKED") => {
    const candidates = scoredItems.filter((i) => i.stockStatus === status);
    if (candidates.length === 0) return null;
    const worst = candidates.reduce((a, b) => (b.healthScore < a.healthScore ? b : a));
    return {
      name: worst.name,
      warehouseName: worst.warehouseName,
      onHandQty: worst.onHandQty,
      reorderPoint: Math.round(worst.reorderPoint),
    };
  };

  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: pagedItems,
    totalItems: items.length,
    page,
    pageSize,
    totalPages,
    kpis,
    categoryBreakdown,
    warehouseBreakdown,
    avgHealthScore,
    overstockedValue,
    worstCriticalItem: worstItem("CRITICAL"),
    worstOverstockedItem: worstItem("OVERSTOCKED"),
    inventoryTurnover: snapshot.inventoryTurnover,
  };
}

/**
 * Inventory Intelligence detail view for one product: per-warehouse
 * position (persisted values + live healthScore) and the full weekly
 * demand history for the chart, plus a live demand-statistics recompute so
 * the page can show avg daily demand / variability alongside stock levels.
 */
export async function getInventoryDetail(productId: string) {
  const [product, activeRecommendations] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        unitCost: true,
        unitPrice: true,
        leadTimeDays: true,
        abcClass: true,
        inventory: {
          select: {
            id: true,
            onHandQty: true,
            safetyStock: true,
            reorderPoint: true,
            stockStatus: true,
            warehouse: { select: { id: true, name: true } },
          },
        },
        demandHistory: {
          orderBy: { periodDate: "asc" },
          select: { periodDate: true, quantitySold: true },
        },
      },
    }),
    // Powers the Risk Explanation and AI Insight sections below — this
    // product's own currently-ACTIVE recommendations, if any (a product
    // with no critical/overstocked position simply has none). aiNarrative
    // is read here, never generated here: narration only ever happens via
    // Operations Copilot's existing "Generate AI Insights" batch flow
    // (lib/ai/narrateRecommendations.ts) — this page displays whatever
    // that flow already produced, or a graceful "not yet generated" state.
    prisma.aIRecommendation.findMany({
      where: { productId, status: "ACTIVE" },
      select: { id: true, category: true, severity: true, metricJustification: true, aiNarrative: true, warehouseId: true },
    }),
  ]);

  if (!product) return null;

  const warehousePositions = product.inventory.map((inv) => ({
    warehouseId: inv.warehouse.id,
    warehouseName: inv.warehouse.name,
    onHandQty: inv.onHandQty,
    safetyStock: inv.safetyStock,
    reorderPoint: inv.reorderPoint,
    stockStatus: inv.stockStatus,
    healthScore: computeInventoryHealthScore(inv.onHandQty, inv.reorderPoint),
  }));

  const weeklyQuantities = product.demandHistory.map((d) => d.quantitySold);
  const demandStatistics = computeDemandStatistics(weeklyQuantities);

  return {
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      unitCost: product.unitCost,
      unitPrice: product.unitPrice,
      leadTimeDays: product.leadTimeDays,
      abcClass: product.abcClass,
    },
    warehousePositions,
    demandStatistics,
    demandHistory: product.demandHistory.map((d) => ({
      periodDate: d.periodDate,
      quantitySold: d.quantitySold,
    })),
    activeRecommendations: activeRecommendations.map((r) => ({
      id: r.id,
      category: r.category,
      severity: r.severity,
      justification: r.metricJustification,
      aiNarrative: r.aiNarrative,
      warehouseId: r.warehouseId,
    })),
  };
}
