import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { CreatePODialog } from "./create-po-dialog";
import { RecommendationWhyPopover } from "@/components/intelligence/recommendation-why-popover";
import { explainEOQRecommendation } from "@/lib/presentation/procurementInsights";
import { formatNumber } from "@/lib/format";
import { PackageCheck } from "lucide-react";
import type { getProcurementOverview } from "@/lib/presentation/procurementData";

type EOQItem = Awaited<ReturnType<typeof getProcurementOverview>>["eoqRecommendations"][number];

export function EOQTable({
  items,
  suppliers,
  warehouses,
}: {
  items: EOQItem[];
  suppliers: { id: string; name: string }[];
  warehouses: { id: string; name: string }[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={PackageCheck}
        title="No products currently need reordering"
        description="EOQ suggestions appear here for products with a critical or low stock position."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="text-right">Current On Hand</TableHead>
          <TableHead className="text-right">Annual Demand</TableHead>
          <TableHead className="text-right">Suggested Order Qty (EOQ)</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.productId}>
            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
            <TableCell>
              <Link href={`/inventory/${item.productId}`} className="font-medium hover:underline">
                {item.name}
              </Link>
            </TableCell>
            <TableCell className="text-right">{formatNumber(item.currentOnHand)}</TableCell>
            <TableCell className="text-right">{formatNumber(item.annualDemand)}</TableCell>
            <TableCell className="text-right font-semibold">{formatNumber(item.eoq)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <RecommendationWhyPopover
                  explanation={explainEOQRecommendation({
                    stockStatus: item.flaggedStockStatus,
                    currentOnHand: item.currentOnHand,
                    reorderPoint: item.flaggedReorderPoint,
                    safetyStock: item.flaggedSafetyStock,
                    annualDemand: item.annualDemand,
                    eoq: item.eoq,
                    warehouseName: item.flaggedWarehouseName,
                  })}
                />
                <CreatePODialog item={item} suppliers={suppliers} warehouses={warehouses} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
