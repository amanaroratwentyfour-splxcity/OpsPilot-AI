import { prisma } from "@/lib/db/prisma";
import { PurchaseOrderStatus } from "@/lib/generated/prisma";
import { computeSupplierMetrics } from "@/lib/domain/suppliers/supplierMetrics";
import { LOW_RELIABILITY_THRESHOLD } from "@/lib/domain/config";

/**
 * Suppliers list view: persisted Supplier.reliabilityScore only (the same
 * value recalculateSupplierReliability writes) — the full component
 * breakdown (onTimeDeliveryRate, leadTimeConsistency, priceStability) is
 * only computed on the detail page, since it needs per-supplier order
 * history that would be wasteful to fetch for all 20 suppliers at once.
 */
export async function getSuppliersList() {
  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true, reliabilityScore: true, contractedLeadTimeDays: true },
    orderBy: { name: "asc" },
  });

  const scored = suppliers.filter((s) => s.reliabilityScore !== null);
  const kpis = {
    totalSuppliers: suppliers.length,
    averageReliability:
      scored.length > 0
        ? scored.reduce((sum, s) => sum + (s.reliabilityScore as number), 0) / scored.length
        : null,
    belowThreshold: scored.filter((s) => (s.reliabilityScore as number) < LOW_RELIABILITY_THRESHOLD).length,
    notYetScored: suppliers.length - scored.length,
  };

  const distribution = suppliers.map((s) => ({ name: s.name, score: s.reliabilityScore }));

  return { suppliers, kpis, distribution };
}

/**
 * Supplier detail view: the full component breakdown, computed live via
 * computeSupplierMetrics — exactly the function
 * recalculateSupplierReliability (Supplier Engine) uses, with the same
 * input shaping, just not persisted here (read-only view, same pattern as
 * getCompanyAnalyticsSnapshot for the Analytics Engine).
 */
export async function getSupplierDetail(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      id: true,
      name: true,
      contactEmail: true,
      contactPhone: true,
      contractedLeadTimeDays: true,
      paymentTerms: true,
      reliabilityScore: true,
      purchaseOrders: {
        select: {
          id: true,
          status: true,
          orderDate: true,
          expectedDeliveryDate: true,
          actualDeliveryDate: true,
          warehouse: { select: { name: true } },
          items: { select: { productId: true, unitCost: true, quantity: true } },
        },
        orderBy: { orderDate: "desc" },
      },
    },
  });

  if (!supplier) return null;

  const now = new Date();
  const overduePurchaseOrderCount = supplier.purchaseOrders.filter(
    (order) => order.status === PurchaseOrderStatus.IN_TRANSIT && order.expectedDeliveryDate !== null && order.expectedDeliveryDate < now,
  ).length;

  // Reuses the existing Product.primarySupplier relation and Inventory.stockStatus
  // field (both already in the schema) to surface which of this supplier's
  // products are currently at risk — a plain count, no new calculation.
  const atRiskProductCount = await prisma.product.count({
    where: { primarySupplierId: supplierId, inventory: { some: { stockStatus: { in: ["CRITICAL", "LOW"] } } } },
  });

  const receivedOrders = supplier.purchaseOrders
    .filter(
      (order): order is typeof order & { expectedDeliveryDate: Date; actualDeliveryDate: Date } =>
        order.status === PurchaseOrderStatus.RECEIVED &&
        order.expectedDeliveryDate !== null &&
        order.actualDeliveryDate !== null,
    )
    .map((order) => ({
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      actualDeliveryDate: order.actualDeliveryDate,
    }));

  const unitCostsByProduct = new Map<string, number[]>();
  for (const order of supplier.purchaseOrders) {
    for (const item of order.items) {
      const existing = unitCostsByProduct.get(item.productId) ?? [];
      existing.push(item.unitCost);
      unitCostsByProduct.set(item.productId, existing);
    }
  }

  const metrics = computeSupplierMetrics(
    supplier.id,
    receivedOrders,
    supplier.contractedLeadTimeDays,
    unitCostsByProduct,
  );

  return {
    supplier: {
      id: supplier.id,
      name: supplier.name,
      contactEmail: supplier.contactEmail,
      contactPhone: supplier.contactPhone,
      contractedLeadTimeDays: supplier.contractedLeadTimeDays,
      paymentTerms: supplier.paymentTerms,
    },
    metrics,
    overduePurchaseOrderCount,
    atRiskProductCount,
    recentOrders: supplier.purchaseOrders.slice(0, 15).map((order) => ({
      id: order.id,
      status: order.status,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      actualDeliveryDate: order.actualDeliveryDate,
      warehouseName: order.warehouse.name,
      totalValue: order.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
    })),
  };
}
