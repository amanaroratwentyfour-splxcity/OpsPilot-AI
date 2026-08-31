import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma";
import { LOW_RELIABILITY_THRESHOLD } from "../config";
import type { RecommendationCandidate } from "./recommendationCandidate";

export interface SupplierPositionInput {
  supplierId: string;
  supplierName: string;
  /** Supplier.reliabilityScore, as already computed by the Supplier Engine
   *  (computeSupplierMetrics, Milestone 2.5) — `null` means "not yet
   *  scored" (fewer than MIN_ORDERS_FOR_RELIABILITY_SCORE received orders),
   *  which is excluded here, not treated as low. */
  reliabilityScore: number | null;
}

/**
 * Flags suppliers whose already-computed Reliability Score
 * (computeSupplierMetrics, Milestone 2.5) is below LOW_RELIABILITY_THRESHOLD.
 *
 * Named for what it actually detects — a currently-low score — rather than
 * "declining," because no engine in this codebase computes a reliability
 * *trend* over time (Supplier Engine outputs one point-in-time score per
 * supplier, not a history of scores). Building trend detection would be a
 * new calculation, which this milestone's brief says not to introduce;
 * threshold-checking an existing score is squarely the rule engine's job.
 *
 * Pure — no Prisma/database access, no new calculation.
 *
 * @param suppliers - every supplier's current reliabilityScore
 */
export function findLowReliabilitySuppliers(
  suppliers: SupplierPositionInput[],
): RecommendationCandidate[] {
  return suppliers
    .filter((supplier) => supplier.reliabilityScore !== null)
    .filter((supplier) => (supplier.reliabilityScore as number) < LOW_RELIABILITY_THRESHOLD)
    .map((supplier) => {
      const reliabilityScore = supplier.reliabilityScore as number;

      return {
        category: RecommendationCategory.SUPPLIER,
        severity: RecommendationSeverity.WARNING,
        triggerCondition: `reliabilityScore < ${LOW_RELIABILITY_THRESHOLD}`,
        supportingMetrics: {
          reliabilityScore,
          threshold: LOW_RELIABILITY_THRESHOLD,
        },
        justification:
          `${supplier.supplierName}'s reliability score is ${reliabilityScore}/100, ` +
          `below the ${LOW_RELIABILITY_THRESHOLD} threshold for a trusted supplier.`,
        productId: null,
        supplierId: supplier.supplierId,
        warehouseId: null,
      };
    });
}
