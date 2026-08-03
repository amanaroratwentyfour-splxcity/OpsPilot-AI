import { describe, expect, it } from "vitest";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { findCriticalInventoryPositions } from "@/lib/domain/recommendations/criticalInventory";
import { findOverstockedPositions } from "@/lib/domain/recommendations/overstockedInventory";
import { findLowReliabilitySuppliers } from "@/lib/domain/recommendations/lowReliabilitySuppliers";
import { findOverduePurchaseOrders } from "@/lib/domain/recommendations/overduePurchaseOrders";
import { findWarehousesNearCapacity } from "@/lib/domain/recommendations/warehousesNearCapacity";
import { findDemandIncreaseCandidates } from "@/lib/domain/recommendations/demandIncrease";
import { getCompanyAnalyticsSnapshot } from "@/lib/domain/analytics/recalculate";

/**
 * Integration tests against the real seeded database (prisma/dev.db).
 *
 * These rule functions are pure (no Prisma access of their own), so what's
 * being verified here is the *shape and content* of real data flowing from
 * the already-built engine orchestrators/tables into the rule functions —
 * not persistence. Every test still runs inside a rolled-back transaction
 * for consistency with every other engine's integration tests and because
 * a couple of these fetches go through orchestrators; nothing here writes.
 */

class RollbackForTest extends Error {}

async function runInRolledBackTransaction(fn: (tx: Prisma.TransactionClient) => Promise<void>) {
  await expect(
    prisma.$transaction(
      async (tx) => {
        await fn(tx);
        throw new RollbackForTest();
      },
      { timeout: 60000 },
    ),
  ).rejects.toThrow(RollbackForTest);
}

describe("findCriticalInventoryPositions (integration)", () => {
  it("flags the known flagship stockout position (DAI-0016 at Mumbai) from real seeded data", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const rows = await tx.inventory.findMany({
        where: { stockStatus: "CRITICAL" },
        select: {
          onHandQty: true,
          reorderPoint: true,
          stockStatus: true,
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });
      expect(rows.length).toBeGreaterThan(0);

      const positions = rows.map((row) => ({
        productId: row.product.id,
        productName: row.product.name,
        warehouseId: row.warehouse.id,
        warehouseName: row.warehouse.name,
        onHandQty: row.onHandQty,
        reorderPoint: row.reorderPoint,
        stockStatus: row.stockStatus,
      }));

      const candidates = findCriticalInventoryPositions(positions);
      expect(candidates).toHaveLength(rows.length);

      // Confirmed via direct SQL: DAI-0016 (NovaFresh Processed Cheese Block
      // 400g) at Mumbai is CRITICAL (95 on hand vs a 182 reorder point).
      const flagship = rows.find((row) => row.product.sku === "DAI-0016");
      expect(flagship).toBeDefined();
      const flagshipCandidate = candidates.find((c) => c.productId === flagship!.product.id);
      expect(flagshipCandidate).toBeDefined();
      expect(flagshipCandidate!.supportingMetrics.onHandQty).toBe(95);
      expect(flagshipCandidate!.supportingMetrics.reorderPoint).toBe(182);
    });
  }, 30000);
});

describe("findOverstockedPositions (integration)", () => {
  it("flags known overstocked positions from real seeded data", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const rows = await tx.inventory.findMany({
        where: { stockStatus: "OVERSTOCKED" },
        select: {
          onHandQty: true,
          reorderPoint: true,
          stockStatus: true,
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });
      expect(rows.length).toBeGreaterThan(0);

      const positions = rows.map((row) => ({
        productId: row.product.id,
        productName: row.product.name,
        warehouseId: row.warehouse.id,
        warehouseName: row.warehouse.name,
        onHandQty: row.onHandQty,
        reorderPoint: row.reorderPoint,
        stockStatus: row.stockStatus,
      }));

      const candidates = findOverstockedPositions(positions);
      expect(candidates).toHaveLength(rows.length);
      for (const candidate of candidates) {
        // >= 4, not > 4: ratioToReorderPoint is rounded to 2dp for display,
        // so a true ratio of e.g. 4.002 (still genuinely > 4.0, the
        // classifyStockStatus boundary) can round to exactly 4.00.
        expect(candidate.supportingMetrics.ratioToReorderPoint as number).toBeGreaterThanOrEqual(4);
      }
    });
  }, 30000);
});

describe("findLowReliabilitySuppliers (integration)", () => {
  it("flags exactly the known low-reliability suppliers from real seeded data", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const suppliers = await tx.supplier.findMany({
        select: { id: true, name: true, reliabilityScore: true },
      });

      const candidates = findLowReliabilitySuppliers(
        suppliers.map((s) => ({
          supplierId: s.id,
          supplierName: s.name,
          reliabilityScore: s.reliabilityScore,
        })),
      );

      // Confirmed via direct SQL against the seeded data: exactly these
      // four suppliers sit below the 70 threshold.
      const flaggedNames = candidates.map((c) =>
        suppliers.find((s) => s.id === c.supplierId)!.name,
      );
      expect(flaggedNames.sort()).toEqual(
        [
          "East India Packaging & Trading Co.",
          "Clean & Bright Industries",
          "Ganges Refreshments Co.",
          "Arctic Exports Frozen Solutions",
        ].sort(),
      );
      for (const candidate of candidates) {
        expect(candidate.supportingMetrics.reliabilityScore as number).toBeLessThan(70);
      }
    });
  }, 30000);
});

