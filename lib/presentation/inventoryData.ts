import { prisma } from "@/lib/db/prisma";
import { computeInventoryHealthScore } from "@/lib/domain/inventory/healthScore";
import { computeDemandStatistics } from "@/lib/domain/inventory/demandStatistics";
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
  const rows = await prisma.inventory.findMany({
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
  });

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
  };
}

/**
 * Inventory Intelligence detail view for one product: per-warehouse
 * position (persisted values + live healthScore) and the full weekly
 * demand history for the chart, plus a live demand-statistics recompute so
 * the page can show avg daily demand / variability alongside stock levels.
 */
export async function getInventoryDetail(productId: string) {
  const product = await prisma.product.findUnique({
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
  });

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
  };
}
