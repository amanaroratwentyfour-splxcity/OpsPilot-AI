import { describe, expect, it } from "vitest";
import { computeDemandStatistics } from "@/lib/domain/inventory/demandStatistics";

describe("computeDemandStatistics", () => {
  it("computes average daily demand and standard deviation from weekly totals", () => {
    // Weekly totals of 560, 630, 700, 770, 840 -> daily equivalents 80, 90, 100, 110, 120.
    // Mean = 100. Variance (population) = ((-20)^2+(-10)^2+0^2+10^2+20^2)/5 = 1000/5 = 200.
    const stats = computeDemandStatistics([560, 630, 700, 770, 840]);

    expect(stats).not.toBeNull();
    expect(stats!.avgDailyDemand).toBeCloseTo(100, 10);
    expect(stats!.stdDevDaily).toBeCloseTo(Math.sqrt(200), 10);
  });

  it("returns a standard deviation of 0 for perfectly steady demand", () => {
    const stats = computeDemandStatistics([700, 700, 700, 700]);

    expect(stats).not.toBeNull();
    expect(stats!.avgDailyDemand).toBeCloseTo(100, 10);
    expect(stats!.stdDevDaily).toBe(0);
  });

  it("returns null for zero weeks of history", () => {
    expect(computeDemandStatistics([])).toBeNull();
  });

  it("returns null for a single week of history (std dev undefined)", () => {
    expect(computeDemandStatistics([700])).toBeNull();
  });

  it("is order-independent", () => {
    const a = computeDemandStatistics([560, 630, 700, 770, 840]);
    const b = computeDemandStatistics([840, 560, 770, 700, 630]);

    expect(a!.avgDailyDemand).toBeCloseTo(b!.avgDailyDemand, 10);
    expect(a!.stdDevDaily).toBeCloseTo(b!.stdDevDaily, 10);
  });
});
