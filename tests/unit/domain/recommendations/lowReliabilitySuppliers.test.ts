import { describe, expect, it } from "vitest";
import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma";
import { findLowReliabilitySuppliers } from "@/lib/domain/recommendations/lowReliabilitySuppliers";

describe("findLowReliabilitySuppliers", () => {
  it("flags a supplier below the LOW_RELIABILITY_THRESHOLD (70)", () => {
    const [candidate] = findLowReliabilitySuppliers([
      { supplierId: "sup-1", supplierName: "Ganges Refreshments Co.", reliabilityScore: 68 },
    ]);

    expect(candidate.category).toBe(RecommendationCategory.SUPPLIER);
    expect(candidate.severity).toBe(RecommendationSeverity.WARNING);
    expect(candidate.triggerCondition).toMatch(/reliabilityScore < 70/);
    expect(candidate.supportingMetrics).toEqual({ reliabilityScore: 68, threshold: 70 });
    expect(candidate.justification).toContain("Ganges Refreshments Co.");
    expect(candidate.supplierId).toBe("sup-1");
    expect(candidate.productId).toBeNull();
    expect(candidate.warehouseId).toBeNull();
  });

  it("does not flag a supplier at or above the threshold", () => {
    const candidates = findLowReliabilitySuppliers([
      { supplierId: "sup-1", supplierName: "Amrit Agro", reliabilityScore: 94 },
      { supplierId: "sup-2", supplierName: "Exactly At Threshold", reliabilityScore: 70 },
    ]);

    expect(candidates).toEqual([]);
  });

  it("does not flag a supplier with a null reliabilityScore (not yet scored)", () => {
    expect(
      findLowReliabilitySuppliers([
        { supplierId: "sup-1", supplierName: "New Supplier", reliabilityScore: null },
      ]),
    ).toEqual([]);
  });

  it("flags every qualifying supplier in a mixed batch", () => {
    const candidates = findLowReliabilitySuppliers([
      { supplierId: "a", supplierName: "A", reliabilityScore: 62 },
      { supplierId: "b", supplierName: "B", reliabilityScore: 94 },
      { supplierId: "c", supplierName: "C", reliabilityScore: 64 },
      { supplierId: "d", supplierName: "D", reliabilityScore: null },
    ]);

    expect(candidates.map((c) => c.supplierId)).toEqual(["a", "c"]);
  });
});
