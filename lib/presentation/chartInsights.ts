/**
 * Deterministic Summary/Insight text for the Executive Dashboard's chart
 * Intelligence Footers (DESIGN_SPECIFICATION.md §7.2) — pure template
 * sentences over data the dashboard already fetched, same discipline as
 * executiveBrief.ts. Never references FMCG/dairy/any specific industry or
 * company name, since the same function runs for any imported dataset.
 */

export interface WarehouseUtilizationInsight {
  summary: string;
  insight: string;
}

export function buildWarehouseUtilizationInsight(
  warehouseUtilizations: { warehouseName: string; utilizationPercent: number | null }[],
  warningThreshold: number,
  criticalThreshold: number,
): WarehouseUtilizationInsight {
  const summary = "How full each warehouse is relative to its capacity, right now.";

  const values = warehouseUtilizations.filter(
    (w): w is { warehouseName: string; utilizationPercent: number } => w.utilizationPercent !== null,
  );
  if (values.length === 0) {
    return { summary, insight: "No warehouse capacity data available yet." };
  }

  const atOrAboveCritical = values.filter((w) => w.utilizationPercent >= criticalThreshold);
  const atOrAboveWarning = values.filter(
    (w) => w.utilizationPercent >= warningThreshold && w.utilizationPercent < criticalThreshold,
  );
  const highest = values.reduce((a, b) => (b.utilizationPercent > a.utilizationPercent ? b : a));
  const lowest = values.reduce((a, b) => (b.utilizationPercent < a.utilizationPercent ? b : a));

  if (atOrAboveCritical.length > 0) {
    return {
      summary,
      insight: `${atOrAboveCritical.map((w) => w.warehouseName).join(", ")} ${atOrAboveCritical.length === 1 ? "is" : "are"} at or above ${criticalThreshold}% utilization, critically low headroom for incoming stock.`,
    };
  }
  if (atOrAboveWarning.length > 0) {
    return {
      summary,
      insight: `${atOrAboveWarning.map((w) => w.warehouseName).join(", ")} ${atOrAboveWarning.length === 1 ? "is" : "are"} above the ${warningThreshold}% warning threshold, while ${lowest.warehouseName} has the most headroom at ${Math.round(lowest.utilizationPercent)}%.`,
    };
  }
  return {
    summary,
    insight: `All warehouses are within a healthy range, from ${Math.round(lowest.utilizationPercent)}% (${lowest.warehouseName}) to ${Math.round(highest.utilizationPercent)}% (${highest.warehouseName}).`,
  };
}

export interface StockStatusInsight {
  summary: string;
  insight: string;
}

export function buildStockStatusInsight(counts: {
  CRITICAL: number;
  LOW: number;
  HEALTHY: number;
  OVERSTOCKED: number;
}): StockStatusInsight {
  const summary = "Every inventory position, grouped by stock health status.";
  const total = counts.CRITICAL + counts.LOW + counts.HEALTHY + counts.OVERSTOCKED;

  if (total === 0) {
    return { summary, insight: "No inventory positions found yet." };
  }

  const criticalPercent = (counts.CRITICAL / total) * 100;
  const overstockPercent = (counts.OVERSTOCKED / total) * 100;
  const healthyPercent = (counts.HEALTHY / total) * 100;

  if (counts.CRITICAL > 0) {
    return {
      summary,
      insight: `${counts.CRITICAL} position${counts.CRITICAL === 1 ? "" : "s"} (${criticalPercent.toFixed(0)}%) ${counts.CRITICAL === 1 ? "is" : "are"} critically low, against ${counts.HEALTHY} healthy (${healthyPercent.toFixed(0)}%).`,
    };
  }
  if (counts.OVERSTOCKED > 0) {
    return {
      summary,
      insight: `No critical positions right now. ${counts.OVERSTOCKED} position${counts.OVERSTOCKED === 1 ? "" : "s"} (${overstockPercent.toFixed(0)}%) ${counts.OVERSTOCKED === 1 ? "is" : "are"} overstocked.`,
    };
  }
  return { summary, insight: `${healthyPercent.toFixed(0)}% of positions are healthy, with no critical or overstocked positions.` };
}

export interface CategoryBreakdownInsight {
  summary: string;
  insight: string;
}

/** Deterministic Summary/Insight for the Inventory page's "Positions by Category" chart — same discipline as the two builders above, industry-agnostic (category names come straight from the imported dataset's own ProductCategory values). */
export function buildCategoryBreakdownInsight(data: { category: string; count: number }[]): CategoryBreakdownInsight {
  const summary = "Every inventory position, grouped by product category.";

  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return { summary, insight: "No inventory positions found yet." };
  }

  const top = data.reduce((a, b) => (b.count > a.count ? b : a));
  const topPercent = (top.count / total) * 100;
  const topLabel = top.category.replace(/_/g, " ");

  return {
    summary,
    insight: `${topLabel} has the most positions (${top.count} of ${total}, ${topPercent.toFixed(0)}%), across ${data.length} categor${data.length === 1 ? "y" : "ies"} total.`,
  };
}
