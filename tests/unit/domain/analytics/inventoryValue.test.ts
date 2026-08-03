import { describe, expect, it } from "vitest";
import { computeInventoryValue } from "@/lib/domain/analytics/inventoryValue";

describe("computeInventoryValue", () => {
  it("computes onHandQty x unitCost", () => {
    expect(computeInventoryValue(200, 15)).toBe(3000);
  });

  it("returns 0 for zero on-hand stock (not an error)", () => {
    expect(computeInventoryValue(0, 15)).toBe(0);
  });

  it("returns null for negative on-hand quantity", () => {
    expect(computeInventoryValue(-1, 15)).toBeNull();
  });

  it("returns null for negative unit cost", () => {
    expect(computeInventoryValue(200, -15)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeInventoryValue(NaN, 15)).toBeNull();
    expect(computeInventoryValue(200, Infinity)).toBeNull();
  });
});
