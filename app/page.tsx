import { Activity, TrendingUp, Truck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { ExecutiveBrief } from "@/components/dashboard/executive-brief";
import { WarehouseUtilizationChart } from "@/components/dashboard/warehouse-utilization-chart";
import { StockStatusChart } from "@/components/dashboard/stock-status-chart";
import { RecommendationWidget } from "@/components/dashboard/recommendation-widget";
import { getDashboardSummary } from "@/lib/presentation/dashboardData";
import { WAREHOUSE_UTILIZATION_THRESHOLDS } from "@/lib/domain/config";
import { formatScore, formatNumber, formatPercent } from "@/lib/format";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  const healthTone =
    summary.operationsHealthScore === null
      ? "neutral"
      : summary.operationsHealthScore >= 80
        ? "good"
        : summary.operationsHealthScore >= 60
          ? "warning"
          : "critical";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description="Company-wide operations snapshot for NovaFoods Pvt. Ltd."
      />

      <ExecutiveBrief lines={summary.brief} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Operations Health Score"
          value={formatScore(summary.operationsHealthScore)}
          subtitle="out of 100"
          icon={Activity}
          tone={healthTone}
        />
        <KpiCard
          label="Inventory Turnover"
          value={summary.inventoryTurnover !== null ? `${summary.inventoryTurnover.toFixed(1)}x` : "—"}
          subtitle="annualized"
          icon={TrendingUp}
        />
        <KpiCard
          label="Avg Supplier Reliability"
          value={formatScore(summary.supplierReliability.average)}
          subtitle={`${summary.supplierReliability.belowThresholdCount} below threshold`}
          icon={Truck}
          tone={summary.supplierReliability.belowThresholdCount > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          label="Active Recommendations"
          value={formatNumber(summary.recommendationCounts.total)}
          subtitle={`${summary.recommendationCounts.CRITICAL} critical, ${summary.recommendationCounts.WARNING} warning`}
          icon={Sparkles}
          tone={summary.recommendationCounts.CRITICAL > 0 ? "critical" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WarehouseUtilizationChart
          data={summary.warehouseUtilizations}
          warningThreshold={WAREHOUSE_UTILIZATION_THRESHOLDS.warning}
          criticalThreshold={WAREHOUSE_UTILIZATION_THRESHOLDS.critical}
        />
        <StockStatusChart counts={summary.stockStatusCounts} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecommendationWidget recommendations={summary.topRecommendations} />
        </div>
        <div className="space-y-4">
          <KpiCard
            label="Overdue Purchase Orders"
            value={formatNumber(summary.overduePurchaseOrderCount)}
            tone={summary.overduePurchaseOrderCount > 0 ? "warning" : "neutral"}
          />
          <KpiCard
            label="Forecast Accuracy"
            value={formatPercent(summary.operationsHealthComponents.avgForecastAccuracy)}
            subtitle="100 − avg MAPE"
          />
        </div>
      </div>
    </div>
  );
}
