import { NextResponse } from "next/server";
import { recalculateAllInventory } from "@/lib/domain/inventory/recalculate";
import { recalculateAllSupplierReliability } from "@/lib/domain/suppliers/recalculate";
import { recalculateAllForecasts } from "@/lib/domain/forecasting/recalculate";
import { recalculateABCClassification } from "@/lib/domain/analytics/recalculate";
import { recalculateAllRecommendations } from "@/lib/domain/recommendations/recalculate";
import { withRouteErrorHandling } from "@/lib/api/http";

/**
 * The single global "Recalculate All" action. Runs every engine's batch
 * orchestrator in dependency order — Inventory -> Suppliers -> Forecast ->
 * Analytics (ABC) -> Recommendations — since Recommendations reads the
 * output of every engine before it, and none of the earlier stages read
 * anything the later ones produce. Each stage is exactly the
 * already-built, already-tested orchestrator function; nothing here
 * computes anything new, this route only sequences them and reports what
 * each one did.
 *
 * Not wrapped in one enclosing transaction across stages: each orchestrator
 * already manages its own consistency boundary (e.g. recalculateAllRecommendations
 * self-wraps its sync in a transaction), and SQLite's single-writer model means
 * stages already serialize behind each other. If a stage throws, everything
 * before it has already committed — the response reports which stages
 * completed rather than claiming an all-or-nothing guarantee that isn't there.
 */
export const POST = withRouteErrorHandling(async () => {
  const startedAt = Date.now();

  const inventory = await recalculateAllInventory();
  const suppliers = await recalculateAllSupplierReliability();
  const forecasts = await recalculateAllForecasts();
  const abc = await recalculateABCClassification();
  const recommendations = await recalculateAllRecommendations();

  return NextResponse.json({
    inventory: { productsProcessed: inventory.productsProcessed },
    suppliers: { suppliersScored: suppliers.suppliersScored },
    forecasts: { productsProcessed: forecasts.productsProcessed },
    abc: { productsClassified: abc.productsClassified },
    recommendations: {
      candidatesGenerated: recommendations.candidatesGenerated,
      created: recommendations.created,
      updated: recommendations.updated,
      deleted: recommendations.deleted,
    },
    durationMs: Date.now() - startedAt,
  });
});
