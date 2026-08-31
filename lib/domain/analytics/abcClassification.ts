import { ABCClass } from "@/lib/generated/prisma";
import { ABC_CUTOFFS } from "../config";

export interface ProductUsageValue {
  productId: string;
  /** Used only for deterministic tie-breaking when two products share a
   *  usage value — never for the ranking itself. */
  sku: string;
  usageValue: number;
}

export interface ABCClassificationResult {
  productId: string;
  usageValue: number;
  /** This product's running cumulative share of total catalog usage value,
   *  as a percentage (0-100) — exposed so the reasoning behind a
   *  classification is inspectable, not just the letter grade. */
  cumulativeValuePercent: number;
  abcClass: ABCClass;
}

/**
 * Batch composition layer for ABC Analysis: ranks and classifies an entire
 * product catalog at once.
 *
 * Unlike every other engine's composition layer (which bundles multiple
 * calculations for ONE entity), this one is inherently a whole-catalog
 * operation — a single product's class is only meaningful relative to
 * every other product's usage value, so there is no per-product variant of
 * this function and there should not be one (see OPERATIONS_ENGINE_SPEC.md
 * §4.5: "must be computed as a single full-catalog batch operation").
 *
 * Still pure — no Prisma/database access. Takes pre-computed usage values
 * (from computeUsageValue, called once per product by the orchestrator) and
 * performs the ranking, cumulative-percentage calculation, and Pareto
 * cutoff classification.
 *
 * Tie-breaking is deterministic: sort by usage value descending, then by
 * `sku` ascending. Without this, two products with identical usage value
 * straddling a cutoff boundary could swap classes on every recalculation
 * run for no reason other than unstable sort order.
 *
 * @param products - every product's id, sku, and pre-computed usage value
 * @param cutoffs - cumulative-value cutoffs; defaults to ABC_CUTOFFS
 * @returns one result per input product, or `null` if classification
 *   cannot be meaningfully performed (see Edge Cases below)
 */
export function classifyABC(
  products: ProductUsageValue[],
  cutoffs: { A: number; B: number } = ABC_CUTOFFS,
): ABCClassificationResult[] | null {
  if (products.length === 0) {
    return null;
  }

  const totalValue = products.reduce((sum, product) => sum + product.usageValue, 0);

  if (totalValue <= 0) {
    // Every product has zero (or invalid) usage value -- there is no
    // meaningful ranking to produce. Refuse rather than assign arbitrary
    // classes (OPERATIONS_ENGINE_SPEC.md §4.5, Edge Cases).
    return null;
  }

  const ranked = [...products].sort((a, b) => {
    if (b.usageValue !== a.usageValue) {
      return b.usageValue - a.usageValue;
    }
    return a.sku.localeCompare(b.sku);
  });

  let cumulativeValue = 0;

  return ranked.map((product) => {
    cumulativeValue += product.usageValue;
    const cumulativeValuePercent = (cumulativeValue / totalValue) * 100;

    const abcClass: ABCClass =
      cumulativeValuePercent <= cutoffs.A * 100
        ? ABCClass.A
        : cumulativeValuePercent <= cutoffs.B * 100
          ? ABCClass.B
          : ABCClass.C;

    return {
      productId: product.productId,
      usageValue: product.usageValue,
      cumulativeValuePercent,
      abcClass,
    };
  });
}
