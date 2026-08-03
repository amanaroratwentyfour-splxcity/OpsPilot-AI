"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PurchaseOrderStatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { FileText } from "lucide-react";
import type { getProcurementOverview } from "@/lib/presentation/procurementData";

type PurchaseOrder = Awaited<ReturnType<typeof getProcurementOverview>>["purchaseOrders"][number];

export function PurchaseOrderTable({ purchaseOrders }: { purchaseOrders: PurchaseOrder[] }) {
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);

  if (purchaseOrders.length === 0) {
    return <EmptyState icon={FileText} title="No purchase orders match these filters" />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supplier</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Expected Delivery</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseOrders.map((po) => (
            <TableRow
              key={po.id}
              className="cursor-pointer"
              onClick={() => setSelected(po)}
            >
              <TableCell className="font-medium">{po.supplierName}</TableCell>
              <TableCell className="text-muted-foreground">
                {po.warehouseName.replace("NovaFoods ", "").replace(" Distribution Center", "")}
              </TableCell>
              <TableCell>
                <PurchaseOrderStatusBadge status={po.status} />
              </TableCell>
              <TableCell>{formatDate(po.orderDate)}</TableCell>
              <TableCell>{formatDate(po.expectedDeliveryDate)}</TableCell>
              <TableCell className="text-right">{po.itemCount}</TableCell>
              <TableCell className="text-right">{formatCurrency(po.totalValue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Purchase Order — {selected.supplierName}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <PurchaseOrderStatusBadge status={selected.status} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Warehouse</p>
                    <p>{selected.warehouseName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Order Date</p>
                    <p>{formatDate(selected.orderDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Delivery</p>
                    <p>{formatDate(selected.expectedDeliveryDate)}</p>
                  </div>
                  {selected.actualDeliveryDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Actual Delivery</p>
                      <p>{formatDate(selected.actualDeliveryDate)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Line Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <p className="font-mono text-xs">{item.sku}</p>
                            <p className="text-xs text-muted-foreground">{item.name}</p>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between border-t pt-3 font-medium">
                  <span>Total Value</span>
                  <span>{formatCurrency(selected.totalValue)}</span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