describe("findOverduePurchaseOrders (integration)", () => {
  it("flags real IN_TRANSIT orders whose expected delivery date has already passed", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const orders = await tx.purchaseOrder.findMany({
        where: { status: "IN_TRANSIT" },
        select: {
          id: true,
          status: true,
          expectedDeliveryDate: true,
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });
      expect(orders.length).toBeGreaterThan(0);

      const candidates = findOverduePurchaseOrders(
        orders.map((order) => ({
          purchaseOrderId: order.id,
          supplierId: order.supplier.id,
          supplierName: order.supplier.name,
          warehouseId: order.warehouse.id,
          warehouseName: order.warehouse.name,
          status: order.status,
          expectedDeliveryDate: order.expectedDeliveryDate,
        })),
      );

      // Confirmed via direct SQL: several IN_TRANSIT orders have an
      // expectedDeliveryDate in the past relative to today, and two
      // (supplier, warehouse) pairs have more than one overdue order —
      // consolidated into one candidate each, so candidates.length is
      // less than orders.length here, not equal to it.
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.length).toBeLessThan(orders.length);
      let totalOverdueOrdersAcrossCandidates = 0;
      for (const candidate of candidates) {
        // >= 0, not > 0: an order overdue by only a few hours still floors
        // to 0 whole days late, but is genuinely overdue (it passed the
        // expectedDeliveryDate < now filter to be a candidate at all).
        expect(candidate.supportingMetrics.maxDaysOverdue as number).toBeGreaterThanOrEqual(0);
        expect(candidate.supportingMetrics.overdueOrderCount as number).toBeGreaterThanOrEqual(1);
        totalOverdueOrdersAcrossCandidates += candidate.supportingMetrics.overdueOrderCount as number;
      }
      // Every genuinely-overdue order is accounted for in exactly one
      // candidate's count.
      const overdueOrders = orders.filter(
        (o) => o.expectedDeliveryDate !== null && o.expectedDeliveryDate < new Date(),
      );
      expect(totalOverdueOrdersAcrossCandidates).toBe(overdueOrders.length);
    });
  }, 30000);
});

describe("findWarehousesNearCapacity (integration)", () => {
  it("flags Mumbai (WARNING) and no warehouse below the warning threshold, reusing getCompanyAnalyticsSnapshot", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const snapshot = await getCompanyAnalyticsSnapshot(tx);
      const warehouses = await tx.warehouse.findMany({ select: { id: true, name: true } });

      const inputs = snapshot.warehouseUtilizations.map((w) => ({
        warehouseId: w.warehouseId,
        warehouseName: warehouses.find((wh) => wh.id === w.warehouseId)!.name,
        utilizationPercent: w.utilizationPercent,
      }));

      const candidates = findWarehousesNearCapacity(inputs);
      const flaggedNames = candidates.map(
        (c) => warehouses.find((wh) => wh.id === c.warehouseId)!.name,
      );

      // Confirmed via direct SQL / the Analytics Engine's own integration
      // tests: Mumbai=91% (WARNING), Delhi=78%, Bengaluru=63%, Kolkata=46%
      // (all below the 85% warning threshold).
      expect(flaggedNames).toContain("NovaFoods Mumbai Distribution Center");
      expect(flaggedNames).not.toContain("NovaFoods Delhi Distribution Center");
      expect(flaggedNames).not.toContain("NovaFoods Bengaluru Distribution Center");
      expect(flaggedNames).not.toContain("NovaFoods Kolkata Distribution Center");

      const mumbai = candidates.find((c) => c.warehouseId === inputs.find((i) => i.warehouseName === "NovaFoods Mumbai Distribution Center")!.warehouseId);
      expect(mumbai!.severity).toBe("WARNING");
    });
  }, 30000);
});

describe("findDemandIncreaseCandidates (integration)", () => {
  it("produces well-formed, threshold-respecting candidates from real forecast data", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const products = await tx.product.findMany({
        select: {
          id: true,
          name: true,
          forecasts: {
            where: { method: "MOVING_AVERAGE" },
            orderBy: { periodDate: "asc" },
            select: { forecastQty: true, mape: true },
          },
        },
        take: 50,
      });

      const inputs = products
        .filter((p) => p.forecasts.length >= 2)
        .map((p) => {
          const mapeValues = p.forecasts
            .map((f) => f.mape)
            .filter((m): m is number => m !== null);
          const aggregateMAPE =
            mapeValues.length > 0
              ? mapeValues.reduce((sum, m) => sum + m, 0) / mapeValues.length
              : null;

          return {
            productId: p.id,
            productName: p.name,
            forecastSeries: p.forecasts.map((f) => f.forecastQty),
            aggregateMAPE,
          };
        });
      expect(inputs.length).toBeGreaterThan(0);

      const candidates = findDemandIncreaseCandidates(inputs);

      // Structural correctness: every candidate genuinely satisfies both
      // the increase threshold and the trust gate, since this is a
      // different (simpler) signal than the seed script's old ad-hoc
      // seasonal heuristic and isn't expected to reproduce its exact picks.
      for (const candidate of candidates) {
        expect(candidate.supportingMetrics.increasePercent as number).toBeGreaterThanOrEqual(15);
        expect(candidate.supportingMetrics.aggregateMAPE as number).toBeLessThanOrEqual(30);
        expect(candidate.severity).toBe("INFO");
        expect(candidate.productId).not.toBeNull();
      }
    });
  }, 30000);
});
