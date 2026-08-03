import type { RecommendationNarrativeInput } from "./narrativeProvider";

/**
 * Builds the prompt sent to an LLM to narrate one recommendation. Pure —
 * no network access — so it's directly unit-testable without a live
 * provider. The prompt explicitly forbids inventing numbers, since every
 * fact it needs is already in `input`; the narrative is meant to explain
 * the deterministic recommendation, not add new claims to it.
 */
export function buildNarrativePrompt(input: RecommendationNarrativeInput): string {
  const metricsText = Object.entries(input.supportingMetrics)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  return `You are an operations analyst writing a brief explanation for a recommendation shown on an FMCG operations dashboard.

Category: ${input.category}
Severity: ${input.severity}
Trigger condition: ${input.triggerCondition}
Supporting metrics:
${metricsText}
Deterministic justification (already shown to the user): ${input.justification}

Write a 2-3 sentence narrative in plain English that helps an operations manager quickly understand why this recommendation appeared and what it means for the business. Use only the facts given above — do not invent numbers, causes, or context not stated here. Do not repeat the justification verbatim. Respond with only the narrative text, no preamble, no headers, no markdown.`;
}
