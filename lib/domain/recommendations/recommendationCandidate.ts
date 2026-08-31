import type { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma";

/**
 * A deterministic recommendation produced by one rule function, before
 * persistence. Every field required by this milestone's brief is modeled
 * explicitly, not folded into a single opaque string:
 *
 * - `triggerCondition` — the rule that fired, in words (e.g.
 *   "stockStatus === CRITICAL (onHandQty <= reorderPoint)").
 * - `supportingMetrics` — the real numbers behind that trigger, keyed by
 *   name, so a caller (UI or test) can render or assert on them directly
 *   rather than parsing `justification`.
 * - `severity` — RecommendationSeverity, taken from the schema's own enum.
 * - `justification` — one human-readable sentence combining the above,
 *   corresponding to `AIRecommendation.metricJustification`.
 *
 * `aiNarrative` (an optional, separately-generated free-text explanation)
 * deliberately has no counterpart here — these candidates are the
 * deterministic layer only; an AI narrative, if ever added, is generated
 * from a candidate afterward, never required to produce one.
 *
 * This is a plain data shape, not a persisted row: no `id`, `status`, or
 * timestamps. Writing candidates to AIRecommendation is a later milestone
 * (the Recommendation Persistence Orchestrator), not part of this one.
 */
export interface RecommendationCandidate {
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  triggerCondition: string;
  supportingMetrics: Record<string, number | string>;
  justification: string;
  productId: string | null;
  supplierId: string | null;
  warehouseId: string | null;
}
