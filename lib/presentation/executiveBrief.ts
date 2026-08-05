export interface ExecutiveBriefInput {
  operationsHealthScore: number | null;
  stockStatusCounts: { CRITICAL: number; LOW: number; HEALTHY: number; OVERSTOCKED: number };
  supplierReliability: { belowThresholdCount: number };
  forecastAccuracy: number | null;
  overduePurchaseOrderCount: number;
  warehouseUtilizations: { warehouseName: string; utilizationPercent: number | null }[];
  warehouseCriticalThreshold: number;
  /** Highest-severity active recommendation, if any — drives "Recommended Priority". */
  topPriorityItem: { entityName: string | null; justification: string } | null;
}

export interface ExecutiveBriefSections {
  overallStatus: string;
  inventory: string;
  supplierPerformance: string;
  forecasting: string;
  procurement: string;
  recommendedPriority: string;
}

/**
 * Produces a short, deterministic, plain-English summary of the current
 * operational situation, sectioned per DESIGN_SPECIFICATION.md's
 * Operational Brief pattern — purely templated sentences over numbers the
 * dashboard has already fetched, no new calculation and no LLM call.
 * Distinct from the optional AI Insight panels: this always renders,
 * requires no API key, and every sentence traces to a specific existing
 * engine output — never hardcoded to any one company's data.
 */
export function buildExecutiveBrief(input: ExecutiveBriefInput): ExecutiveBriefSections {
  const overallStatus = buildOverallStatus(input.operationsHealthScore);
  const inventory = buildInventorySection(input.stockStatusCounts);
  const supplierPerformance = buildSupplierSection(input.supplierReliability.belowThresholdCount);
  const forecasting = buildForecastingSection(input.forecastAccuracy);
  const procurement = buildProcurementSection(
    input.overduePurchaseOrderCount,
    input.warehouseUtilizations,
    input.warehouseCriticalThreshold,
  );
  const recommendedPriority = buildRecommendedPriority(input);

  return { overallStatus, inventory, supplierPerformance, forecasting, procurement, recommendedPriority };
}

function buildOverallStatus(score: number | null): string {
  if (score === null) return "Not enough data has been recalculated yet to compute an overall health score.";
  const rounded = Math.round(score);
  const tone = rounded >= 80 ? "in good shape" : rounded >= 60 ? "needs attention" : "requires immediate attention";
  return `Operations Health Score is ${rounded}/100. Overall operations are ${tone}.`;
}

function buildInventorySection(counts: ExecutiveBriefInput["stockStatusCounts"]): string {
  const parts: string[] = [];
  if (counts.CRITICAL > 0) {
    parts.push(`${counts.CRITICAL} position${counts.CRITICAL === 1 ? " is" : "s are"} critically low and at risk of stockout`);
  }
  if (counts.OVERSTOCKED > 0) {
    parts.push(`${counts.OVERSTOCKED} position${counts.OVERSTOCKED === 1 ? " is" : "s are"} overstocked, tying up working capital`);
  }
  if (parts.length === 0) return "No critical or overstocked positions. Inventory levels are within healthy range.";
  return `${parts.join("; ")}.`.replace(/^./, (c) => c.toUpperCase());
}

function buildSupplierSection(belowThresholdCount: number): string {
  if (belowThresholdCount === 0) return "No suppliers are currently below the reliability threshold.";
  return `${belowThresholdCount} supplier${belowThresholdCount === 1 ? " is" : "s are"} below the reliability threshold and may need follow-up.`;
}

function buildForecastingSection(forecastAccuracy: number | null): string {
  if (forecastAccuracy === null) return "Not enough forecast history yet to assess accuracy.";
  const rounded = forecastAccuracy.toFixed(1);
  return forecastAccuracy >= 80
    ? `Forecast accuracy is ${rounded}%. Demand projections are currently trustworthy.`
    : `Forecast accuracy is ${rounded}%, below the trust threshold, so demand-driven decisions deserve extra scrutiny.`;
}

function buildProcurementSection(
  overdueCount: number,
  warehouseUtilizations: ExecutiveBriefInput["warehouseUtilizations"],
  criticalThreshold: number,
): string {
  const parts: string[] = [];
  if (overdueCount > 0) {
    parts.push(`${overdueCount} purchase order${overdueCount === 1 ? " is" : "s are"} overdue for delivery`);
  }

  const utilizationValues = warehouseUtilizations.filter(
    (w): w is { warehouseName: string; utilizationPercent: number } => w.utilizationPercent !== null,
  );
  if (utilizationValues.length > 0) {
    const highest = utilizationValues.reduce((a, b) => (b.utilizationPercent > a.utilizationPercent ? b : a));
    const lowest = utilizationValues.reduce((a, b) => (b.utilizationPercent < a.utilizationPercent ? b : a));
    parts.push(
      `warehouse utilization ranges from ${Math.round(lowest.utilizationPercent)}% (${lowest.warehouseName}) to ${Math.round(highest.utilizationPercent)}% (${highest.warehouseName})`,
    );
    if (highest.utilizationPercent >= criticalThreshold) {
      parts.push(`${highest.warehouseName} is nearing full capacity and may need relief`);
    }
  }

  if (parts.length === 0) return "No overdue purchase orders and no warehouse capacity data available.";
  return `${parts.join("; ")}.`.replace(/^./, (c) => c.toUpperCase());
}

function buildRecommendedPriority(input: ExecutiveBriefInput): string {
  if (input.stockStatusCounts.CRITICAL > 0) {
    return input.topPriorityItem
      ? `Start with the highest-severity item: ${input.topPriorityItem.entityName ?? "an active recommendation"}. ${input.topPriorityItem.justification}`
      : `Address the ${input.stockStatusCounts.CRITICAL} critical inventory position${input.stockStatusCounts.CRITICAL === 1 ? "" : "s"} first. They carry the highest stockout risk.`;
  }
  if (input.overduePurchaseOrderCount > 0) {
    return `Follow up on the ${input.overduePurchaseOrderCount} overdue purchase order${input.overduePurchaseOrderCount === 1 ? "" : "s"}. Each is a delivery promise already missed.`;
  }
  if (input.supplierReliability.belowThresholdCount > 0) {
    return `Review the supplier${input.supplierReliability.belowThresholdCount === 1 ? "" : "s"} below the reliability threshold before placing new orders with them.`;
  }
  if (input.stockStatusCounts.OVERSTOCKED > 0) {
    return `Consider drawing down the ${input.stockStatusCounts.OVERSTOCKED} overstocked position${input.stockStatusCounts.OVERSTOCKED === 1 ? "" : "s"} to free up working capital.`;
  }
  return "No urgent action required. Operations are running smoothly.";
}
