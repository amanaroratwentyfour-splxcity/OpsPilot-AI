import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StockStatusBadge, ScoreBadge, ABCClassBadge } from "@/components/badges";
import { DemandHistoryChart } from "@/components/inventory/demand-history-chart";
import { getInventoryDetail } from "@/lib/presentation/inventoryData";
import { formatNumber, formatCurrency } from "@/lib/format";

export default async function InventoryDetailPage({ params }: { params: { productId: string } }) {
  const detail = await getInventoryDetail(params.productId);
  if (!detail) notFound();

  const { product, warehousePositions, demandStatistics, demandHistory } = detail;

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
        <ABCClassBadge abcClass={product.abcClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unit Cost / Price</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatCurrency(product.unitCost)} / {formatCurrency(product.unitPrice)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Daily Demand</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {demandStatistics ? formatNumber(demandStatistics.avgDailyDemand, 1) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Daily Demand Std. Dev.</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {demandStatistics ? formatNumber(demandStatistics.stdDevDaily, 1) : "—"}
          </CardContent>
        </Card>
      </div>

      <DemandHistoryChart data={demandHistory} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Position by Warehouse</CardTitle>
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
                <TableHead className="text-right">Health Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehousePositions.map((w) => (
                <TableRow key={w.warehouseId}>
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
    </div>
  );
}
