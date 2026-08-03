import type { RecommendationCandidate } from "@/lib/domain/recommendations/recommendationCandidate";
import type { RecommendationNarrativeInput } from "./narrativeProvider";

/**
 * Adapts a domain-layer RecommendationCandidate into the AI layer's own
 * provider-agnostic input shape. This is the one place in the codebase
 * that bridges lib/domain and lib/ai — the import runs only in this
 * direction (AI layer depends on the domain type, never the reverse), so
 * lib/domain stays completely unaware that AI narratives exist.
 */
export function toNarrativeInput(candidate: RecommendationCandidate): RecommendationNarrativeInput {
  return {
    category: candidate.category,
    severity: candidate.severity,
    triggerCondition: candidate.triggerCondition,
    supportingMetrics: candidate.supportingMetrics,
    justification: candidate.justification,
  };
}
