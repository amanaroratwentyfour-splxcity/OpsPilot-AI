import Link from "next/link";
import { Truck, AlertTriangle, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { ReliabilityChart } from "@/components/suppliers/reliability-chart";
import { ScoreBadge } from "@/components/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { getSuppliersList } from "@/lib/presentation/suppliersData";
import { formatNumber } from "@/lib/format";

export default async function SuppliersPage() {
  const { suppliers, kpis, distribution } = await getSuppliersList();

  return (
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

      <ReliabilityChart data={distribution} />

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Contracted Lead Time</TableHead>
                <TableHead className="text-right">Reliability Score</TableHead>
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
                    <ScoreBadge score={s.reliabilityScore} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
