/**
 * Developer utility: measures the execution time of recalculateAllInventory()
 * against the current seeded dataset, to establish a performance baseline.
 *
 * Observational only. Does not assert or fail on timing, and does not
 * optimize anything — see Milestone 2.3's implementation notes if timing
 * ever needs improving. Runs inside a Prisma transaction that is always
 * rolled back at the end, so running this (repeatedly) never mutates the
 * seeded dataset (prisma/dev.db) or its business-scenario storytelling.
 *
 * Usage: npm run benchmark:inventory
 */

import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { recalculateAllInventory } from "../lib/domain/inventory/recalculate";

class RollbackAfterBenchmark extends Error {}

async function main() {
  const totalProducts = await prisma.product.count();
  const totalInventoryRows = await prisma.inventory.count();

  let result: Awaited<ReturnType<typeof recalculateAllInventory>> | undefined;
  const start = performance.now();

  try {
    await prisma.$transaction(
      async (tx) => {
        result = await recalculateAllInventory(tx);
        // Always roll back — this is a measurement utility, not a real
        // recalculation run. See the file header.
        throw new RollbackAfterBenchmark();
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    if (!(error instanceof RollbackAfterBenchmark)) {
      throw error;
    }
  }

  const elapsedMs = performance.now() - start;

  if (!result) {
    throw new Error(
      "Benchmark did not complete — recalculateAllInventory() never returned a result.",
    );
  }

  console.log("=== recalculateAllInventory() benchmark ===");
  console.log(`Products processed:        ${result.productsProcessed}`);
  console.log(`Products skipped:          ${result.productsSkipped}`);
  console.log(`Inventory rows in dataset: ${totalInventoryRows}`);
  console.log(`Total execution time:      ${elapsedMs.toFixed(1)} ms`);
  console.log(`Average time per product:  ${(elapsedMs / result.productsProcessed).toFixed(2)} ms`);
  console.log("");
  console.log(
    "(Observational baseline only — nothing was persisted; ran inside a rolled-back transaction.)",
  );

  if (totalProducts !== result.productsProcessed) {
    console.warn(
      `Note: Product.count() (${totalProducts}) differs from productsProcessed (${result.productsProcessed}).`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
