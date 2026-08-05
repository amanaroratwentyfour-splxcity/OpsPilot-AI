import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StockStatusBadge, ScoreBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { HealthScoreInfoPopover } from "./health-score-info-popover";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { PackageSearch } from "lucide-react";
import type { getInventoryList } from "@/lib/presentation/inventoryData";

type Item = Awaited<ReturnType<typeof getInventoryList>>["items"][number];

export function InventoryTable({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <EmptyState icon={PackageSearch} title="No inventory positions match these filters" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Warehouse</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">On Hand</TableHead>
          <TableHead className="text-right">Reorder Point</TableHead>
          <TableHead className="text-right">Safety Stock</TableHead>
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
        {items.map((item) => (
          <TableRow
            key={item.inventoryId}
            className={cn(item.stockStatus === "CRITICAL" && "border-l-2 border-l-critical")}
          >
            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
            <TableCell>
              <Link href={`/inventory/${item.productId}`} className="font-medium hover:underline">
                {item.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.warehouseName.replace("NovaFoods ", "").replace(" Distribution Center", "")}
            </TableCell>
            <TableCell className="text-muted-foreground">{item.category.replace("_", " ")}</TableCell>
            <TableCell className="text-right">{formatNumber(item.onHandQty)}</TableCell>
            <TableCell className="text-right">{formatNumber(item.reorderPoint)}</TableCell>
            <TableCell className="text-right">{formatNumber(item.safetyStock)}</TableCell>
            <TableCell>
              <StockStatusBadge status={item.stockStatus} />
            </TableCell>
            <TableCell className="text-right">
              <ScoreBadge score={item.healthScore} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
