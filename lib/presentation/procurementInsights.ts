import { explainRecommendation, type RecommendationExplanation } from "./recommendationExplain";
import { formatNumber } from "@/lib/format";

/**
 * Deterministic Procurement text, same discipline as chartInsights.ts and
 * recommendationExplain.ts — plain-fact sentences over data already
 * fetched, never fabricated, never industry-specific.
 */

export interface ProcurementDeterministicInsight {
  summary: string;
  insight: string;
}

export function buildProcurementInsight(
  kpis: { openPurchaseOrders: number; overduePurchaseOrders: number; flaggedProducts: number },
  riskRecommendations: { severity: string; supplierName: string | null; warehouseName: string | null }[],
): ProcurementDeterministicInsight {
  const summary = `${kpis.openPurchaseOrders} open purchase order(s), ${kpis.overduePurchaseOrders} overdue, ${kpis.flaggedProducts} product(s) flagged for reorder.`;

  if (riskRecommendations.length === 0) {
    return { summary, insight: "No purchase orders are currently overdue — procurement is on track." };
  }

  const critical = riskRecommendations.filter((r) => r.severity === "CRITICAL");
  const worst = (critical.length > 0 ? critical : riskRecommendations)[0];
  const label =
    worst.supplierName && worst.warehouseName ? `${worst.supplierName} → ${worst.warehouseName}` : "One or more suppliers";

  return {
    summary,
    insight: `${label} ${critical.length > 0 ? "has the most critical" : "has the most"} delivery risk right now, out of ${riskRecommendations.length} supplier/warehouse pair(s) affected.`,
  };
}

export interface PurchaseOrderExplanation {
  whyItMatters: string;
  riskIfDelayed: string;
  expectedImpact: string;
  suggestedPriority: "High" | "Medium" | "Low" | "None";
}

/**
 * Deterministic per-PO explanation for the Purchase Order detail Sheet.
 * Recomputes the same overdue condition as
 * lib/domain/recommendations/overduePurchaseOrders.ts (status === IN_TRANSIT
 * AND expectedDeliveryDate < now, 7+ days = CRITICAL) directly from the PO's
 * own two fields, then reuses explainRecommendation for the actual
 * engine/impact text — no new recommendation logic, no fabricated content.
 */
export function explainPurchaseOrder(po: {
  status: string;
  expectedDeliveryDate: Date | string | null;
  now?: Date;
}): PurchaseOrderExplanation {
  const now = po.now ?? new Date();
  const expected = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null;

  if (po.status === "IN_TRANSIT" && expected && expected < now) {
    const daysOverdue = Math.floor((now.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
    const severity = daysOverdue >= 7 ? "CRITICAL" : "WARNING";
    const explanation = explainRecommendation("PROCUREMENT", severity, "warehouse");
    return {
      whyItMatters: `This order is ${daysOverdue} day(s) past its expected delivery date.`,
      riskIfDelayed: explanation.expectedImpact,
      expectedImpact: explanation.expectedImpact,
      suggestedPriority: severity === "CRITICAL" ? "High" : "Medium",
    };
  }

  if (po.status === "IN_TRANSIT") {
    return {
      whyItMatters: "In transit and on schedule — the expected delivery date has not yet passed.",
      riskIfDelayed: "No delivery risk detected at this time.",
      expectedImpact: "No impact expected if the current schedule holds.",
      suggestedPriority: "Low",
    };
  }

  if (po.status === "RECEIVED") {
    return {
      whyItMatters: "Delivery is already complete.",
      riskIfDelayed: "None — this order is fulfilled.",
      expectedImpact: "No further action needed.",
      suggestedPriority: "None",
    };
  }

  if (po.status === "CANCELLED") {
    return {
      whyItMatters: "This order was cancelled.",
      riskIfDelayed: "Not applicable.",
      expectedImpact: "Not applicable.",
      suggestedPriority: "None",
    };
  }

  return {
    whyItMatters: "Not yet in transit — still awaiting submission, approval, or shipment.",
    riskIfDelayed: "No delivery date risk to evaluate until the order ships.",
    expectedImpact: "No impact yet — revisit once the order moves to In Transit.",
    suggestedPriority: "Low",
  };
}

/**
 * Deterministic per-EOQ-row explanation, shaped like RecommendationExplanation
 * so it can reuse RecommendationWhyPopover as-is rather than a new component.
 */
export function explainEOQRecommendation(item: {
  stockStatus: string | null;
  currentOnHand: number;
  reorderPoint: number | null;
  safetyStock: number | null;
  annualDemand: number;
  eoq: number | null;
  warehouseName: string | null;
}): RecommendationExplanation {
  const statusWord = item.stockStatus === "CRITICAL" ? "critical" : "low";
  const whereText = item.warehouseName ? ` at ${item.warehouseName}` : "";
  const reorderText = item.reorderPoint !== null ? `, against a reorder point of ${formatNumber(item.reorderPoint)} units` : "";

  return {
    engine: "Economic Order Quantity (EOQ) Engine",
    triggerCondition: `On-hand stock (${formatNumber(item.currentOnHand)} units${whereText}) is flagged ${statusWord}${reorderText}.`,
    expectedImpact:
      item.eoq !== null
        ? `Ordering the suggested ${formatNumber(item.eoq)} units (based on ${formatNumber(item.annualDemand)} units of trailing annual demand) restores the position toward a healthy buffer.`
        : "No EOQ suggestion available — insufficient data to compute a recommended order quantity.",
    confidenceNote: "Recommended order quantity only, not a persisted or probabilistic estimate — recalculates live from current demand and cost data.",
  };
}
