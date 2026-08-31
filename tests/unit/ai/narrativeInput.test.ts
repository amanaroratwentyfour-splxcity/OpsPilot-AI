import { describe, expect, it } from "vitest";
import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma";
import { toNarrativeInput } from "@/lib/ai/narrativeInput";
import type { RecommendationCandidate } from "@/lib/domain/recommendations/recommendationCandidate";

describe("toNarrativeInput", () => {
  it("carries over the explainability fields and drops the entity id fields", () => {
    const candidate: RecommendationCandidate = {
      category: RecommendationCategory.INVENTORY,
      severity: RecommendationSeverity.CRITICAL,
      triggerCondition: "stockStatus === CRITICAL (onHandQty <= reorderPoint)",
      supportingMetrics: { onHandQty: 95, reorderPoint: 182 },
      justification: "Product X at Warehouse Y is critically low.",
      productId: "prod-1",
      supplierId: null,
      warehouseId: "wh-1",
    };

    const result = toNarrativeInput(candidate);

    expect(result).toEqual({
      category: RecommendationCategory.INVENTORY,
      severity: RecommendationSeverity.CRITICAL,
      triggerCondition: "stockStatus === CRITICAL (onHandQty <= reorderPoint)",
      supportingMetrics: { onHandQty: 95, reorderPoint: 182 },
      justification: "Product X at Warehouse Y is critically low.",
    });
    expect(result).not.toHaveProperty("productId");
    expect(result).not.toHaveProperty("supplierId");
    expect(result).not.toHaveProperty("warehouseId");
  });
});
