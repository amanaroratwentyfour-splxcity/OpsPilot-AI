import { WAREHOUSE_UTILIZATION_IDEAL_BAND } from "../config";

/**
 * Normalizes a raw Warehouse Utilization percentage into a 0-100 "health"
 * score, for Operations Health Score (§4.10) — like Inventory Health Score
 * (Milestone 2.2), this is a designed composite, not a textbook OM formula,
 * and penalizes both directions: under-utilization wastes fixed storage
 * cost, over-utilization leaves no room for incoming stock.
 *
 * Peaks at 100 across the "ideal" band (WAREHOUSE_UTILIZATION_IDEAL_BAND,
 * default 65-85%), declines below it (floored at 40 — an empty warehouse is
 * an operational oddity worth flagging, but not treated as catastrophically
 * as a stockout) and above it (floored at 20, mirroring Inventory Health
 * Score's overstock floor — excess capacity pressure is still better than
 * literally having nowhere to put incoming stock).
 *
 * See OPERATIONS_ENGINE_SPEC.md §4.10.
 *
 * @param utilizationPercent - computeWarehouseUtilization's output
 * @returns a score in [20, 100], or `null` if the input is negative or non-finite
 */
export function computeWarehouseUtilizationHealth(
  utilizationPercent: number,
  idealBand: { min: number; max: number } = WAREHOUSE_UTILIZATION_IDEAL_BAND,
): number | null {
  if (!Number.isFinite(utilizationPercent) || utilizationPercent < 0) {
    return null;
  }

  const { min, max } = idealBand;

  if (utilizationPercent < min) {
    return 40 + (utilizationPercent / min) * 60;
  }
  if (utilizationPercent <= max) {
    return 100;
  }
  // 10-point declining band above the ideal max (e.g. 85-95 for the
  // default band), then a floor of 20 beyond that -- deliberately the same
  // numeric shape as Inventory Health Score's own declining/floor bands
  // (Milestone 2.2), not algebraically derived from any other constant.
  if (utilizationPercent <= max + 10) {
    return 100 - ((utilizationPercent - max) / 10) * 30;
  }

  return Math.max(20, 70 - (utilizationPercent - (max + 10)) * 5);
}
