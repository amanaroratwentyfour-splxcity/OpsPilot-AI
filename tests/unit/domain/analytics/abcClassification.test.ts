import { describe, expect, it } from "vitest";
import { classifyABC } from "@/lib/domain/analytics/abcClassification";
import { ABCClass } from "@/lib/generated/prisma/enums";

describe("classifyABC", () => {
  it("classifies a reference catalog against the 80/95 cumulative-value cutoffs", () => {
    // Total = 1000. Cumulative: P1=80% (A boundary), P2=90%, P3=95% (B
    // boundary), P4=98%, P5=100%.
    const results = classifyABC([
      { productId: "p1", sku: "P1", usageValue: 800 },
      { productId: "p2", sku: "P2", usageValue: 100 },
      { productId: "p3", sku: "P3", usageValue: 50 },
      { productId: "p4", sku: "P4", usageValue: 30 },
      { productId: "p5", sku: "P5", usageValue: 20 },
    ]);

    const byId = new Map(results!.map((r) => [r.productId, r]));

    expect(byId.get("p1")!.abcClass).toBe(ABCClass.A);
    expect(byId.get("p1")!.cumulativeValuePercent).toBeCloseTo(80, 10);

    expect(byId.get("p2")!.abcClass).toBe(ABCClass.B);
    expect(byId.get("p2")!.cumulativeValuePercent).toBeCloseTo(90, 10);

    expect(byId.get("p3")!.abcClass).toBe(ABCClass.B);
    expect(byId.get("p3")!.cumulativeValuePercent).toBeCloseTo(95, 10);

    expect(byId.get("p4")!.abcClass).toBe(ABCClass.C);
    expect(byId.get("p5")!.abcClass).toBe(ABCClass.C);
  });

  it("is order-independent despite tied usage values (deterministic tie-break by sku)", () => {
    const productA = { productId: "a", sku: "A-SKU", usageValue: 100 };
    const productB = { productId: "b", sku: "B-SKU", usageValue: 100 };
    const productC = { productId: "c", sku: "C-SKU", usageValue: 1000 };

    const resultsOrder1 = classifyABC([productB, productA, productC]);
    const resultsOrder2 = classifyABC([productC, productA, productB]);

    const byIdOrder1 = new Map(resultsOrder1!.map((r) => [r.productId, r]));
    const byIdOrder2 = new Map(resultsOrder2!.map((r) => [r.productId, r]));

    for (const id of ["a", "b", "c"]) {
      expect(byIdOrder1.get(id)!.abcClass).toBe(byIdOrder2.get(id)!.abcClass);
      expect(byIdOrder1.get(id)!.cumulativeValuePercent).toBeCloseTo(
        byIdOrder2.get(id)!.cumulativeValuePercent,
        10,
      );
    }

    // A-SKU sorts before B-SKU at the same value, so it accumulates first
    // and therefore has a lower cumulative percentage.
    expect(byIdOrder1.get("a")!.cumulativeValuePercent).toBeLessThan(
      byIdOrder1.get("b")!.cumulativeValuePercent,
    );
  });

  it("classifies a new product with zero demand history as Class C by construction", () => {
    const results = classifyABC([
      { productId: "established", sku: "EST", usageValue: 1000 },
      { productId: "new-product", sku: "NEW", usageValue: 0 },
    ]);

    const byId = new Map(results!.map((r) => [r.productId, r]));
    expect(byId.get("new-product")!.abcClass).toBe(ABCClass.C);
  });

  it("classifies a single-product catalog as Class C (100% cumulative exceeds both cutoffs)", () => {
    // Not a bug: ABC analysis is a relative ranking across a multi-item
    // catalog. A "catalog" of exactly one product is 100% of total usage
    // value by definition, which is past both the 80% and 95% cutoffs --
    // documented here so this reads as an intentional consequence of the
    // formula, not a surprise.
    const results = classifyABC([{ productId: "only", sku: "ONLY", usageValue: 500 }]);
    expect(results![0].abcClass).toBe(ABCClass.C);
  });

  it("returns null for an empty catalog", () => {
    expect(classifyABC([])).toBeNull();
  });

  it("returns null rather than assigning arbitrary classes when total usage value is zero", () => {
    const results = classifyABC([
      { productId: "a", sku: "A", usageValue: 0 },
      { productId: "b", sku: "B", usageValue: 0 },
    ]);
    expect(results).toBeNull();
  });

  it("supports custom cutoffs", () => {
    // Total = 1000. Cumulative: p1=50%, p2=85%, p3=100%. With A=50%/B=90%:
    // p1 <= 50 -> A, p2 <= 90 -> B, p3 > 90 -> C.
    const results = classifyABC(
      [
        { productId: "p1", sku: "P1", usageValue: 500 },
        { productId: "p2", sku: "P2", usageValue: 350 },
        { productId: "p3", sku: "P3", usageValue: 150 },
      ],
      { A: 0.5, B: 0.9 },
    );

    const byId = new Map(results!.map((r) => [r.productId, r]));
    expect(byId.get("p1")!.abcClass).toBe(ABCClass.A);
    expect(byId.get("p2")!.abcClass).toBe(ABCClass.B);
    expect(byId.get("p3")!.abcClass).toBe(ABCClass.C);
  });
});
