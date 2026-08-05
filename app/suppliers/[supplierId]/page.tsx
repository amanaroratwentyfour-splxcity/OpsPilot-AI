import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScoreBadge, PurchaseOrderStatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { ReliabilityScoreInfoPopover } from "@/components/suppliers/reliability-score-info-popover";
import { explainRecommendation } from "@/lib/presentation/recommendationExplain";
import { buildSupplierSummary } from "@/lib/presentation/supplierInsights";
import { LOW_RELIABILITY_THRESHOLD } from "@/lib/domain/config";
import { getSupplierDetail } from "@/lib/presentation/suppliersData";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export default async function SupplierDetailPage({ params }: { params: { supplierId: string } }) {
  const detail = await getSupplierDetail(params.supplierId);
  if (!detail) notFound();

  const { supplier, metrics, recentOrders, overduePurchaseOrderCount, atRiskProductCount } = detail;
  const summary = buildSupplierSummary(metrics, overduePurchaseOrderCount, atRiskProductCount);
  const isFlagged = metrics.reliabilityScore !== null && metrics.reliabilityScore < LOW_RELIABILITY_THRESHOLD;

  return (
    <div className="space-y-6">
      <Link href="/suppliers" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Suppliers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{supplier.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Contracted lead time {supplier.contractedLeadTimeDays} days
            {supplier.paymentTerms ? ` · ${supplier.paymentTerms}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ScoreBadge score={metrics.reliabilityScore} />
          <ReliabilityScoreInfoPopover />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reliability Score</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {metrics.reliabilityScore !== null ? metrics.reliabilityScore.toFixed(0) : "Not yet scored"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On-Time Delivery</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatPercent(metrics.onTimeDeliveryRate)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lead Time Consistency</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {metrics.leadTimeConsistency !== null ? metrics.leadTimeConsistency.toFixed(0) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Price Stability</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {metrics.priceStability !== null ? metrics.priceStability.toFixed(0) : "—"}
          </CardContent>
        </Card>
      </div>

      {metrics.reliabilityScore === null && (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          This supplier has fewer than the minimum number of received orders required for a reliability score
          ({metrics.sampleSize} received so far).
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supplier Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-label uppercase text-muted-foreground">Overall performance</dt>
              <dd className="mt-0.5 text-foreground">{summary.overallPerformance}</dd>
            </div>
            <div>
              <dt className="text-label uppercase text-muted-foreground">Reliability trend</dt>
              <dd className="mt-0.5 text-foreground">{summary.reliabilityTrend}</dd>
            </div>
            <div>
              <dt className="text-label uppercase text-muted-foreground">Procurement risk</dt>
              <dd className="mt-0.5 text-foreground">{summary.procurementRisk}</dd>
            </div>
            <div>
              <dt className="text-label uppercase text-muted-foreground">Operational impact</dt>
              <dd className="mt-0.5 text-foreground">{summary.operationalImpact}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-label uppercase text-muted-foreground">Suggested action</dt>
              <dd className="mt-0.5 text-foreground">{summary.suggestedAction}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk Explanation</CardTitle>
        </CardHeader>
        <CardContent>
          {!isFlagged ? (
            <EmptyState
              icon={ShieldCheck}
              title="No risk factors right now"
              description="This supplier's reliability score is at or above the trusted-supplier threshold."
            />
          ) : (
            (() => {
              const explanation = explainRecommendation("SUPPLIER", "WARNING", "supplier");
              return (
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
              );
            })()
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Actual Delivery</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.warehouseName}</TableCell>
                  <TableCell>
                    <PurchaseOrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{formatDate(order.orderDate)}</TableCell>
                  <TableCell>{formatDate(order.expectedDeliveryDate)}</TableCell>
                  <TableCell>{formatDate(order.actualDeliveryDate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(order.totalValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
