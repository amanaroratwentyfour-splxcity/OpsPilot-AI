import { describe, expect, it } from "vitest";
import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma";
import {
  computeRecommendationSyncPlan,
  recommendationIdentityKey,
  type ExistingRecommendationRow,
} from "@/lib/domain/recommendations/syncPlan";
import type { RecommendationCandidate } from "@/lib/domain/recommendations/recommendationCandidate";

function existingRow(overrides: Partial<ExistingRecommendationRow> = {}): ExistingRecommendationRow {
  return {
    id: "row-1",
    category: RecommendationCategory.INVENTORY,
    severity: RecommendationSeverity.CRITICAL,
    metricJustification: "Product A at Warehouse 1 is critically low.",
    productId: "prod-a",
    supplierId: null,
    warehouseId: "wh-1",
    ...overrides,
  };
}

function candidate(overrides: Partial<RecommendationCandidate> = {}): RecommendationCandidate {
  return {
    category: RecommendationCategory.INVENTORY,
    severity: RecommendationSeverity.CRITICAL,
    triggerCondition: "stockStatus === CRITICAL",
    supportingMetrics: { onHandQty: 10 },
    justification: "Product A at Warehouse 1 is critically low.",
    productId: "prod-a",
    supplierId: null,
    warehouseId: "wh-1",
    ...overrides,
  };
}

describe("recommendationIdentityKey", () => {
  it("combines category, productId, supplierId, warehouseId into one string", () => {
    expect(
      recommendationIdentityKey({
        category: RecommendationCategory.INVENTORY,
        productId: "p1",
        supplierId: null,
        warehouseId: "w1",
      }),
    ).toBe("INVENTORY:p1::w1");
  });

  it("produces the same key for two rows with identical fields", () => {
    const a = { category: RecommendationCategory.SUPPLIER, productId: null, supplierId: "s1", warehouseId: null };
    const b = { category: RecommendationCategory.SUPPLIER, productId: null, supplierId: "s1", warehouseId: null };
    expect(recommendationIdentityKey(a)).toBe(recommendationIdentityKey(b));
  });

  it("produces different keys for different categories on the same entity", () => {
    const inventory = recommendationIdentityKey({
      category: RecommendationCategory.INVENTORY,
      productId: "p1",
      supplierId: null,
      warehouseId: "w1",
    });
    const demand = recommendationIdentityKey({
      category: RecommendationCategory.DEMAND,
      productId: "p1",
      supplierId: null,
      warehouseId: "w1",
    });
    expect(inventory).not.toBe(demand);
  });
});

describe("computeRecommendationSyncPlan", () => {
  it("inserts a candidate with no matching existing row", () => {
    const plan = computeRecommendationSyncPlan([], [candidate()]);
    expect(plan.toInsert).toEqual([candidate()]);
    expect(plan.toUpdate).toEqual([]);
    expect(plan.toDelete).toEqual([]);
  });

  it("updates an existing row when a matching candidate has a different severity", () => {
    const existing = existingRow({ severity: RecommendationSeverity.WARNING });
    const plan = computeRecommendationSyncPlan([existing], [candidate({ severity: RecommendationSeverity.CRITICAL })]);

    expect(plan.toInsert).toEqual([]);
    expect(plan.toUpdate).toEqual([
      { id: "row-1", candidate: candidate({ severity: RecommendationSeverity.CRITICAL }) },
    ]);
    expect(plan.toDelete).toEqual([]);
  });

  it("updates an existing row when a matching candidate has a different justification", () => {
    const existing = existingRow({ metricJustification: "Old text." });
    const plan = computeRecommendationSyncPlan([existing], [candidate({ justification: "New text." })]);

    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0].id).toBe("row-1");
  });

  it("treats an identical match as unchanged: no insert, update, or delete", () => {
    const existing = existingRow();
    const plan = computeRecommendationSyncPlan([existing], [candidate()]);

    expect(plan.toInsert).toEqual([]);
    expect(plan.toUpdate).toEqual([]);
    expect(plan.toDelete).toEqual([]);
  });

  it("deletes an existing row with no matching candidate", () => {
    const existing = existingRow();
    const plan = computeRecommendationSyncPlan([existing], []);

    expect(plan.toDelete).toEqual(["row-1"]);
    expect(plan.toInsert).toEqual([]);
    expect(plan.toUpdate).toEqual([]);
  });

  it("handles a mixed batch: one insert, one update, one delete, one unchanged", () => {
    const unchanged = existingRow({ id: "unchanged", productId: "prod-u", warehouseId: "wh-u" });
    const toBeUpdated = existingRow({
      id: "stale-severity",
      productId: "prod-b",
      warehouseId: "wh-2",
      severity: RecommendationSeverity.WARNING,
    });
    const toBeDeleted = existingRow({ id: "resolved", productId: "prod-c", warehouseId: "wh-3" });

    const candidates = [
      candidate({ productId: "prod-u", warehouseId: "wh-u" }), // matches `unchanged` exactly
      candidate({ productId: "prod-b", warehouseId: "wh-2", severity: RecommendationSeverity.CRITICAL }),
      candidate({ productId: "prod-new", warehouseId: "wh-4" }), // brand new
    ];

    const plan = computeRecommendationSyncPlan([unchanged, toBeUpdated, toBeDeleted], candidates);

    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].productId).toBe("prod-new");

    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0].id).toBe("stale-severity");

    expect(plan.toDelete).toEqual(["resolved"]);
  });

  it("never includes a row that wasn't passed in existingActive (e.g. ACCEPTED/DISMISSED rows the caller already excluded)", () => {
    // Simulates the caller having already filtered to status: ACTIVE only —
    // this function has no way to "reach" an excluded row, by construction.
    const plan = computeRecommendationSyncPlan([], [candidate()]);
    expect(plan.toDelete).toEqual([]);
  });
});
