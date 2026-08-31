import { describe, expect, it } from "vitest";
import { RecommendationCategory, RecommendationSeverity } from "@/lib/generated/prisma";
import {
  findOverduePurchaseOrders,
  type PurchaseOrderPositionInput,
} from "@/lib/domain/recommendations/overduePurchaseOrders";

const NOW = new Date("2026-08-02T00:00:00Z");

function order(overrides: Partial<PurchaseOrderPositionInput> = {}): PurchaseOrderPositionInput {
  return {
    purchaseOrderId: "po-1",
    supplierId: "sup-1",
    supplierName: "Amrit Agro Suppliers",
    warehouseId: "wh-1",
    warehouseName: "NovaFoods Mumbai Distribution Center",
    status: "IN_TRANSIT",
    expectedDeliveryDate: new Date("2026-07-26T00:00:00Z"), // 7 days before NOW
    ...overrides,
  };
}

describe("findOverduePurchaseOrders", () => {
  it("flags an IN_TRANSIT order whose expected delivery date has passed", () => {
    const [candidate] = findOverduePurchaseOrders([order()], NOW);

    expect(candidate.category).toBe(RecommendationCategory.PROCUREMENT);
    expect(candidate.triggerCondition).toMatch(/IN_TRANSIT/);
    expect(candidate.supportingMetrics.overdueOrderCount).toBe(1);
    expect(candidate.supportingMetrics.maxDaysOverdue).toBe(7);
    expect(candidate.justification).toContain("Amrit Agro Suppliers");
    expect(candidate.justification).toContain("7 day");
    expect(candidate.supplierId).toBe("sup-1");
    expect(candidate.warehouseId).toBe("wh-1");
    expect(candidate.productId).toBeNull();
  });

  it("escalates to CRITICAL severity at 7+ days overdue, WARNING below that", () => {
    const barelyOverdue = findOverduePurchaseOrders(
      [order({ expectedDeliveryDate: new Date("2026-08-01T00:00:00Z") })], // 1 day
      NOW,
    );
    expect(barelyOverdue[0].severity).toBe(RecommendationSeverity.WARNING);

    const wayOverdue = findOverduePurchaseOrders(
      [order({ expectedDeliveryDate: new Date("2026-07-20T00:00:00Z") })], // 13 days
      NOW,
    );
    expect(wayOverdue[0].severity).toBe(RecommendationSeverity.CRITICAL);
  });

  it("does not flag an order whose expected delivery date is still in the future", () => {
    expect(
      findOverduePurchaseOrders([order({ expectedDeliveryDate: new Date("2026-08-10T00:00:00Z") })], NOW),
    ).toEqual([]);
  });

  it("does not flag orders that are not IN_TRANSIT", () => {
    const statuses = ["DRAFT", "SUBMITTED", "APPROVED", "RECEIVED", "CANCELLED"];
    const orders = statuses.map((status) => order({ status }));

    expect(findOverduePurchaseOrders(orders, NOW)).toEqual([]);
  });

  it("does not flag an order with no expected delivery date", () => {
    expect(findOverduePurchaseOrders([order({ expectedDeliveryDate: null })], NOW)).toEqual([]);
  });

  it("consolidates multiple overdue orders from the same supplier to the same warehouse into one candidate", () => {
    // AIRecommendation has no purchaseOrderId column, so (supplierId,
    // warehouseId) is the finest granularity a persisted recommendation can
    // reference — multiple overdue orders for the same pair must collapse
    // into one candidate, not be emitted as indistinguishable duplicates.
    const orders = [
      order({ purchaseOrderId: "po-1", expectedDeliveryDate: new Date("2026-07-26T00:00:00Z") }), // 7 days
      order({ purchaseOrderId: "po-2", expectedDeliveryDate: new Date("2026-07-04T00:00:00Z") }), // 29 days
      order({ purchaseOrderId: "po-3", expectedDeliveryDate: new Date("2026-07-31T00:00:00Z") }), // 2 days
    ];

    const candidates = findOverduePurchaseOrders(orders, NOW);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].supportingMetrics.overdueOrderCount).toBe(3);
    expect(candidates[0].supportingMetrics.maxDaysOverdue).toBe(29);
    expect(candidates[0].justification).toContain("3 purchase orders are overdue");
    expect(candidates[0].justification).toContain("29 day");
  });

  it("keeps overdue orders to different warehouses (or from different suppliers) as separate candidates", () => {
    const orders = [
      order({ purchaseOrderId: "po-1", warehouseId: "wh-1" }),
      order({ purchaseOrderId: "po-2", warehouseId: "wh-2", warehouseName: "NovaFoods Delhi Distribution Center" }),
      order({ purchaseOrderId: "po-3", supplierId: "sup-2", supplierName: "Other Supplier" }),
    ];

    const candidates = findOverduePurchaseOrders(orders, NOW);
    expect(candidates).toHaveLength(3);
    for (const candidate of candidates) {
      expect(candidate.supportingMetrics.overdueOrderCount).toBe(1);
    }
  });
});
