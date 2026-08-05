import { TARGET_TURNOVER_RATE } from "@/lib/domain/config";

export interface InventoryBriefInput {
  kpis: {
    totalPositions: number;
    critical: number;
    low: number;
    healthy: number;
    overstocked: number;
    totalValue: number;
  };
  avgHealthScore: number | null;
  overstockedValue: number;
  warehouseBreakdown: { warehouseName: string; critical: number; overstocked: number; total: number }[];
  inventoryTurnover: number | null;
  worstCriticalItem: { name: string; warehouseName: string; onHandQty: number; reorderPoint: number } | null;
  worstOverstockedItem: { name: string; warehouseName: string; onHandQty: number; reorderPoint: number } | null;
}

export interface InventoryBriefSections {
  inventoryHealth: string;
  criticalStockouts: string;
  excessInventory: string;
  warehousePerformance: string;
  inventoryTurnover: string;
  recommendedPriority: string;
}

/**
 * Produces the Inventory Intelligence page's Operational Brief — the same
 * deterministic, templated-sentence discipline as
 * lib/presentation/executiveBrief.ts (real numbers already fetched for
 * this page's KPIs/table, substituted into fixed prose, no LLM call, no
 * industry-specific wording). Every section is scoped to the page's
 * currently-filtered view (kpis/warehouseBreakdown both come from
 * getInventoryList's own filtered query) except Inventory Turnover, which
 * has no per-filter calculation anywhere in the domain layer and is
 * therefore always the same company-wide figure the Executive Dashboard
 * shows — stated as such, never implied to be filtered.
 */
export function buildInventoryBrief(input: InventoryBriefInput): InventoryBriefSections {
  return {
    inventoryHealth: buildInventoryHealth(input.avgHealthScore, input.kpis.totalPositions),
    criticalStockouts: buildCriticalStockouts(input.kpis.critical, input.worstCriticalItem),
    excessInventory: buildExcessInventory(input.kpis.overstocked, input.overstockedValue),
    warehousePerformance: buildWarehousePerformance(input.warehouseBreakdown),
    inventoryTurnover: buildInventoryTurnover(input.inventoryTurnover),
    recommendedPriority: buildRecommendedPriority(input),
  };
}

function buildInventoryHealth(avgHealthScore: number | null, totalPositions: number): string {
  if (totalPositions === 0) return "No inventory positions match the current filters.";
  if (avgHealthScore === null) return "Not enough data yet to compute an average inventory health score.";
  const rounded = Math.round(avgHealthScore);
  const tone = rounded >= 80 ? "in good shape" : rounded >= 60 ? "needs attention" : "requires immediate attention";
  return `Average inventory health is ${rounded}/100 across ${totalPositions} position${totalPositions === 1 ? "" : "s"} — ${tone}.`;
}

function buildCriticalStockouts(
  critical: number,
  worstItem: InventoryBriefInput["worstCriticalItem"],
): string {
  if (critical === 0) return "No positions are currently critical — no immediate stockout risk.";
  const base = `${critical} position${critical === 1 ? " is" : "s are"} critically low and at risk of stockout.`;
  if (!worstItem) return base;
  return `${base} The most urgent is ${worstItem.name} at ${worstItem.warehouseName}: ${worstItem.onHandQty} units on hand against a reorder point of ${worstItem.reorderPoint}.`;
}

function buildExcessInventory(overstocked: number, overstockedValue: number): string {
  if (overstocked === 0) return "No positions are currently overstocked.";
  const formattedValue = `₹${Math.round(overstockedValue).toLocaleString("en-IN")}`;
  return `${overstocked} position${overstocked === 1 ? " is" : "s are"} overstocked, tying up ${formattedValue} in working capital.`;
}

function buildWarehousePerformance(warehouseBreakdown: InventoryBriefInput["warehouseBreakdown"]): string {
  if (warehouseBreakdown.length === 0) return "No warehouse data available for the current filters.";

  const withIssues = warehouseBreakdown.filter((w) => w.critical + w.overstocked > 0);
  if (withIssues.length === 0) {
    return `All ${warehouseBreakdown.length} warehouse${warehouseBreakdown.length === 1 ? "" : "s"} in view ${warehouseBreakdown.length === 1 ? "has" : "have"} no critical or overstocked positions.`;
  }

  const worst = withIssues.reduce((a, b) => (b.critical + b.overstocked > a.critical + a.overstocked ? b : a));
  return `${worst.warehouseName} needs the most attention: ${worst.critical} critical and ${worst.overstocked} overstocked position${worst.critical + worst.overstocked === 1 ? "" : "s"} out of ${worst.total} in view.`;
}

function buildInventoryTurnover(inventoryTurnover: number | null): string {
  if (inventoryTurnover === null) return "Not enough data yet to compute inventory turnover.";
  const rounded = inventoryTurnover.toFixed(1);
  return inventoryTurnover >= TARGET_TURNOVER_RATE
    ? `Inventory turns over ${rounded}x per year company-wide — at or above the ${TARGET_TURNOVER_RATE}x target.`
    : `Inventory turns over ${rounded}x per year company-wide — below the ${TARGET_TURNOVER_RATE}x target, worth reviewing alongside stockout risk.`;
}

function buildRecommendedPriority(input: InventoryBriefInput): string {
  if (input.kpis.critical > 0) {
    return input.worstCriticalItem
      ? `Start with ${input.worstCriticalItem.name} at ${input.worstCriticalItem.warehouseName} — it carries the highest stockout risk in view.`
      : `Address the ${input.kpis.critical} critical position${input.kpis.critical === 1 ? "" : "s"} first — they carry the highest stockout risk.`;
  }
  if (input.kpis.overstocked > 0 && input.worstOverstockedItem) {
    return `Review ${input.worstOverstockedItem.name} at ${input.worstOverstockedItem.warehouseName} — the most excess stock in view, worth drawing down first.`;
  }
  return "No urgent action required — inventory is running smoothly.";
}
