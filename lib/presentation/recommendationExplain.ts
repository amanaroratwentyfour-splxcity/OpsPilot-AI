/**
 * Static "Why?" explanation for a recommendation card (DESIGN_SPECIFICATION.md
 * §7.4) — which rule engine produced it, what condition triggers that rule,
 * and the likely operational impact of leaving it unresolved.
 *
 * AIRecommendation doesn't persist which of the six rule functions in
 * lib/domain/recommendations/ generated a given row (schema changes are
 * out of scope for this phase) — but every rule's (category, severity,
 * entity shape) combination is unique in practice, so this reconstructs
 * the source rule from data the dashboard already has, rather than
 * guessing or parsing the justification text. See the six rule files
 * under lib/domain/recommendations/ for the authoritative trigger logic
 * this mirrors.
 */
export type RecommendationEntityType = "product" | "supplier" | "warehouse" | null;

export interface RecommendationExplanation {
  engine: string;
  triggerCondition: string;
  expectedImpact: string;
  /** AIRecommendation has no confidence field — stated honestly rather than fabricated. */
  confidenceNote: string;
}

export function explainRecommendation(
  category: string,
  severity: string,
  entityType: RecommendationEntityType,
): RecommendationExplanation {
  const confidenceNote = "Not tracked for this recommendation type — every trigger below is a deterministic threshold, not a probabilistic estimate.";

  if (category === "INVENTORY" && entityType === "product") {
    if (severity === "CRITICAL") {
      return {
        engine: "Critical Inventory Rule",
        triggerCondition: "On-hand quantity has fallen below the reorder point.",
        expectedImpact: "Risk of stockout before the next replenishment cycle completes if left unresolved.",
        confidenceNote,
      };
    }
    return {
      engine: "Overstocked Inventory Rule",
      triggerCondition: "On-hand quantity exceeds 4x the reorder point.",
      expectedImpact: "Working capital stays tied up in excess stock until the position is drawn down or reordering is paused.",
      confidenceNote,
    };
  }

  if (category === "INVENTORY") {
    return {
      engine: "Warehouse Capacity Rule",
      triggerCondition:
        severity === "CRITICAL"
          ? "Warehouse utilization has reached the critical capacity threshold."
          : "Warehouse utilization has reached the warning capacity threshold.",
      expectedImpact:
        severity === "CRITICAL"
          ? "Little to no room for incoming stock — inbound purchase orders may have nowhere to be received."
          : "Capacity is tightening; incoming stock should be planned with this warehouse's headroom in mind.",
      confidenceNote,
    };
  }

  if (category === "SUPPLIER") {
    return {
      engine: "Low Reliability Supplier Rule",
      triggerCondition: "Supplier reliability score has fallen below the 70-point threshold.",
      expectedImpact: "Orders placed with this supplier carry elevated risk of late or inconsistent delivery.",
      confidenceNote,
    };
  }

  if (category === "PROCUREMENT") {
    return {
      engine: "Overdue Purchase Order Rule",
      triggerCondition:
        severity === "CRITICAL"
          ? "A purchase order is 7 or more days past its expected delivery date."
          : "A purchase order has passed its expected delivery date.",
      expectedImpact: "The purchase order's items are not available for sale or use until delivery is confirmed.",
      confidenceNote,
    };
  }

  return {
    engine: "Demand Increase Rule",
    triggerCondition:
      "Forecasted demand has risen 15% or more between the start and end of the forecast window, and the forecast's recent accuracy is trusted (error below 30%).",
    expectedImpact: "Current reorder quantities may fall short of the newly projected demand if not reviewed.",
    confidenceNote,
  };
}
