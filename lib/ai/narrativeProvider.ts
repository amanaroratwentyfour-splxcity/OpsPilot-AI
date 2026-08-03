/**
 * Provider-agnostic input for generating a recommendation narrative.
 * Deliberately mirrors RecommendationCandidate's explainability fields
 * (trigger condition, supporting metrics, severity, justification) rather
 * than importing that domain type directly — this interface's contract
 * shouldn't shift just because the domain layer's internal shape does. See
 * narrativeInput.ts for the one place that bridges the two.
 */
export interface RecommendationNarrativeInput {
  category: string;
  severity: string;
  triggerCondition: string;
  supportingMetrics: Record<string, number | string>;
  justification: string;
}

/**
 * A pluggable source of AI-generated recommendation narratives. Claude is
 * the only implementation today (claudeNarrativeProvider.ts), but nothing
 * outside this file's callers needs to know that — swapping in another LLM
 * provider means writing a new class against this interface, not touching
 * any caller.
 *
 * Contract: implementations must never throw. Any failure — no API key
 * configured, network error, rate limit, safety refusal, anything —
 * resolves to `null`. This is what makes "Claude unavailable" a normal,
 * silent outcome for every caller rather than something each one has to
 * defensively catch.
 */
export interface NarrativeProvider {
  generateNarrative(input: RecommendationNarrativeInput): Promise<string | null>;
}
