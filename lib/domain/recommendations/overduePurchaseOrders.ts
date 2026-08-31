import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma";
import type { RecommendationCandidate } from "./recommendationCandidate";

export interface PurchaseOrderPositionInput {
  purchaseOrderId: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  /** PurchaseOrder.status — only IN_TRANSIT orders are considered; DRAFT/
   *  SUBMITTED/APPROVED have no delivery promise yet, and RECEIVED/CANCELLED
   *  are already resolved. */
  status: string;
  expectedDeliveryDate: Date | null;
}

/**
 * Flags in-transit purchase orders whose expected delivery date has already
 * passed. This is a direct condition on raw PurchaseOrder fields, not a
 * derived metric — no Operations Engine formula represents "is this order
 * overdue," so there is nothing to reuse or duplicate here; it is exactly
 * the kind of rule the Recommendation Rule Engine exists to add.
 *
 * One candidate per (supplierId, warehouseId) pair, not per order:
 * AIRecommendation has no purchaseOrderId column, so that pair is the
 * finest granularity a persisted recommendation can actually reference.
 * When a supplier has multiple overdue orders to the same warehouse, they
 * are consolidated into one candidate (worst delay + a count), rather than
 * emitted as indistinguishable duplicates that couldn't be told apart once
 * persisted — discovered via the Recommendation Persistence Orchestrator's
 * integration tests, where duplicate (category, supplierId, warehouseId)
 * keys broke the sync plan's idempotency (see CHANGELOG.md).
 *
 * Pure — no Prisma/database access. `now` is caller-supplied (defaulting to
 * the real current time) so this stays deterministic and testable.
 *
 * @param orders - in-transit purchase orders (or any set of orders; only
 *   IN_TRANSIT ones are ever flagged)
 * @param now - the reference "current time"; defaults to `new Date()`
 */
export function findOverduePurchaseOrders(
  orders: PurchaseOrderPositionInput[],
  now: Date = new Date(),
): RecommendationCandidate[] {
  const overdue = orders
    .filter((order) => order.status === "IN_TRANSIT")
    .filter((order) => order.expectedDeliveryDate !== null && order.expectedDeliveryDate < now)
    .map((order) => {
      const expectedDeliveryDate = order.expectedDeliveryDate as Date;
      const daysOverdue = Math.floor(
        (now.getTime() - expectedDeliveryDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { ...order, expectedDeliveryDate, daysOverdue };
    });

  const groups = new Map<string, typeof overdue>();
  for (const order of overdue) {
    const key = `${order.supplierId}:${order.warehouseId}`;
    const group = groups.get(key);
    if (group) {
      group.push(order);
    } else {
      groups.set(key, [order]);
    }
  }

  return Array.from(groups.values()).map((group) => {
    const worst = group.reduce((max, order) => (order.daysOverdue > max.daysOverdue ? order : max));

    return {
      category: RecommendationCategory.PROCUREMENT,
      severity:
        worst.daysOverdue >= 7 ? RecommendationSeverity.CRITICAL : RecommendationSeverity.WARNING,
      triggerCondition: "status === IN_TRANSIT AND expectedDeliveryDate < now (1 or more orders)",
      supportingMetrics: {
        overdueOrderCount: group.length,
        maxDaysOverdue: worst.daysOverdue,
        worstExpectedDeliveryDate: worst.expectedDeliveryDate.toISOString(),
      },
      justification:
        `${group.length} purchase order${group.length === 1 ? " is" : "s are"} overdue from ` +
        `${worst.supplierName} to ${worst.warehouseName}, worst delay ${worst.daysOverdue} day(s) ` +
        `(expected ${worst.expectedDeliveryDate.toISOString().slice(0, 10)}).`,
      productId: null,
      supplierId: worst.supplierId,
      warehouseId: worst.warehouseId,
    };
  });
}
