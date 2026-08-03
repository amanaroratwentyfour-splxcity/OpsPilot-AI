/**
 * Current inventory value for one Inventory row: `onHandQty x unitCost`.
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.6. This is the per-row building block
 * for Inventory Turnover's `AverageInventoryValue` term — kept as its own
 * pure function, mirroring computeUsageValue (ABC Analysis), so both
 * "value" concepts (current stock value vs. annual usage value) stay
 * independently testable and neither formula gets duplicated inline
 * wherever it's needed.
 *
 * @param onHandQty - Inventory.onHandQty
 * @param unitCost - Product.unitCost
 * @returns the inventory value, or `null` if either input is negative or non-finite
 */
export function computeInventoryValue(onHandQty: number, unitCost: number): number | null {
  if (!Number.isFinite(onHandQty) || !Number.isFinite(unitCost) || onHandQty < 0 || unitCost < 0) {
    return null;
  }

  return onHandQty * unitCost;
}
