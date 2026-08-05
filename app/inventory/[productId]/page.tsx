import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Tag, TrendingUp, Activity, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StockStatusBadge, ScoreBadge, ABCClassBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { ChartIntelligenceFooter } from "@/components/intelligence/chart-intelligence-footer";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { HealthScoreInfoPopover } from "@/components/inventory/health-score-info-popover";
import { DemandHistoryChart } from "@/components/inventory/demand-history-chart";
import { getInventoryDetail } from "@/lib/presentation/inventoryData";
import { buildDemandHistoryInsight } from "@/lib/presentation/inventoryInsights";
import { explainRecommendation } from "@/lib/presentation/recommendationExplain";
import { formatNumber, formatCurrency } from "@/lib/format";

const STATUS_PRIORITY: Record<string, number> = { CRITICAL: 0, LOW: 1, OVERSTOCKED: 2, HEALTHY: 3 };

export default async function InventoryDetailPage({ params }: { params: { productId: string } }) {
  const detail = await getInventoryDetail(params.productId);
  if (!detail) notFound();

  const { product, warehousePositions, demandStatistics, demandHistory, activeRecommendations } = detail;

  const worstStatus = warehousePositions.reduce<string | null>((worst, p) => {
    if (!p.stockStatus) return worst;
    if (!worst || STATUS_PRIORITY[p.stockStatus] < STATUS_PRIORITY[worst]) return p.stockStatus;
    return worst;
  }, null);

  const demandInsight = buildDemandHistoryInsight(
    demandHistory.map((d) => d.quantitySold),
    demandStatistics,
  );

  const flaggedPositions = warehousePositions.filter(
    (p) => p.stockStatus === "CRITICAL" || p.stockStatus === "OVERSTOCKED",
  );

  return (
    <div className="space-y-6">
      <Link href="/inventory" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Inventory
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{product.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.sku} · {product.category.replace("_", " ")} · Lead time {product.leadTimeDays} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          {worstStatus && <StockStatusBadge status={worstStatus} />}
          <ABCClassBadge abcClass={product.abcClass} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-section-title">Inventory Summary</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardKpiCard
            label="Unit Cost / Price"
            value={`${formatCurrency(product.unitCost)} / ${formatCurrency(product.unitPrice)}`}
            icon={Tag}
          />
          <DashboardKpiCard
            label="Avg Daily Demand"
            value={demandStatistics ? `${formatNumber(demandStatistics.avgDailyDemand, 1)} units` : "—"}
            icon={TrendingUp}
          />
          <DashboardKpiCard
            label="Demand Variability"
            value={demandStatistics ? `±${formatNumber(demandStatistics.stdDevDaily, 1)} units` : "—"}
            subtitle="daily std. dev."
            icon={Activity}
          />
        </div>
      </div>

      <div>
        <div>
          <DemandHistoryChart data={demandHistory} />
          <ChartIntelligenceFooter summary={demandInsight.summary} insight={demandInsight.insight} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Status by Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Safety Stock</TableHead>
                <TableHead className="text-right">Reorder Point</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center justify-end gap-1">
                    Health
                    <HealthScoreInfoPopover />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehousePositions.map((w) => (
                <TableRow
                  key={w.warehouseId}
                  className={w.stockStatus === "CRITICAL" ? "border-l-2 border-l-critical" : undefined}
                >
                  <TableCell>{w.warehouseName}</TableCell>
                  <TableCell className="text-right">{formatNumber(w.onHandQty)}</TableCell>
                  <TableCell className="text-right">{formatNumber(w.safetyStock)}</TableCell>
                  <TableCell className="text-right">{formatNumber(w.reorderPoint)}</TableCell>
                  <TableCell>
                    <StockStatusBadge status={w.stockStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ScoreBadge score={w.healthScore} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk Explanation</CardTitle>
        </CardHeader>
        <CardContent>
          {flaggedPositions.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No risk factors right now"
              description="Every warehouse position for this product is within a healthy range."
            />
          ) : (
            <div className="space-y-4">
              {flaggedPositions.map((p) => {
                const explanation = explainRecommendation(
                  "INVENTORY",
                  p.stockStatus === "CRITICAL" ? "CRITICAL" : "WARNING",
                  "product",
                );
                return (
                  <div key={p.warehouseId} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{p.warehouseName}</p>
                      <StockStatusBadge status={p.stockStatus} />
                    </div>
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-label uppercase text-muted-foreground">Engine</dt>
                        <dd className="mt-0.5 text-foreground">{explanation.engine}</dd>
                      </div>
                      <div>
                        <dt className="text-label uppercase text-muted-foreground">Trigger condition</dt>
                        <dd className="mt-0.5 text-foreground">{explanation.triggerCondition}</dd>
                      </div>
                      <div>
                        <dt className="text-label uppercase text-muted-foreground">Expected impact</dt>
                        <dd className="mt-0.5 text-foreground">{explanation.expectedImpact}</dd>
                      </div>
                      <div>
                        <dt className="text-label uppercase text-muted-foreground">Confidence</dt>
                        <dd className="mt-0.5 text-foreground">{explanation.confidenceNote}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-ai" />
            AI Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeRecommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active recommendations for this product right now, nothing to explain.
            </p>
          ) : activeRecommendations.every((r) => !r.aiNarrative) ? (
            <p className="text-sm text-muted-foreground">
              No AI insight has been generated yet for this product. Visit{" "}
              <Link href="/copilot" className="text-primary hover:underline">
                Operations Copilot
              </Link>{" "}
              and click &quot;Generate AI Insights&quot; to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {activeRecommendations
                .filter((r) => r.aiNarrative)
                .map((r) => (
                  <div key={r.id} className="rounded-md border border-ai/20 bg-ai/[0.06] p-3 text-sm">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ai">
                      <Sparkles className="h-3 w-3" />
                      AI
                    </p>
                    {r.aiNarrative}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
