import { Boxes, AlertTriangle, TrendingDown, PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { InventoryBrief } from "@/components/inventory/inventory-brief";
import { InventoryInsightsProvider } from "@/components/inventory/inventory-insights-context";
import { GenerateInsightsButton } from "@/components/inventory/generate-insights-button";
import { StockStatusFooter } from "@/components/inventory/stock-status-footer";
import { CategoryChartFooter } from "@/components/inventory/category-chart-footer";
import { FilterSelect } from "@/components/filter-select";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { StockStatusChart } from "@/components/dashboard/stock-status-chart";
import { CategoryChart } from "@/components/inventory/category-chart";
import { Pagination } from "@/components/pagination";
import { getInventoryList } from "@/lib/presentation/inventoryData";
import { buildInventoryBrief } from "@/lib/presentation/inventoryBrief";
import { buildStockStatusInsight, buildCategoryBreakdownInsight } from "@/lib/presentation/chartInsights";
import { KPI_DEFINITIONS, kpiCurrentInterpretation } from "@/lib/presentation/kpiDefinitions";
import { PRODUCT_CATEGORIES, STOCK_STATUSES } from "@/lib/presentation/constants";
import { formatNumber, formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/db/prisma";
import { matchEnumValue, toPositiveInt } from "@/lib/api/http";
import { ProductCategory, StockStatus } from "@/lib/generated/prisma/enums";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { warehouseId?: string; category?: string; stockStatus?: string; page?: string };
}) {
  const [
    {
      items,
      kpis,
      categoryBreakdown,
      warehouseBreakdown,
      avgHealthScore,
      overstockedValue,
      worstCriticalItem,
      worstOverstockedItem,
      inventoryTurnover,
      totalItems,
      page,
      pageSize,
      totalPages,
    },
    warehouses,
  ] = await Promise.all([
    getInventoryList({
      warehouseId: searchParams.warehouseId,
      category: matchEnumValue(searchParams.category, Object.values(ProductCategory)),
      stockStatus: matchEnumValue(searchParams.stockStatus, Object.values(StockStatus)),
      page: toPositiveInt(searchParams.page, 1),
    }),
    prisma.warehouse.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const brief = buildInventoryBrief({
    kpis,
    avgHealthScore,
    overstockedValue,
    warehouseBreakdown,
    inventoryTurnover,
    worstCriticalItem,
    worstOverstockedItem,
  });

  const criticalTone = kpis.critical > 0 ? "critical" : "good";
  const overstockedTone = kpis.overstocked > 0 ? "warning" : "good";

  const stockInsight = buildStockStatusInsight({
    CRITICAL: kpis.critical,
    LOW: kpis.low,
    HEALTHY: kpis.healthy,
    OVERSTOCKED: kpis.overstocked,
  });
  const categoryInsight = buildCategoryBreakdownInsight(categoryBreakdown);

  const aiRequestPayload = {
    totalPositions: kpis.totalPositions,
    critical: kpis.critical,
    overstocked: kpis.overstocked,
    avgHealthScore,
    categoryBreakdown,
    warehouseBreakdown: warehouseBreakdown.map((w) => ({
      warehouseName: w.warehouseName,
      critical: w.critical,
      overstocked: w.overstocked,
    })),
  };

  return (
    <InventoryInsightsProvider requestPayload={aiRequestPayload}>
      <div className="space-y-6">
        <PageHeader
          title="Inventory Intelligence"
          description="Stock positions, health scores, and reorder signals across every warehouse."
        />

        <InventoryBrief sections={brief} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardKpiCard
            label="Total Positions"
            value={formatNumber(kpis.totalPositions)}
            icon={Boxes}
            info={{
              label: "Total Positions",
              content: KPI_DEFINITIONS.totalPositions,
              currentInterpretation: kpiCurrentInterpretation("totalPositions", kpis.totalPositions),
            }}
          />
          <DashboardKpiCard
            label="Critical"
            value={formatNumber(kpis.critical)}
            icon={AlertTriangle}
            tone={criticalTone}
            trend={{ label: criticalTone === "critical" ? "Critical" : "Healthy", tone: criticalTone }}
            info={{
              label: "Critical",
              content: KPI_DEFINITIONS.criticalInventoryPositions,
              currentInterpretation: kpiCurrentInterpretation("criticalInventoryPositions", kpis.critical),
            }}
          />
          <DashboardKpiCard
            label="Overstocked"
            value={formatNumber(kpis.overstocked)}
            icon={TrendingDown}
            tone={overstockedTone}
            trend={{ label: overstockedTone === "warning" ? "Monitor" : "Healthy", tone: overstockedTone }}
            info={{
              label: "Overstocked",
              content: KPI_DEFINITIONS.overstockedInventoryPositions,
              currentInterpretation: kpiCurrentInterpretation("overstockedInventoryPositions", kpis.overstocked),
            }}
          />
          <DashboardKpiCard
            label="Inventory Value"
            value={formatCurrency(kpis.totalValue)}
            icon={PackagePlus}
            info={{
              label: "Inventory Value",
              content: KPI_DEFINITIONS.totalInventoryValue,
              currentInterpretation: kpiCurrentInterpretation("totalInventoryValue", kpis.totalValue),
            }}
          />
        </div>

        <div className="flex justify-end">
          <GenerateInsightsButton />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <StockStatusChart
              counts={{ CRITICAL: kpis.critical, LOW: kpis.low, HEALTHY: kpis.healthy, OVERSTOCKED: kpis.overstocked }}
            />
            <StockStatusFooter {...stockInsight} />
          </div>
          <div>
            <CategoryChart data={categoryBreakdown} />
            <CategoryChartFooter {...categoryInsight} />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              paramKey="warehouseId"
              label="Warehouse"
              allLabel="All Warehouses"
              options={warehouses.map((w) => ({
                value: w.id,
                label: w.name,
              }))}
            />
            <FilterSelect paramKey="category" label="Category" allLabel="All Categories" options={PRODUCT_CATEGORIES} />
            <FilterSelect paramKey="stockStatus" label="Status" allLabel="All Statuses" options={STOCK_STATUSES} />
          </div>
          <InventoryTable items={items} />
          <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} />
        </div>
      </div>
    </InventoryInsightsProvider>
  );
}
