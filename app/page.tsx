import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { CompanyBrandHeader } from "@/components/dashboard/company-brand-header";
import { ExecutiveBrief } from "@/components/dashboard/executive-brief";
import { HealthScoreCard } from "@/components/dashboard/health-score-card";
import { PriorityActions } from "@/components/dashboard/priority-actions";
import { WarehouseUtilizationChart } from "@/components/dashboard/warehouse-utilization-chart";
import { StockStatusChart } from "@/components/dashboard/stock-status-chart";
import { WarehouseUtilizationFooter } from "@/components/dashboard/warehouse-utilization-footer";
import { StockStatusFooter } from "@/components/dashboard/stock-status-footer";
import { RecommendationWidget } from "@/components/dashboard/recommendation-widget";
import { DashboardInsightsProvider } from "@/components/dashboard/dashboard-insights-context";
import { GenerateInsightsButton } from "@/components/dashboard/generate-insights-button";
import { getDashboardSummary } from "@/lib/presentation/dashboardData";
import { WAREHOUSE_UTILIZATION_THRESHOLDS } from "@/lib/domain/config";
import { KPI_DEFINITIONS, kpiCurrentInterpretation } from "@/lib/presentation/kpiDefinitions";
import { listHealthScoreComponents } from "@/lib/presentation/healthScoreContributors";
import { buildWarehouseUtilizationInsight, buildStockStatusInsight } from "@/lib/presentation/chartInsights";
import { formatNumber, formatPercent } from "@/lib/format";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  const turnoverTone =
    summary.inventoryTurnover === null ? "neutral" : summary.inventoryTurnover >= 8 ? "good" : "warning";
  const reliabilityTone = summary.supplierReliability.belowThresholdCount > 0 ? "warning" : "good";
  const recommendationsTone = summary.recommendationCounts.CRITICAL > 0 ? "critical" : "neutral";

  const warehouseInsight = buildWarehouseUtilizationInsight(
    summary.warehouseUtilizations,
    WAREHOUSE_UTILIZATION_THRESHOLDS.warning,
    WAREHOUSE_UTILIZATION_THRESHOLDS.critical,
  );
  const stockInsight = buildStockStatusInsight(summary.stockStatusCounts);

  const aiRequestPayload = {
    operationsHealthScore: summary.operationsHealthScore,
    healthComponents: listHealthScoreComponents(summary.operationsHealthComponents).map((c) => ({
      label: c.label,
      value: c.value,
    })),
    warehouseUtilizations: summary.warehouseUtilizations.map((w) => ({
      name: w.warehouseName,
      utilizationPercent: w.utilizationPercent,
    })),
    stockStatusCounts: summary.stockStatusCounts,
  };

  return (
    <DashboardInsightsProvider requestPayload={aiRequestPayload}>
      <div className="space-y-6">
        <CompanyBrandHeader />

        <ExecutiveBrief sections={summary.brief} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HealthScoreCard score={summary.operationsHealthScore} components={summary.operationsHealthComponents} />
          <DashboardKpiCard
            label="Inventory Turnover"
            value={summary.inventoryTurnover !== null ? `${summary.inventoryTurnover.toFixed(1)}x` : "—"}
            subtitle="annualized"
            tone={turnoverTone}
            accentTint="blue"
            trend={{
              label: turnoverTone === "good" ? "Healthy" : turnoverTone === "warning" ? "Monitor" : "No data",
              tone: turnoverTone,
            }}
            info={{
              label: "Inventory Turnover",
              content: KPI_DEFINITIONS.inventoryTurnover,
              currentInterpretation: kpiCurrentInterpretation("inventoryTurnover", summary.inventoryTurnover),
            }}
          />
          <DashboardKpiCard
            label="Avg Supplier Reliability"
            value={formatNumber(summary.supplierReliability.average)}
            subtitle={`${summary.supplierReliability.belowThresholdCount} below threshold`}
            tone={reliabilityTone}
            accentTint="green"
            trend={{
              label: reliabilityTone === "good" ? "Healthy" : "Monitor",
              tone: reliabilityTone,
            }}
            info={{
              label: "Avg Supplier Reliability",
              content: KPI_DEFINITIONS.supplierReliability,
              currentInterpretation: kpiCurrentInterpretation(
                "supplierReliability",
                summary.supplierReliability.average,
              ),
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardKpiCard
            label="Active Recommendations"
            value={formatNumber(summary.recommendationCounts.total)}
            subtitle={`${summary.recommendationCounts.CRITICAL} critical, ${summary.recommendationCounts.WARNING} warning`}
            tone={recommendationsTone}
            accentTint="purple"
            trend={{
              label: recommendationsTone === "critical" ? "Critical" : "Healthy",
              tone: recommendationsTone,
            }}
            info={{
              label: "Active Recommendations",
              content: KPI_DEFINITIONS.activeRecommendations,
              currentInterpretation: kpiCurrentInterpretation(
                "activeRecommendations",
                summary.recommendationCounts.total,
              ),
            }}
          />
          <DashboardKpiCard
            label="Overdue Purchase Orders"
            value={formatNumber(summary.overduePurchaseOrderCount)}
            tone={summary.overduePurchaseOrderCount > 0 ? "warning" : "good"}
            accentTint="amber"
            trend={{
              label: summary.overduePurchaseOrderCount > 0 ? "Monitor" : "Healthy",
              tone: summary.overduePurchaseOrderCount > 0 ? "warning" : "good",
            }}
            info={{
              label: "Overdue Purchase Orders",
              content: KPI_DEFINITIONS.overduePurchaseOrders,
              currentInterpretation: kpiCurrentInterpretation(
                "overduePurchaseOrders",
                summary.overduePurchaseOrderCount,
              ),
            }}
          />
          <DashboardKpiCard
            label="Forecast Accuracy"
            value={formatPercent(summary.operationsHealthComponents.avgForecastAccuracy)}
            subtitle="100 − avg MAPE"
            accentTint="lavender"
            info={{
              label: "Forecast Accuracy",
              content: KPI_DEFINITIONS.forecastAccuracy,
              currentInterpretation: kpiCurrentInterpretation(
                "forecastAccuracy",
                summary.operationsHealthComponents.avgForecastAccuracy,
              ),
            }}
          />
        </div>

        <PriorityActions recommendations={summary.topRecommendations} />

        <div className="flex justify-end">
          <GenerateInsightsButton />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <WarehouseUtilizationChart
              data={summary.warehouseUtilizations}
              warningThreshold={WAREHOUSE_UTILIZATION_THRESHOLDS.warning}
              criticalThreshold={WAREHOUSE_UTILIZATION_THRESHOLDS.critical}
            />
            <WarehouseUtilizationFooter {...warehouseInsight} />
          </div>
          <div>
            <StockStatusChart counts={summary.stockStatusCounts} />
            <StockStatusFooter {...stockInsight} />
          </div>
        </div>

        <RecommendationWidget recommendations={summary.topRecommendations} />
      </div>
    </DashboardInsightsProvider>
  );
}
