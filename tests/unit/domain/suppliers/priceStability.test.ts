import { describe, expect, it } from "vitest";
import { computePriceStability } from "@/lib/domain/suppliers/priceStability";

describe("computePriceStability", () => {
  it("scores 100 for a product with perfectly stable pricing", () => {
    const score = computePriceStability(new Map([["product-1", [100, 100, 100]]]));
    expect(score).toBe(100);
  });

  it("penalizes price variability proportionally to the coefficient of variation", () => {
    // mean=100, stdDev=10 -> CV=0.1 -> score=90
    const score = computePriceStability(new Map([["product-1", [90, 110]]]));
    expect(score).toBeCloseTo(90, 10);
  });

  it("excludes a product with only 1 price observation rather than treating it as perfectly stable", () => {
    const withThinData = computePriceStability(
      new Map([
        ["product-thin", [100]], // excluded: can't compute variance from 1 point
        ["product-full", [90, 110]], // included: CV=0.1 -> contributes score 90
      ]),
    );
    const withoutThinData = computePriceStability(new Map([["product-full", [90, 110]]]));

    expect(withThinData).toBeCloseTo(withoutThinData!, 10);
    expect(withThinData).toBeCloseTo(90, 10);
  });

  it("averages coefficients of variation across multiple products", () => {
    // product-1: CV=0.1 (score contribution 0.1), product-2: CV=0.2 -> avg CV=0.15 -> score=85
    const score = computePriceStability(
      new Map([
        ["product-1", [90, 110]], // mean 100, stdDev 10, CV 0.1
        ["product-2", [80, 120]], // mean 100, stdDev 20, CV 0.2
      ]),
    );
    expect(score).toBeCloseTo(85, 10);
  });

  it("returns null when no product has enough price history to assess", () => {
    expect(computePriceStability(new Map())).toBeNull();
    expect(computePriceStability(new Map([["product-1", [100]]]))).toBeNull();
  });
});
