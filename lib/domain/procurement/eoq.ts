import { DEFAULT_HOLDING_COST_RATE, DEFAULT_ORDERING_COST } from "../config";

/**
 * Economic Order Quantity: the order quantity that minimizes total
 * inventory cost — the sum of ordering cost (more, smaller orders cost
 * more in administrative/logistics overhead) and holding cost (fewer,
 * larger orders cost more in storage/capital tied up).
 *
 * Formula: EOQ = sqrt((2 x D x S) / H)
 * where D = annual demand, S = cost to place one order, H = annual
 * holding cost per unit (unitCost x holdingCostRate).
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.4.
 *
 * Schema Gap: neither an ordering cost nor a holding-cost rate exists
 * anywhere in the schema (frozen as of Milestone 2.3's approval). Both
 * default to Configuration Constants (DEFAULT_ORDERING_COST,
 * DEFAULT_HOLDING_COST_RATE) rather than being read from any Product or
 * Supplier field.
 *
 * Classic EOQ assumptions apply: constant known demand rate, no quantity
 * discounts, no stockouts permitted mid-cycle, linear ordering/holding
 * costs. This is never persisted — it's always a live suggestion (e.g.
 * shown when a Procurement user opens a PO creation form), not a stored field.
 *
 * @param annualDemand - D, e.g. from computeAnnualDemand
 * @param unitCost - Product.unitCost
 * @param orderingCost - S; defaults to DEFAULT_ORDERING_COST. Negative is
 *   invalid; 0 is mathematically valid and degenerate (naturally yields an
 *   EOQ of 0, since a costless order can be placed as often as needed).
 * @param holdingCostRate - annual holding cost as a fraction of unitCost;
 *   defaults to DEFAULT_HOLDING_COST_RATE. A non-positive value here falls
 *   back to DEFAULT_HOLDING_COST_RATE rather than producing a divide-by-zero
 *   (OPERATIONS_ENGINE_SPEC.md §4.4, Edge Cases).
 * @returns suggested order quantity in units; `0` if annualDemand is 0
 *   (don't suggest ordering a product with no measured demand); `null` if
 *   any input is invalid (negative/non-finite demand or cost, or a
 *   unitCost of 0, which makes holding cost per unit undefined regardless
 *   of the rate).
 */
export function computeEOQ(
  annualDemand: number,
  unitCost: number,
  orderingCost: number = DEFAULT_ORDERING_COST,
  holdingCostRate: number = DEFAULT_HOLDING_COST_RATE,
): number | null {
  if (
    !Number.isFinite(annualDemand) ||
    !Number.isFinite(unitCost) ||
    !Number.isFinite(orderingCost) ||
    !Number.isFinite(holdingCostRate) ||
    annualDemand < 0 ||
    unitCost < 0 ||
    orderingCost < 0
  ) {
    return null;
  }

  if (annualDemand === 0) {
    return 0;
  }

  const effectiveHoldingCostRate =
    holdingCostRate > 0 ? holdingCostRate : DEFAULT_HOLDING_COST_RATE;
  const holdingCostPerUnit = unitCost * effectiveHoldingCostRate;

  if (holdingCostPerUnit <= 0) {
    // unitCost is 0 (or otherwise degenerate) -- genuinely can't compute,
    // even with a valid holding cost rate.
    return null;
  }

  return Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
}
