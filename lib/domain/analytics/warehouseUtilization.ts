/**
 * Warehouse Utilization: how full a warehouse is relative to its capacity.
 *
 * Formula: Utilization% = (totalOnHand / capacityUnits) x 100
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.7.
 *
 * `capacityUnits` and `totalOnHand` are denominated in the same abstract
 * "stock unit," not a real volumetric measure — a documented, deliberate
 * schema simplification (DATA_DICTIONARY.md §10), not something this
 * function can or should correct for.
 *
 * @param totalOnHand - sum of Inventory.onHandQty across all products at
 *   this warehouse
 * @param capacityUnits - Warehouse.capacityUnits
 * @returns a percentage (can exceed 100 — an over-capacity warehouse is
 *   valid data, not an error), or `null` if capacityUnits is non-positive
 *   or either input is non-finite
 */
export function computeWarehouseUtilization(
  totalOnHand: number,
  capacityUnits: number,
): number | null {
  if (
    !Number.isFinite(totalOnHand) ||
    !Number.isFinite(capacityUnits) ||
    totalOnHand < 0 ||
    capacityUnits <= 0
  ) {
    return null;
  }

  return (totalOnHand / capacityUnits) * 100;
}
