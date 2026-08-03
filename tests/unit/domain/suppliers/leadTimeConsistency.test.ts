import { describe, expect, it } from "vitest";
import { computeLeadTimeConsistency } from "@/lib/domain/suppliers/leadTimeConsistency";

describe("computeLeadTimeConsistency", () => {
  it("scores 100 when every order arrives exactly on the contracted lead time", () => {
    const orders = [
      { orderDate: new Date("2026-01-01"), actualDeliveryDate: new Date("2026-01-08") }, // 7 days
      { orderDate: new Date("2026-02-01"), actualDeliveryDate: new Date("2026-02-08") }, // 7 days
    ];

    expect(computeLeadTimeConsistency(orders, 7)).toBe(100);
  });

  it("penalizes a supplier that is reliably late by a fixed amount, not just an unpredictable one", () => {
    // Always exactly 2 days late (actual lead time = 9 vs. contracted 7).
    const reliablyLate = [
      { orderDate: new Date("2026-01-01"), actualDeliveryDate: new Date("2026-01-10") },
      { orderDate: new Date("2026-02-01"), actualDeliveryDate: new Date("2026-02-10") },
    ];
    // Alternates 2 days early / 2 days late (same magnitude of deviation
    // from the contracted lead time, opposite sign).
    const unpredictable = [
      { orderDate: new Date("2026-01-01"), actualDeliveryDate: new Date("2026-01-06") }, // 5 days
      { orderDate: new Date("2026-02-01"), actualDeliveryDate: new Date("2026-02-10") }, // 9 days
    ];

    const reliablyLateScore = computeLeadTimeConsistency(reliablyLate, 7);
    const unpredictableScore = computeLeadTimeConsistency(unpredictable, 7);

    // Both deviate from the promised lead time by the same RMS magnitude
    // (2 days), so both score identically below 100 -- being reliably late
    // is not "consistent" just because it's predictable.
    expect(reliablyLateScore).not.toBe(100);
    expect(reliablyLateScore).toBeCloseTo(unpredictableScore!, 10);
    expect(reliablyLateScore).toBeCloseTo(100 - (2 / 7) * 100, 10);
  });

  it("returns null for no orders", () => {
    expect(computeLeadTimeConsistency([], 7)).toBeNull();
  });

  it("returns null for a non-positive contracted lead time", () => {
    const orders = [
      { orderDate: new Date("2026-01-01"), actualDeliveryDate: new Date("2026-01-08") },
    ];
    expect(computeLeadTimeConsistency(orders, 0)).toBeNull();
    expect(computeLeadTimeConsistency(orders, -3)).toBeNull();
  });
});
