import { describe, expect, it } from "vitest";
import { computeOnTimeDeliveryRate } from "@/lib/domain/suppliers/onTimeDeliveryRate";

describe("computeOnTimeDeliveryRate", () => {
  it("computes the percentage of orders delivered on or before their expected date", () => {
    const rate = computeOnTimeDeliveryRate([
      { expectedDeliveryDate: new Date("2026-01-10"), actualDeliveryDate: new Date("2026-01-09") }, // early
      { expectedDeliveryDate: new Date("2026-01-10"), actualDeliveryDate: new Date("2026-01-10") }, // exactly on time
      { expectedDeliveryDate: new Date("2026-01-10"), actualDeliveryDate: new Date("2026-01-08") }, // early
      { expectedDeliveryDate: new Date("2026-01-10"), actualDeliveryDate: new Date("2026-01-15") }, // late
    ]);

    expect(rate).toBe(75);
  });

  it("returns 100 when every order is on time", () => {
    const rate = computeOnTimeDeliveryRate([
      { expectedDeliveryDate: new Date("2026-01-10"), actualDeliveryDate: new Date("2026-01-10") },
      { expectedDeliveryDate: new Date("2026-01-20"), actualDeliveryDate: new Date("2026-01-18") },
    ]);

    expect(rate).toBe(100);
  });

  it("returns 0 when every order is late", () => {
    const rate = computeOnTimeDeliveryRate([
      { expectedDeliveryDate: new Date("2026-01-10"), actualDeliveryDate: new Date("2026-01-11") },
    ]);

    expect(rate).toBe(0);
  });

  it("returns null for no orders", () => {
    expect(computeOnTimeDeliveryRate([])).toBeNull();
  });
});
