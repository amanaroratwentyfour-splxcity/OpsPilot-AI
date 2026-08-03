import { prisma } from "@/lib/db/prisma";
import { computeAnnualDemand } from "@/lib/domain/procurement/annualDemand";
import { computeUsageValue } from "@/lib/domain/analytics/usageValue";
import { classifyABC, type ProductUsageValue } from "@/lib/domain/analytics/abcClassification";
import { getCompanyAnalyticsSnapshot } from "@/lib/domain/analytics/recalculate";

/**
 * Analytics page data: the company-wide snapshot (Inventory Turnover,
 * Warehouse Utilization, Operations Health Score — via
 * getCompanyAnalyticsSnapshot, the same read-only Analytics Engine
 * function the Dashboard uses) plus a live ABC classification ranking.
 *
 * The ranking reuses computeAnnualDemand, computeUsageValue, and
 * classifyABC — the exact same functions recalculateABCClassification
 * uses — just without persisting, since the full ranked breakdown
 * (cumulative %, usage value) isn't itself a persisted column; only the
 * final `abcClass` letter is.
 */
export async function getAnalyticsOverview() {
  const [snapshot, warehouses, products] = await Promise.all([
    getCompanyAnalyticsSnapshot(),
    prisma.warehouse.findMany({ select: { id: true, name: true } }),
    prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        unitCost: true,
        demandHistory: { orderBy: { periodDate: "asc" }, select: { quantitySold: true } },
      },
    }),
  ]);

  const warehouseNameById = new Map(warehouses.map((w) => [w.id, w.name]));
  const warehouseUtilizations = snapshot.warehouseUtilizations.map((w) => ({
    warehouseId: w.warehouseId,
    warehouseName: warehouseNameById.get(w.warehouseId) ?? "Unknown Warehouse",
    utilizationPercent: w.utilizationPercent,
  }));

  const usageValues: ProductUsageValue[] = [];
  const productById = new Map(products.map((p) => [p.id, p]));
  for (const product of products) {
    const { annualDemand } = computeAnnualDemand(product.demandHistory.map((d) => d.quantitySold));
    const usageValue = computeUsageValue(annualDemand, product.unitCost);
    if (usageValue !== null) {
      usageValues.push({ productId: product.id, sku: product.sku, usageValue });
    }
  }

  const classifications = classifyABC(usageValues) ?? [];
  const abcRanking = classifications.map((c) => {
    const product = productById.get(c.productId)!;
    return {
      productId: c.productId,
      sku: product.sku,
      name: product.name,
      category: product.category,
      usageValue: c.usageValue,
      cumulativeValuePercent: c.cumulativeValuePercent,
      abcClass: c.abcClass,
    };
  });

  const classCounts = { A: 0, B: 0, C: 0 };
  for (const row of abcRanking) {
    classCounts[row.abcClass] += 1;
  }

  return {
    operationsHealthScore: snapshot.operationsHealthScore,
    operationsHealthComponents: snapshot.operationsHealthComponents,
    inventoryTurnover: snapshot.inventoryTurnover,
    warehouseUtilizations,
    abcRanking,
    classCounts,
  };
}
