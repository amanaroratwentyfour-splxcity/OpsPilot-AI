import { describe, expect, it } from "vitest";
import { computeSupplierMetrics } from "@/lib/domain/suppliers/supplierMetrics";
import { computeOnTimeDeliveryRate } from "@/lib/domain/suppliers/onTimeDeliveryRate";
import { computeLeadTimeConsistency } from "@/lib/domain/suppliers/leadTimeConsistency";
import { computePriceStability } from "@/lib/domain/suppliers/priceStability";
import { computeSupplierReliabilityScore } from "@/lib/domain/suppliers/reliabilityScore";

const CONTRACTED_LEAD_TIME_DAYS = 7;

function buildOrders(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    orderDate: new Date(2026, 0, 1 + i * 30),
    expectedDeliveryDate: new Date(2026, 0, 8 + i * 30),
    actualDeliveryDate: new Date(2026, 0, 8 + i * 30), // exactly on time
  }));
}

describe("computeSupplierMetrics", () => {
  it("composes all three components identically to calling the functions directly", () => {
    const receivedOrders = buildOrders(5);
    const unitCostsByProduct = new Map([["product-1", [90, 110]]]);

    const metrics = computeSupplierMetrics(
      "supplier-1",
      receivedOrders,
      CONTRACTED_LEAD_TIME_DAYS,
      unitCostsByProduct,
    );

    const expectedOnTime = computeOnTimeDeliveryRate(receivedOrders);
    const expectedConsistency = computeLeadTimeConsistency(
      receivedOrders,
      CONTRACTED_LEAD_TIME_DAYS,
    );
    const expectedStability = computePriceStability(unitCostsByProduct);
    const expectedScore = computeSupplierReliabilityScore(
      expectedOnTime!,
      expectedConsistency!,
      expectedStability!,
    );

    expect(metrics.onTimeDeliveryRate).toBe(expectedOnTime);
    expect(metrics.leadTimeConsistency).toBe(expectedConsistency);
    expect(metrics.priceStability).toBe(expectedStability);
    expect(metrics.reliabilityScore).toBeCloseTo(expectedScore, 10);
    expect(metrics.sampleSize).toBe(5);
    expect(metrics.supplierId).toBe("supplier-1");
  });

  it("returns all-null fields when the sample size is below the minimum (3 orders)", () => {
    const metrics = computeSupplierMetrics(
      "supplier-new",
      buildOrders(2),
      CONTRACTED_LEAD_TIME_DAYS,
      new Map([["product-1", [90, 110]]]),
    );

    expect(metrics.sampleSize).toBe(2);
    expect(metrics.onTimeDeliveryRate).toBeNull();
    expect(metrics.leadTimeConsistency).toBeNull();
    expect(metrics.priceStability).toBeNull();
    expect(metrics.reliabilityScore).toBeNull();
  });

  it("returns a null reliabilityScore when price stability is unavailable, even with enough orders", () => {
    const metrics = computeSupplierMetrics(
      "supplier-1",
      buildOrders(5),
      CONTRACTED_LEAD_TIME_DAYS,
      new Map(), // no price history at all
    );

    expect(metrics.onTimeDeliveryRate).not.toBeNull();
    expect(metrics.leadTimeConsistency).not.toBeNull();
    expect(metrics.priceStability).toBeNull();
    // The whole score is null, not silently re-weighted to 2 components --
    // see supplierMetrics.ts's documented rationale.
    expect(metrics.reliabilityScore).toBeNull();
  });

  it("handles exactly the minimum sample size (3 orders)", () => {
    const metrics = computeSupplierMetrics(
      "supplier-1",
      buildOrders(3),
      CONTRACTED_LEAD_TIME_DAYS,
      new Map([["product-1", [100, 100]]]),
    );

    expect(metrics.reliabilityScore).not.toBeNull();
  });
});
