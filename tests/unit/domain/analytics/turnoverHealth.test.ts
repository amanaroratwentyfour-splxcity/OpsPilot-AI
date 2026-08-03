import { describe, expect, it } from "vitest";
import { computeTurnoverHealth } from "@/lib/domain/analytics/turnoverHealth";

describe("computeTurnoverHealth", () => {
  it("scores 100 at exactly the target rate", () => {
    expect(computeTurnoverHealth(8, 8)).toBe(100);
  });

  it("scores proportionally below the target", () => {
    expect(computeTurnoverHealth(4, 8)).toBe(50);
    expect(computeTurnoverHealth(2, 8)).toBe(25);
  });

  it("caps at 100 for turnover above the target (exceeding the target isn't penalized)", () => {
    expect(computeTurnoverHealth(16, 8)).toBe(100);
    expect(computeTurnoverHealth(100, 8)).toBe(100);
  });

  it("scores 0 for zero turnover", () => {
    expect(computeTurnoverHealth(0, 8)).toBe(0);
  });

  it("returns null for negative turnover", () => {
    expect(computeTurnoverHealth(-1, 8)).toBeNull();
  });

  it("returns null for a non-positive target", () => {
    expect(computeTurnoverHealth(4, 0)).toBeNull();
    expect(computeTurnoverHealth(4, -8)).toBeNull();
  });
});
