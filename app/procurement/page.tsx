import { ShoppingCart, AlertCircle, PackageSearch } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { FilterSelect } from "@/components/filter-select";
import { Pagination } from "@/components/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EOQTable } from "@/components/procurement/eoq-table";
import { PurchaseOrderTable } from "@/components/procurement/purchase-order-table";
import { getProcurementOverview } from "@/lib/presentation/procurementData";
import { PURCHASE_ORDER_STATUSES } from "@/lib/presentation/constants";
import { formatNumber } from "@/lib/format";
import { prisma } from "@/lib/db/prisma";
import { matchEnumValue, toPositiveInt } from "@/lib/api/http";
import { PurchaseOrderStatus } from "@/lib/generated/prisma/enums";

export default async function ProcurementPage({
  searchParams,
}: {
  searchParams: { status?: string; supplierId?: string; warehouseId?: string; page?: string };
}) {
  const [{ eoqRecommendations, purchaseOrders, totalPurchaseOrders, page, pageSize, totalPages, kpis }, suppliers] =
    await Promise.all([
      getProcurementOverview({
        status: matchEnumValue(searchParams.status, Object.values(PurchaseOrderStatus)),
        supplierId: searchParams.supplierId,
        warehouseId: searchParams.warehouseId,
        page: toPositiveInt(searchParams.page, 1),
      }),
      prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        description="Reorder suggestions and purchase order tracking, powered by the Procurement Engine."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Open Purchase Orders" value={formatNumber(kpis.openPurchaseOrders)} icon={ShoppingCart} />
        <KpiCard
          label="Overdue"
          value={formatNumber(kpis.overduePurchaseOrders)}
          icon={AlertCircle}
          tone={kpis.overduePurchaseOrders > 0 ? "warning" : "neutral"}
        />
        <KpiCard label="Products Flagged for Reorder" value={formatNumber(kpis.flaggedProducts)} icon={PackageSearch} />
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="eoq">EOQ Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect paramKey="status" label="Status" allLabel="All Statuses" options={PURCHASE_ORDER_STATUSES} />
            <FilterSelect
              paramKey="supplierId"
              label="Supplier"
              allLabel="All Suppliers"
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>
          <PurchaseOrderTable purchaseOrders={purchaseOrders} />
          <Pagination page={page} totalPages={totalPages} totalItems={totalPurchaseOrders} pageSize={pageSize} />
        </TabsContent>

        <TabsContent value="eoq" className="rounded-lg border bg-card p-4">
          <EOQTable items={eoqRecommendations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
