import Link from "next/link";
import { Truck, AlertTriangle, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { ReliabilityChart } from "@/components/suppliers/reliability-chart";
import { ReliabilityChartFooter } from "@/components/suppliers/reliability-chart-footer";
import { ReliabilityScoreInfoPopover } from "@/components/suppliers/reliability-score-info-popover";
import { SuppliersInsightsProvider } from "@/components/suppliers/suppliers-insights-context";
import { GenerateInsightsButton } from "@/components/suppliers/generate-insights-button";
import { RecommendationWhyPopover } from "@/components/intelligence/recommendation-why-popover";
import { explainRecommendation } from "@/lib/presentation/recommendationExplain";
import { ScoreBadge } from "@/components/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { getSuppliersList } from "@/lib/presentation/suppliersData";
import { buildSupplierReliabilityInsight } from "@/lib/presentation/supplierInsights";
import { LOW_RELIABILITY_THRESHOLD } from "@/lib/domain/config";
import { formatNumber } from "@/lib/format";

export default async function SuppliersPage() {
  const { suppliers, kpis, distribution } = await getSuppliersList();

  const supplierInsight = buildSupplierReliabilityInsight(kpis, distribution);
  const flaggedSuppliers = suppliers
    .filter((s): s is typeof s & { reliabilityScore: number } => s.reliabilityScore !== null && s.reliabilityScore < LOW_RELIABILITY_THRESHOLD)
    .map((s) => ({ name: s.name, score: s.reliabilityScore }));
  const aiRequestPayload = {
    totalSuppliers: kpis.totalSuppliers,
    averageReliability: kpis.averageReliability,
    belowThreshold: kpis.belowThreshold,
    flaggedSuppliers,
  };

  return (
    <SuppliersInsightsProvider requestPayload={aiRequestPayload}>
      <div className="space-y-6">
        <PageHeader
          title="Suppliers"
          description="Reliability scores and delivery performance, powered by the Supplier Engine."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Suppliers" value={formatNumber(kpis.totalSuppliers)} icon={Truck} />
          <KpiCard
            label="Avg Reliability"
            value={kpis.averageReliability !== null ? formatNumber(kpis.averageReliability) : "—"}
          />
          <KpiCard
            label="Below Threshold"
            value={formatNumber(kpis.belowThreshold)}
            icon={AlertTriangle}
            tone={kpis.belowThreshold > 0 ? "warning" : "neutral"}
          />
          <KpiCard label="Not Yet Scored" value={formatNumber(kpis.notYetScored)} icon={HelpCircle} />
        </div>

        <div className="flex justify-end">
          <GenerateInsightsButton />
        </div>

        <div>
          <ReliabilityChart data={distribution} />
          <ReliabilityChartFooter summary={supplierInsight.summary} insight={supplierInsight.insight} />
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Contracted Lead Time</TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      Reliability Score
                      <ReliabilityScoreInfoPopover />
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/suppliers/${s.id}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{s.contractedLeadTimeDays} days</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s.reliabilityScore !== null && s.reliabilityScore < LOW_RELIABILITY_THRESHOLD && (
                          <RecommendationWhyPopover explanation={explainRecommendation("SUPPLIER", "WARNING", "supplier")} />
                        )}
                        <ScoreBadge score={s.reliabilityScore} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SuppliersInsightsProvider>
  );
}
