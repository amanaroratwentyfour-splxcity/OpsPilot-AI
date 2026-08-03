import { NextResponse } from "next/server";
import { narrateActiveRecommendations } from "@/lib/ai/narrateRecommendations";
import { ClaudeNarrativeProvider } from "@/lib/ai/claudeNarrativeProvider";
import { withRouteErrorHandling } from "@/lib/api/http";

/**
 * Batch-generates AI narratives for eligible ACTIVE recommendations
 * (those without one already). Deliberately batch-only, not per-card —
 * this is the one and only trigger for lib/ai/ in the whole app. If no
 * ANTHROPIC_API_KEY is configured, ClaudeNarrativeProvider returns null
 * for every candidate and this responds 200 with narrated: 0 — narration
 * failing is never an error state for the rest of the app.
 */
export const POST = withRouteErrorHandling(async () => {
  const result = await narrateActiveRecommendations(new ClaudeNarrativeProvider());
  return NextResponse.json(result);
});
