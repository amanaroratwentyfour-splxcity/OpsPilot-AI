import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateAllRecommendationCandidates } from "@/lib/domain/recommendations/recalculate";
import { recommendationIdentityKey } from "@/lib/domain/recommendations/syncPlan";
import type { NarrativeProvider } from "./narrativeProvider";
import { toNarrativeInput } from "./narrativeInput";

/** Accepts either the shared Prisma singleton or a transaction client. */
type Db = typeof prisma | Prisma.TransactionClient;

export interface NarrateActiveRecommendationsOptions {
  /** Re-narrate rows that already have an aiNarrative. Default false, to
   *  avoid unnecessary API calls on every invocation. */
  regenerateExisting?: boolean;
}

export interface NarrateActiveRecommendationsResult {
  totalActive: number;
  eligible: number;
  narrated: number;
  /** ACTIVE row whose identity key no longer matches any current candidate
   *  (its trigger condition changed between the sync and this call). */
  skippedNoMatch: number;
  /** Candidate matched, but the provider returned null (unavailable, error,
   *  or refusal) — the row is left exactly as it was. */
  skippedProviderUnavailable: number;
}

/**
 * Fills in AIRecommendation.aiNarrative for currently-ACTIVE rows via the
 * supplied NarrativeProvider. Entirely additive and optional: never called
 * by the deterministic recommendation sync
 * (lib/domain/recommendations/recalculate.ts), and every recommendation
 * remains fully functional with aiNarrative left null — this only enriches
 * rows that already exist, it never blocks or gates on them.
 *
 * The `provider` parameter is what makes this orchestrator itself
 * provider-agnostic, not just the interface it depends on — this file
 * never imports Claude specifics, only NarrativeProvider.
 *
 * AIRecommendation stores only category/severity/metricJustification, not
 * the richer triggerCondition/supportingMetrics a good narrative needs —
 * so this reuses generateAllRecommendationCandidates (read-only) and
 * recommendationIdentityKey (both already exported by the domain layer,
 * not duplicated here) to reconstruct the full RecommendationCandidate
 * behind each persisted row before narrating it.
 *
 * @param provider - any NarrativeProvider implementation
 * @param db - Prisma client or transaction client; defaults to the shared
 *   singleton, so tests can run this inside a transaction that's rolled
 *   back afterward with zero persistent side effects
 * @param options.regenerateExisting - see NarrateActiveRecommendationsOptions
 */
export async function narrateActiveRecommendations(
  provider: NarrativeProvider,
  db: Db = prisma,
  options: NarrateActiveRecommendationsOptions = {},
): Promise<NarrateActiveRecommendationsResult> {
  const regenerateExisting = options.regenerateExisting ?? false;

  const candidates = await generateAllRecommendationCandidates(db);
  const candidatesByKey = new Map(candidates.map((c) => [recommendationIdentityKey(c), c]));

  const existingActive = await db.aIRecommendation.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      category: true,
      productId: true,
      supplierId: true,
      warehouseId: true,
      aiNarrative: true,
    },
  });

  let eligible = 0;
  let narrated = 0;
  let skippedNoMatch = 0;
  let skippedProviderUnavailable = 0;

  for (const row of existingActive) {
    if (row.aiNarrative !== null && !regenerateExisting) {
      continue;
    }

    const candidate = candidatesByKey.get(recommendationIdentityKey(row));
    if (!candidate) {
      skippedNoMatch++;
      continue;
    }

    eligible++;
    const narrative = await provider.generateNarrative(toNarrativeInput(candidate));
    if (narrative === null) {
      skippedProviderUnavailable++;
      continue;
    }

    await db.aIRecommendation.update({ where: { id: row.id }, data: { aiNarrative: narrative } });
    narrated++;
  }

  return {
    totalActive: existingActive.length,
    eligible,
    narrated,
    skippedNoMatch,
    skippedProviderUnavailable,
  };
}
