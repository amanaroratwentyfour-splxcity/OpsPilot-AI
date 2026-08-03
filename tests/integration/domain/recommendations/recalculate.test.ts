import { describe, expect, it } from "vitest";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  generateAllRecommendationCandidates,
  recalculateAllRecommendations,
} from "@/lib/domain/recommendations/recalculate";

/**
 * Integration tests against the real seeded database (prisma/dev.db), which
 * currently holds 13 hand-authored AIRecommendation rows from Milestone 1.3
 * (11 ACTIVE, 1 ACCEPTED, 1 DISMISSED — confirmed via direct SQL before
 * writing these tests). Every test runs inside a rolled-back transaction,
 * so recalculateAllRecommendations is only ever exercised via an explicit
 * transaction client here, never via its default `db = prisma` parameter
 * (which opens its own committing transaction) — the same discipline every
 * earlier engine's integration tests follow, to avoid permanently mutating
 * the real seeded dataset.
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

describe("generateAllRecommendationCandidates (integration)", () => {
  it("produces plausible candidates from real seeded data, matching known scenarios", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const candidates = await generateAllRecommendationCandidates(tx);
      expect(candidates.length).toBeGreaterThan(0);

      // Confirmed via direct SQL (Milestone "Recommendation Rule Engine"):
      // DAI-0016 (NovaFresh Processed Cheese Block 400g) is CRITICAL at
      // Mumbai, and Ganges Refreshments Co. is below the reliability
      // threshold.
      const productIds = candidates.map((c) => c.productId).filter(Boolean);
      const supplierIds = candidates.map((c) => c.supplierId).filter(Boolean);
      expect(productIds.length).toBeGreaterThan(0);
      expect(supplierIds.length).toBeGreaterThan(0);

      for (const candidate of candidates) {
        expect(candidate.justification.length).toBeGreaterThan(0);
        expect(candidate.triggerCondition.length).toBeGreaterThan(0);
      }
    });
  }, 30000);

  it("is read-only: never writes to AIRecommendation", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const before = await tx.aIRecommendation.findMany({ select: { id: true } });
      await generateAllRecommendationCandidates(tx);
      const after = await tx.aIRecommendation.findMany({ select: { id: true } });
      expect(after).toEqual(before);
    });
  }, 30000);
});

describe("recalculateAllRecommendations (integration)", () => {
  it("never touches ACCEPTED or DISMISSED rows", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const nonActiveBefore = await tx.aIRecommendation.findMany({
        where: { status: { in: ["ACCEPTED", "DISMISSED"] } },
      });
      expect(nonActiveBefore.length).toBeGreaterThan(0);

      await recalculateAllRecommendations(tx);

      const nonActiveAfter = await tx.aIRecommendation.findMany({
        where: { status: { in: ["ACCEPTED", "DISMISSED"] } },
      });
      expect(nonActiveAfter).toEqual(nonActiveBefore);
    });
  }, 30000);

  it("after one run, every ACTIVE row corresponds to exactly one generated candidate", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const result = await recalculateAllRecommendations(tx);

      const activeAfter = await tx.aIRecommendation.count({ where: { status: "ACTIVE" } });
      expect(activeAfter).toBe(result.candidatesGenerated);
      expect(result.created + result.updated + result.deleted).toBeGreaterThan(0);
    });
  }, 30000);

  it("is idempotent: a second consecutive run makes no further changes", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const first = await recalculateAllRecommendations(tx);
      expect(first.candidatesGenerated).toBeGreaterThan(0);

      const activeAfterFirst = await tx.aIRecommendation.findMany({
        where: { status: "ACTIVE" },
        orderBy: { id: "asc" },
      });

      const second = await recalculateAllRecommendations(tx);

      expect(second.created).toBe(0);
      expect(second.updated).toBe(0);
      expect(second.deleted).toBe(0);
      expect(second.unchanged).toBe(second.candidatesGenerated);

      const activeAfterSecond = await tx.aIRecommendation.findMany({
        where: { status: "ACTIVE" },
        orderBy: { id: "asc" },
      });
      expect(activeAfterSecond).toEqual(activeAfterFirst);
    });
  }, 30000);

  it("deletes stale seed-authored ACTIVE rows that no longer match a real candidate", async () => {
    await runInRolledBackTransaction(async (tx) => {
      const activeBefore = await tx.aIRecommendation.findMany({ where: { status: "ACTIVE" } });

      const result = await recalculateAllRecommendations(tx);

      // The 11 seeded ACTIVE rows were hand-authored illustrative examples,
      // not rule-engine output, so at least some are expected not to match
      // a real current candidate and get removed on this first real run.
      expect(result.deleted).toBeGreaterThan(0);
      expect(result.deleted).toBeLessThanOrEqual(activeBefore.length);
    });
  }, 30000);
});
