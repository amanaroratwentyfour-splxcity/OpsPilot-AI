import { describe, expect, it } from "vitest";
import { computeCompanyAnalyticsSnapshot } from "@/lib/domain/analytics/companyAnalytics";
import { computeUsageValue } from "@/lib/domain/analytics/usageValue";
import { computeInventoryValue } from "@/lib/domain/analytics/inventoryValue";
import { computeInventoryTurnover } from "@/lib/domain/analytics/turnover";
import { computeTurnoverHealth } from "@/lib/domain/analytics/turnoverHealth";
import { computeWarehouseUtilization } from "@/lib/domain/analytics/warehouseUtilization";
import { computeWarehouseUtilizationHealth } from "@/lib/domain/analytics/warehouseUtilizationHealth";
import { computeInventoryHealthScore } from "@/lib/domain/inventory/healthScore";
import { computeOperationsHealthScore } from "@/lib/domain/analytics/operationsHealthScore";

const INPUT = {
  products: [
    { annualDemand: 1000, unitCost: 10 },
    { annualDemand: 500, unitCost: 20 },
  ],
  inventoryRows: [
    { onHandQty: 200, unitCost: 10, reorderPoint: 150 },
    { onHandQty: 100, unitCost: 20, reorderPoint: 80 },
  ],
  warehouses: [{ warehouseId: "w1", totalOnHand: 700, capacityUnits: 1000 }],
  supplierReliabilityScores: [90, 70],
  forecastMapeValues: [10, 20],
};

describe("computeCompanyAnalyticsSnapshot", () => {
  it("computes Inventory Turnover identically to summing computeUsageValue/computeInventoryValue and calling computeInventoryTurnover directly", () => {
    const snapshot = computeCompanyAnalyticsSnapshot(INPUT);

    const expectedCogs = INPUT.products.reduce(
      (sum, p) => sum + computeUsageValue(p.annualDemand, p.unitCost)!,
      0,
    );
    const expectedInventoryValue = INPUT.inventoryRows.reduce(
      (sum, r) => sum + computeInventoryValue(r.onHandQty, r.unitCost)!,
      0,
    );
    const expectedTurnover = computeInventoryTurnover(expectedCogs, expectedInventoryValue);

    expect(snapshot.inventoryTurnover).toBeCloseTo(expectedTurnover!, 10);
  });

  it("computes each warehouse's utilization identically to calling computeWarehouseUtilization directly", () => {
    const snapshot = computeCompanyAnalyticsSnapshot(INPUT);

    expect(snapshot.warehouseUtilizations).toHaveLength(1);
    expect(snapshot.warehouseUtilizations[0].warehouseId).toBe("w1");
    expect(snapshot.warehouseUtilizations[0].utilizationPercent).toBe(
      computeWarehouseUtilization(700, 1000),
    );
  });

  it("averages Inventory Health across rows identically to calling computeInventoryHealthScore directly (reused from the Inventory Engine)", () => {
    const snapshot = computeCompanyAnalyticsSnapshot(INPUT);

    const expectedAvg =
      INPUT.inventoryRows.reduce(
        (sum, r) => sum + computeInventoryHealthScore(r.onHandQty, r.reorderPoint)!,
        0,
      ) / INPUT.inventoryRows.length;

    expect(snapshot.operationsHealthComponents.avgInventoryHealth).toBeCloseTo(expectedAvg, 10);
  });

  it("blends the five components identically to calling computeOperationsHealthScore directly", () => {
    const snapshot = computeCompanyAnalyticsSnapshot(INPUT);
    const components = snapshot.operationsHealthComponents;

    const expectedScore = computeOperationsHealthScore({
      inventoryHealth: components.avgInventoryHealth,
      supplierReliability: components.avgSupplierReliability,
      forecastAccuracy: components.avgForecastAccuracy,
      warehouseUtilizationHealth: components.avgWarehouseUtilizationHealth,
      turnoverHealth: components.turnoverHealth,
    });

    expect(snapshot.operationsHealthScore).toBeCloseTo(expectedScore!, 10);
  });

  it("computes average supplier reliability excluding nulls", () => {
    const snapshot = computeCompanyAnalyticsSnapshot({
      ...INPUT,
      supplierReliabilityScores: [90, null, 70],
    });
    expect(snapshot.operationsHealthComponents.avgSupplierReliability).toBeCloseTo(80, 10);
  });

  it("computes forecast accuracy as 100 - average MAPE, floored at 0", () => {
    const snapshot = computeCompanyAnalyticsSnapshot({ ...INPUT, forecastMapeValues: [150, 150] });
    expect(snapshot.operationsHealthComponents.avgForecastAccuracy).toBe(0);
  });

  it("returns null components and null operationsHealthScore for entirely empty input", () => {
    const snapshot = computeCompanyAnalyticsSnapshot({
      products: [],
      inventoryRows: [],
      warehouses: [],
      supplierReliabilityScores: [],
      forecastMapeValues: [],
    });

    expect(snapshot.inventoryTurnover).toBeNull();
    expect(snapshot.warehouseUtilizations).toEqual([]);
    expect(snapshot.operationsHealthScore).toBeNull();
  });

  it("still computes an operations health score when only some components are available", () => {
    const snapshot = computeCompanyAnalyticsSnapshot({
      products: [],
      inventoryRows: [],
      warehouses: [],
      supplierReliabilityScores: [90],
      forecastMapeValues: [],
    });

    expect(snapshot.operationsHealthComponents.avgSupplierReliability).toBe(90);
    expect(snapshot.operationsHealthScore).toBe(90); // only present component
  });
});
