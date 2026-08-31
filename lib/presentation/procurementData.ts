import { prisma } from "@/lib/db/prisma";
import { computeAnnualDemand } from "@/lib/domain/procurement/annualDemand";
import { computeEOQ } from "@/lib/domain/procurement/eoq";
import type { PurchaseOrderStatus } from "@/lib/generated/prisma";

export interface ProcurementFilters {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  warehouseId?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 25;

/**
 * Procurement page data: EOQ suggestions (computeAnnualDemand + computeEOQ,
 * both pure and never persisted — always a live suggestion, per
 * OPERATIONS_ENGINE_SPEC.md §4.4) for products that currently need
 * reordering (at least one CRITICAL/LOW position), plus the purchase order
 * list with line items included so the detail drawer needs no extra fetch.
 */
export async function getProcurementOverview(filters: ProcurementFilters = {}) {
  const flaggedProducts = await prisma.product.findMany({
    where: { inventory: { some: { stockStatus: { in: ["CRITICAL", "LOW"] } } } },
    select: {
      id: true,
      sku: true,
      name: true,
      unitCost: true,
      primarySupplier: { select: { id: true, name: true } },
      demandHistory: { orderBy: { periodDate: "asc" }, select: { quantitySold: true } },
      inventory: {
        select: {
          onHandQty: true,
          stockStatus: true,
          reorderPoint: true,
          safetyStock: true,
          warehouse: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { sku: "asc" },
  });

  const eoqRecommendations = flaggedProducts.map((product) => {
    const { annualDemand } = computeAnnualDemand(product.demandHistory.map((d) => d.quantitySold));
    const eoq = computeEOQ(annualDemand, product.unitCost);
    // The specific warehouse(s) actually driving the CRITICAL/LOW flag —
    // used to default "Create PO"'s warehouse picker to a relevant one
    // instead of an arbitrary first warehouse in the system, and to explain
    // the EOQ suggestion (explainEOQRecommendation) with real numbers.
    const flaggedPosition = product.inventory.find((inv) => inv.stockStatus === "CRITICAL" || inv.stockStatus === "LOW");
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unitCost: product.unitCost,
      annualDemand,
      eoq,
      currentOnHand: product.inventory.reduce((sum, inv) => sum + inv.onHandQty, 0),
      primarySupplierId: product.primarySupplier?.id ?? null,
      primarySupplierName: product.primarySupplier?.name ?? null,
      flaggedWarehouseId: flaggedPosition?.warehouse.id ?? null,
      flaggedWarehouseName: flaggedPosition?.warehouse.name ?? null,
      flaggedStockStatus: flaggedPosition?.stockStatus ?? null,
      flaggedReorderPoint: flaggedPosition?.reorderPoint ?? null,
      flaggedSafetyStock: flaggedPosition?.safetyStock ?? null,
    };
  });

  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);

  const poWhere = {
    status: filters.status,
    supplierId: filters.supplierId,
    warehouseId: filters.warehouseId,
  };

  const [totalPurchaseOrders, purchaseOrders, statusGroups, overdueCount, procurementRisks] = await Promise.all([
    prisma.purchaseOrder.count({ where: poWhere }),
    prisma.purchaseOrder.findMany({
      where: poWhere,
      select: {
        id: true,
        status: true,
        orderDate: true,
        expectedDeliveryDate: true,
        actualDeliveryDate: true,
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        items: {
          select: {
            quantity: true,
            unitCost: true,
            product: { select: { sku: true, name: true } },
          },
        },
      },
      orderBy: { orderDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.groupBy({ by: ["status"], _count: true }),
    prisma.purchaseOrder.count({
      where: { status: "IN_TRANSIT", expectedDeliveryDate: { lt: new Date() } },
    }),
    // Reuses the already-persisted Overdue Purchase Order recommendations
    // (lib/domain/recommendations/overduePurchaseOrders.ts) as the source
    // of "which suppliers/warehouses are at risk" for the AI insight input
    // and deterministic summary — no new risk-detection logic.
    prisma.aIRecommendation.findMany({
      where: { category: "PROCUREMENT", status: "ACTIVE" },
      select: {
        severity: true,
        metricJustification: true,
        supplier: { select: { name: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: [{ severity: "asc" }],
    }),
  ]);

  const riskRecommendations = procurementRisks.map((r) => ({
    severity: r.severity as string,
    justification: r.metricJustification,
    supplierName: r.supplier?.name ?? null,
    warehouseName: r.warehouse?.name ?? null,
  }));

  const purchaseOrderItems = purchaseOrders.map((po) => ({
    id: po.id,
    status: po.status,
    orderDate: po.orderDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    actualDeliveryDate: po.actualDeliveryDate,
    supplierId: po.supplier.id,
    supplierName: po.supplier.name,
    warehouseId: po.warehouse.id,
    warehouseName: po.warehouse.name,
    totalValue: po.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
    itemCount: po.items.length,
    items: po.items.map((item) => ({
      sku: item.product.sku,
      name: item.product.name,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })),
  }));

  const openCount = statusGroups
    .filter((g) => ["DRAFT", "SUBMITTED", "APPROVED", "IN_TRANSIT"].includes(g.status))
    .reduce((sum, g) => sum + g._count, 0);

  return {
    eoqRecommendations,
    purchaseOrders: purchaseOrderItems,
    totalPurchaseOrders,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalPurchaseOrders / pageSize)),
    kpis: {
      openPurchaseOrders: openCount,
      overduePurchaseOrders: overdueCount,
      flaggedProducts: eoqRecommendations.length,
    },
    riskRecommendations,
  };
}
