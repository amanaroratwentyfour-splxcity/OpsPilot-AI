import type { RecommendationCandidate } from "./recommendationCandidate";

/**
 * The shape of an existing AIRecommendation row this module needs to decide
 * what to do with it — a projection, not the full Prisma row.
 */
export interface ExistingRecommendationRow {
  id: string;
  category: RecommendationCandidate["category"];
  severity: RecommendationCandidate["severity"];
  metricJustification: string;
  productId: string | null;
  supplierId: string | null;
  warehouseId: string | null;
}

export interface RecommendationSyncPlan {
  toInsert: RecommendationCandidate[];
  toUpdate: { id: string; candidate: RecommendationCandidate }[];
  toDelete: string[];
}

/**
 * The identity key used to match a fresh candidate against an existing
 * AIRecommendation row across recalculation runs. There is no
 * database-backed unique identifier for this today (the schema is frozen
 * and has no column that names "which rule produced this row") — this is a
 * deliberate, documented application-level substitute, expected to be
 * replaced by a real key if one is ever added to the schema. Defined once,
 * here, so nothing else in this codebase constructs this string itself.
 *
 * Sufficient today because no two of the six rule functions ever emit the
 * same (category, productId, supplierId, warehouseId) combination for
 * genuinely different recommendations: a given Inventory position is never
 * simultaneously CRITICAL and OVERSTOCKED, and findWarehousesNearCapacity
 * is the only INVENTORY-category rule with productId null.
 */
export function recommendationIdentityKey(row: {
  category: RecommendationCandidate["category"];
  productId: string | null;
  supplierId: string | null;
  warehouseId: string | null;
}): string {
  return `${row.category}:${row.productId ?? ""}:${row.supplierId ?? ""}:${row.warehouseId ?? ""}`;
}

/**
 * Decides how a fresh batch of recommendation candidates should change the
 * set of currently-ACTIVE AIRecommendation rows — pure, no Prisma access.
 * This is the Recommendation Persistence Orchestrator's decision layer;
 * recalculate.ts only executes what this function decides.
 *
 * - A candidate with no matching existing row is new -> `toInsert`.
 * - A candidate matching an existing row, with a different severity or
 *   justification, is a refresh of the same recommendation -> `toUpdate`
 *   (same row id — its trigger condition changed value or even type, e.g.
 *   CRITICAL stockout easing into a LOW one, but it is still "the
 *   inventory recommendation for this position").
 * - A candidate matching an existing row with identical severity and
 *   justification changes nothing -> omitted from every list ("unchanged").
 * - An existing row with no matching candidate means its trigger condition
 *   no longer holds -> `toDelete`.
 *
 * `existingActive` must already be filtered to `status: ACTIVE` by the
 * caller — rows in ACCEPTED/DISMISSED/SNOOZED represent a completed user
 * decision and must never appear here, so this function can't touch them
 * even by mistake.
 */
export function computeRecommendationSyncPlan(
  existingActive: ExistingRecommendationRow[],
  candidates: RecommendationCandidate[],
): RecommendationSyncPlan {
  const existingByKey = new Map(existingActive.map((row) => [recommendationIdentityKey(row), row]));
  const matchedKeys = new Set<string>();

  const toInsert: RecommendationCandidate[] = [];
  const toUpdate: { id: string; candidate: RecommendationCandidate }[] = [];

  for (const candidate of candidates) {
    const key = recommendationIdentityKey(candidate);
    const existingRow = existingByKey.get(key);

    if (!existingRow) {
      toInsert.push(candidate);
      continue;
    }

    matchedKeys.add(key);
    const changed =
      existingRow.severity !== candidate.severity ||
      existingRow.metricJustification !== candidate.justification;
    if (changed) {
      toUpdate.push({ id: existingRow.id, candidate });
    }
  }

  const toDelete = existingActive
    .filter((row) => !matchedKeys.has(recommendationIdentityKey(row)))
    .map((row) => row.id);

  return { toInsert, toUpdate, toDelete };
}
