import { Activity, TrendingUp, Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { WarehouseUtilizationChart } from "@/components/dashboard/warehouse-utilization-chart";
import { ParetoChart } from "@/components/analytics/pareto-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ABCClassBadge } from "@/components/badges";
import { Pagination } from "@/components/pagination";
import { getAnalyticsOverview } from "@/lib/presentation/analyticsData";
import { WAREHOUSE_UTILIZATION_THRESHOLDS } from "@/lib/domain/config";
import { formatScore, formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { toPositiveInt } from "@/lib/api/http";

const ABC_TABLE_PAGE_SIZE = 50;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const {
    operationsHealthScore,
    operationsHealthComponents,
    inventoryTurnover,
    warehouseUtilizations,
    abcRanking,
    classCounts,
  } = await getAnalyticsOverview();

  // abcRanking already holds every product (not just the chart's top 40) —
  // the table below paginates over the full list via the `page` search
  // param so every Class B/C product stays reachable, not just top 50.
  const abcPage = toPositiveInt(searchParams.page, 1);
  const abcTotalPages = Math.max(1, Math.ceil(abcRanking.length / ABC_TABLE_PAGE_SIZE));
  const abcPageClamped = Math.min(abcPage, abcTotalPages);
  const abcPageRows = abcRanking.slice(
    (abcPageClamped - 1) * ABC_TABLE_PAGE_SIZE,
    abcPageClamped * ABC_TABLE_PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="ABC classification, inventory turnover, and warehouse utilization, powered by the Analytics Engine."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Operations Health Score" value={formatScore(operationsHealthScore)} icon={Activity} />
        <KpiCard
          label="Inventory Turnover"
          value={inventoryTurnover !== null ? `${inventoryTurnover.toFixed(1)}x` : "—"}
          icon={TrendingUp}
        />
        <KpiCard
          label="Class A / B / C"
          value={`${classCounts.A} / ${classCounts.B} / ${classCounts.C}`}
          icon={Layers}
        />
        <KpiCard label="Forecast Accuracy" value={formatPercent(operationsHealthComponents.avgForecastAccuracy)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WarehouseUtilizationChart
          data={warehouseUtilizations}
          warningThreshold={WAREHOUSE_UTILIZATION_THRESHOLDS.warning}
          criticalThreshold={WAREHOUSE_UTILIZATION_THRESHOLDS.critical}
        />
        <ParetoChart data={abcRanking} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Usage Value</TableHead>
                <TableHead className="text-right">Cumulative %</TableHead>
                <TableHead>Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abcPageRows.map((row, index) => (
                <TableRow key={row.productId}>
                  <TableCell className="text-muted-foreground">
                    {(abcPageClamped - 1) * ABC_TABLE_PAGE_SIZE + index + 1}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.category.replace("_", " ")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.usageValue)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.cumulativeValuePercent, 1)}%</TableCell>
                  <TableCell>
                    <ABCClassBadge abcClass={row.abcClass} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={abcPageClamped}
            totalPages={abcTotalPages}
            totalItems={abcRanking.length}
            pageSize={ABC_TABLE_PAGE_SIZE}
          />
        </CardContent>
      </Card>
    </div>
  );
}
