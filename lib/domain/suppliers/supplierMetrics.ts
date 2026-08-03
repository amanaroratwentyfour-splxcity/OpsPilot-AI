import { MIN_ORDERS_FOR_RELIABILITY_SCORE } from "../config";
import { computeOnTimeDeliveryRate, type DeliveryRecord } from "./onTimeDeliveryRate";
import { computeLeadTimeConsistency, type LeadTimeRecord } from "./leadTimeConsistency";
import { computePriceStability } from "./priceStability";
import { computeSupplierReliabilityScore } from "./reliabilityScore";

/**
 * A single typed bundle of every Supplier Reliability metric computed for
 * one supplier — the component scores as well as the final blended score,
 * so callers (and, eventually, the Suppliers module UI) can show the
 * breakdown, not just the headline number, per the product's explainability
 * principle.
 */
export interface SupplierMetrics {
  supplierId: string;
  /** Number of RECEIVED orders the delivery-performance components were computed from. */
  sampleSize: number;
  onTimeDeliveryRate: number | null;
  leadTimeConsistency: number | null;
  priceStability: number | null;
  reliabilityScore: number | null;
}

/**
 * Composes the Supplier Reliability pure calculation functions —
 * computeOnTimeDeliveryRate, computeLeadTimeConsistency,
 * computePriceStability, computeSupplierReliabilityScore — into a single
 * typed result for one supplier. Contains no formulas of its own: every
 * number in the returned object is produced by one of those four
 * already-tested functions, called exactly once each.
 *
 * Pure — no Prisma/database access. This is the layer
 * recalculateSupplierReliability (recalculate.ts) delegates to, so the
 * database-touching orchestrator never re-implements or duplicates a
 * formula; it only fetches inputs, calls this function, and persists the
 * result.
 *
 * Enforces the minimum-sample-size business rule
 * (MIN_ORDERS_FOR_RELIABILITY_SCORE): below that many received orders, every
 * field is `null` — no component is computed from too few data points to be
 * meaningful, and no partial/lower-confidence score is silently produced.
 *
 * If any of the three components is unavailable for its own reason (e.g. no
 * product has 2+ price observations yet), `reliabilityScore` is `null`
 * rather than being computed from the remaining two — a deliberate choice
 * for predictability: the score is either "all three components, equally
 * weighted" or "not yet available," never a silently-reweighted partial
 * average that would be harder to explain.
 *
 * @param supplierId
 * @param receivedOrders - the supplier's RECEIVED purchase orders (dates only)
 * @param contractedLeadTimeDays - Supplier.contractedLeadTimeDays
 * @param unitCostsByProduct - the supplier's PurchaseOrderItem.unitCost
 *   history, grouped by productId (any order status — pricing is set at
 *   order time regardless of delivery outcome)
 */
export function computeSupplierMetrics(
  supplierId: string,
  receivedOrders: (DeliveryRecord & LeadTimeRecord)[],
  contractedLeadTimeDays: number,
  unitCostsByProduct: Map<string, number[]>,
): SupplierMetrics {
  const sampleSize = receivedOrders.length;

  if (sampleSize < MIN_ORDERS_FOR_RELIABILITY_SCORE) {
    return {
      supplierId,
      sampleSize,
      onTimeDeliveryRate: null,
      leadTimeConsistency: null,
      priceStability: null,
      reliabilityScore: null,
    };
  }

  const onTimeDeliveryRate = computeOnTimeDeliveryRate(receivedOrders);
  const leadTimeConsistency = computeLeadTimeConsistency(receivedOrders, contractedLeadTimeDays);
  const priceStability = computePriceStability(unitCostsByProduct);

  const reliabilityScore =
    onTimeDeliveryRate !== null && leadTimeConsistency !== null && priceStability !== null
      ? computeSupplierReliabilityScore(onTimeDeliveryRate, leadTimeConsistency, priceStability)
      : null;

  return {
    supplierId,
    sampleSize,
    onTimeDeliveryRate,
    leadTimeConsistency,
    priceStability,
    reliabilityScore,
  };
}
