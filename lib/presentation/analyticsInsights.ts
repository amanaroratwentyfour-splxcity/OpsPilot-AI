import { formatCurrency, formatNumber } from "@/lib/format";

/**
 * Deterministic Analytics Summary text (Phase 9 §5) — plain-fact sentences
 * over data already computed by getAnalyticsOverview, same discipline as
 * forecastingInsights.ts/procurementInsights.ts. Class A's count is
 * reused directly as the Pareto observation: classifyABC's Class A cutoff
 * *is* the "cumulative 80% of usage value" boundary, so no separate
 * calculation is needed.
 */

export interface AnalyticsDeterministicInsight {
  summary: string;
  insight: string;
}

export function buildAnalyticsInsight(input: {
  totalInventoryValue: number;
  highestValueWarehouse: { name: string; value: number } | null;
  classCounts: { A: number; B: number; C: number };
  totalSkuCount: number;
}): AnalyticsDeterministicInsight {
  const summary = input.highestValueWarehouse
    ? `Total inventory value is ${formatCurrency(input.totalInventoryValue)}, with ${input.highestValueWarehouse.name} holding the most at ${formatCurrency(input.highestValueWarehouse.value)}.`
    : `Total inventory value is ${formatCurrency(input.totalInventoryValue)}.`;

  const { A, B, C } = input.classCounts;
  const largestClass = A >= B && A >= C ? "A" : B >= C ? "B" : "C";
  const largestCount = { A, B, C }[largestClass];
  const paretoPercent = input.totalSkuCount > 0 ? (A / input.totalSkuCount) * 100 : 0;

  const insight =
    input.totalSkuCount === 0
      ? "No classified products available yet."
      : `Class ${largestClass} is the largest ABC category with ${largestCount} product(s). The top ${A} of ${input.totalSkuCount} SKUs (${formatNumber(paretoPercent, 1)}%) account for 80% of usage value.`;

  return { summary, insight };
}
