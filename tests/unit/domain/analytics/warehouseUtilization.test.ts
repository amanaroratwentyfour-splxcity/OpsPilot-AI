import { describe, expect, it } from "vitest";
import { computeWarehouseUtilization } from "@/lib/domain/analytics/warehouseUtilization";

describe("computeWarehouseUtilization", () => {
  it("computes (totalOnHand / capacityUnits) x 100", () => {
    expect(computeWarehouseUtilization(850, 1000)).toBe(85);
  });

  it("returns 0 for an empty warehouse", () => {
    expect(computeWarehouseUtilization(0, 1000)).toBe(0);
  });

  it("can exceed 100 for an over-capacity warehouse (valid data, not an error)", () => {
    expect(computeWarehouseUtilization(1200, 1000)).toBe(120);
  });

  it("returns null for non-positive capacity", () => {
    expect(computeWarehouseUtilization(500, 0)).toBeNull();
    expect(computeWarehouseUtilization(500, -100)).toBeNull();
  });

  it("returns null for negative on-hand stock", () => {
    expect(computeWarehouseUtilization(-1, 1000)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeWarehouseUtilization(NaN, 1000)).toBeNull();
    expect(computeWarehouseUtilization(500, Infinity)).toBeNull();
  });
});
