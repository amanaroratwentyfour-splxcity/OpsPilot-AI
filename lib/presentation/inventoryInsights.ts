export interface DemandHistoryInsight {
  summary: string;
  insight: string;
}

/**
 * Deterministic Summary/Insight for the Product Detail page's "Historical
 * Movement Summary" (Phase 5) — same discipline as chartInsights.ts, but
 * kept in its own file since it's genuinely product-detail-specific (no
 * other page renders a single product's weekly demand series) rather than
 * a chart type shared across pages. Never asserts a trend it can't
 * support: with fewer than 2 weeks of history this says so plainly rather
 * than guessing, and the "trend" comparison below is stated as exactly
 * what it is — first-half vs. second-half average — not a fitted or
 * statistically validated trend line.
 */
export function buildDemandHistoryInsight(
  weeklyQuantities: number[],
  demandStatistics: { avgDailyDemand: number; stdDevDaily: number } | null,
): DemandHistoryInsight {
  const summary = "Weekly units sold over the observed history for this product.";

  if (weeklyQuantities.length === 0) {
    return { summary, insight: "No demand history recorded yet for this product." };
  }

  if (weeklyQuantities.length < 2 || demandStatistics === null) {
    return {
      summary,
      insight: `${weeklyQuantities.length} week${weeklyQuantities.length === 1 ? "" : "s"} of history recorded, not enough yet to assess a trend.`,
    };
  }

  const half = Math.floor(weeklyQuantities.length / 2);
  const firstHalfAvg = mean(weeklyQuantities.slice(0, half));
  const secondHalfAvg = mean(weeklyQuantities.slice(weeklyQuantities.length - half));
  const changePercent = firstHalfAvg === 0 ? null : ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  const trendText =
    changePercent === null
      ? "not enough early history to compare"
      : changePercent > 10
        ? `up about ${changePercent.toFixed(0)}% comparing the first half of this history to the second half`
        : changePercent < -10
          ? `down about ${Math.abs(changePercent).toFixed(0)}% comparing the first half of this history to the second half`
          : "holding roughly steady across the observed history";

  return {
    summary,
    insight: `Averaging ${demandStatistics.avgDailyDemand.toFixed(1)} units/day (±${demandStatistics.stdDevDaily.toFixed(1)} std. dev.), ${trendText}.`,
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
