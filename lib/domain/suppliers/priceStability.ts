function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * Price Stability: how stable a supplier's pricing has been, averaged
 * across the products it supplies.
 *
 * Computed as the coefficient of variation (stdDev / mean) of unit cost,
 * per product, then averaged across products — normalizing per product
 * first is required so a single high-price product doesn't dominate a
 * pooled variance across products of very different price scales (per
 * OPERATIONS_ENGINE_SPEC.md §4.8).
 *
 * A product with fewer than 2 price observations is excluded from the
 * average rather than treated as perfectly stable (coefficient of
 * variation is undefined for a single point, not zero).
 *
 * @param unitCostsByProduct - this supplier's PurchaseOrderItem.unitCost
 *   history, grouped by productId
 * @returns a score in [0, 100], or `null` if no product had enough price
 *   history (>= 2 observations) to assess stability
 */
export function computePriceStability(unitCostsByProduct: Map<string, number[]>): number | null {
  const coefficientsOfVariation: number[] = [];

  // Array.from(...) rather than `for...of map.values()` — this project's
  // tsconfig.json has no explicit `target`, which TypeScript defaults to
  // pre-ES2015, where Map iterators aren't directly iterable.
  for (const unitCosts of Array.from(unitCostsByProduct.values())) {
    if (unitCosts.length < 2) {
      continue;
    }

    const avgCost = mean(unitCosts);
    if (avgCost <= 0) {
      continue;
    }

    const variance = mean(unitCosts.map((cost) => (cost - avgCost) ** 2));
    const stdDev = Math.sqrt(variance);
    coefficientsOfVariation.push(stdDev / avgCost);
  }

  if (coefficientsOfVariation.length === 0) {
    return null;
  }

  const avgCoefficientOfVariation = mean(coefficientsOfVariation);
  return Math.max(0, 100 - Math.min(100, avgCoefficientOfVariation * 100));
}
