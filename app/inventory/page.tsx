import { Boxes, AlertTriangle, TrendingDown, PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { FilterSelect } from "@/components/filter-select";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { StockStatusChart } from "@/components/dashboard/stock-status-chart";
import { CategoryChart } from "@/components/inventory/category-chart";
import { Pagination } from "@/components/pagination";
import { getInventoryList } from "@/lib/presentation/inventoryData";
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
  const [{ items, kpis, categoryBreakdown, totalItems, page, pageSize, totalPages }, warehouses] = await Promise.all([
    getInventoryList({
      warehouseId: searchParams.warehouseId,
      category: matchEnumValue(searchParams.category, Object.values(ProductCategory)),
      stockStatus: matchEnumValue(searchParams.stockStatus, Object.values(StockStatus)),
      page: toPositiveInt(searchParams.page, 1),
    }),
    prisma.warehouse.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Intelligence"
        description="Stock positions, health scores, and reorder signals across every warehouse."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Positions" value={formatNumber(kpis.totalPositions)} icon={Boxes} />
        <KpiCard
          label="Critical"
          value={formatNumber(kpis.critical)}
          icon={AlertTriangle}
          tone={kpis.critical > 0 ? "critical" : "neutral"}
        />
        <KpiCard
          label="Overstocked"
          value={formatNumber(kpis.overstocked)}
          icon={TrendingDown}
          tone={kpis.overstocked > 0 ? "warning" : "neutral"}
        />
        <KpiCard label="Inventory Value" value={formatCurrency(kpis.totalValue)} icon={PackagePlus} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StockStatusChart
          counts={{ CRITICAL: kpis.critical, LOW: kpis.low, HEALTHY: kpis.healthy, OVERSTOCKED: kpis.overstocked }}
        />
        <CategoryChart data={categoryBreakdown} />
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            paramKey="warehouseId"
            label="Warehouse"
            allLabel="All Warehouses"
            options={warehouses.map((w) => ({
              value: w.id,
              label: w.name.replace("NovaFoods ", "").replace(" Distribution Center", ""),
            }))}
          />
          <FilterSelect paramKey="category" label="Category" allLabel="All Categories" options={PRODUCT_CATEGORIES} />
          <FilterSelect paramKey="stockStatus" label="Status" allLabel="All Statuses" options={STOCK_STATUSES} />
        </div>
        <InventoryTable items={items} />
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} />
      </div>
    </div>
  );
}
