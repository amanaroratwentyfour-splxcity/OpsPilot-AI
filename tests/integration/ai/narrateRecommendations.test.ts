import { describe, expect, it } from "vitest";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recalculateAllRecommendations } from "@/lib/domain/recommendations/recalculate";
import { narrateActiveRecommendations } from "@/lib/ai/narrateRecommendations";
import type { NarrativeProvider, RecommendationNarrativeInput } from "@/lib/ai/narrativeProvider";

/**
 * Integration tests against the real seeded database (prisma/dev.db).
 *
 * A fake NarrativeProvider stands in for Claude — this is dependency
 * injection through the interface these two milestones deliberately built
 * (requirement 6: "another LLM provider could be substituted later"), not
 * a mock of the Anthropic SDK. Every real Prisma read/write in
 * narrateActiveRecommendations is exercised for real, inside a rolled-back
 * transaction.
 *
 * All 13 Milestone 1.3 seed rows already have a non-null aiNarrative, so
 * each test first runs recalculateAllRecommendations to sync fresh,
 * real ACTIVE rows (new inserts have aiNarrative: null by construction) —
 * giving narrateActiveRecommendations something genuinely eligible to
 * narrate.
 */

class FakeNarrativeProvider implements NarrativeProvider {
  calls: RecommendationNarrativeInput[] = [];

  constructor(private readonly response: string | null) {}

  async generateNarrative(input: RecommendationNarrativeInput): Promise<string | null> {
    this.calls.push(input);
    return this.response;
  }
}

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

describe("narrateActiveRecommendations (integration)", () => {
  it("narrates ACTIVE rows with no existing aiNarrative, using a fake provider", async () => {
    await runInRolledBackTransaction(async (tx) => {
      await recalculateAllRecommendations(tx);

      const provider = new FakeNarrativeProvider("This is a test narrative.");
      const result = await narrateActiveRecommendations(provider, tx);

      expect(result.totalActive).toBeGreaterThan(0);
      expect(result.narrated).toBeGreaterThan(0);
      expect(result.narrated).toBe(result.eligible);
      expect(provider.calls).toHaveLength(result.narrated);

      // Every ACTIVE row ends up with a non-null narrative: the ones this
      // call just wrote, plus any that already carried one (a synced row
      // matching a Milestone 1.3 seed example keeps its original
      // seed-authored narrative -- the sync never touches aiNarrative).
      const allActive = await tx.aIRecommendation.findMany({ where: { status: "ACTIVE" } });
      expect(allActive.every((row) => row.aiNarrative !== null)).toBe(true);

      const freshlyNarrated = allActive.filter(
        (row) => row.aiNarrative === "This is a test narrative.",
      );
      expect(freshlyNarrated).toHaveLength(result.narrated);
    });
  }, 30000);

  it("does not modify any row when the provider is unavailable (returns null)", async () => {
    await runInRolledBackTransaction(async (tx) => {
      await recalculateAllRecommendations(tx);
      const before = await tx.aIRecommendation.findMany({
        where: { status: "ACTIVE" },
        orderBy: { id: "asc" },
      });

      const provider = new FakeNarrativeProvider(null);
      const result = await narrateActiveRecommendations(provider, tx);

      expect(result.eligible).toBeGreaterThan(0);
      expect(result.narrated).toBe(0);
      expect(result.skippedProviderUnavailable).toBe(result.eligible);

      const after = await tx.aIRecommendation.findMany({
        where: { status: "ACTIVE" },
        orderBy: { id: "asc" },
      });
      expect(after).toEqual(before);
    });
  }, 30000);

  it("skips rows that already have an aiNarrative, and re-narrates them only with regenerateExisting", async () => {
    await runInRolledBackTransaction(async (tx) => {
      await recalculateAllRecommendations(tx);

      const firstPass = await narrateActiveRecommendations(
        new FakeNarrativeProvider("First pass."),
        tx,
      );
      expect(firstPass.narrated).toBeGreaterThan(0);

      const secondPass = await narrateActiveRecommendations(
        new FakeNarrativeProvider("Second pass."),
        tx,
      );
      expect(secondPass.eligible).toBe(0);
      expect(secondPass.narrated).toBe(0);

      const thirdPass = await narrateActiveRecommendations(
        new FakeNarrativeProvider("Third pass."),
        tx,
        { regenerateExisting: true },
      );
      // regenerateExisting re-narrates every ACTIVE row, including the
      // ones that already carried a narrative from the seed script and
      // were never touched by firstPass/secondPass.
      expect(thirdPass.narrated).toBe(thirdPass.totalActive);

      const rows = await tx.aIRecommendation.findMany({ where: { status: "ACTIVE" } });
      for (const row of rows) {
        expect(row.aiNarrative).toBe("Third pass.");
      }
    });
  }, 30000);

  it("counts skippedNoMatch for stale ACTIVE rows with no matching current candidate", async () => {
    await runInRolledBackTransaction(async (tx) => {
      // Without syncing first, the untouched Milestone 1.3 seed rows are
      // hand-authored examples -- some won't match a real current
      // candidate. Clear their aiNarrative so they're eligible to attempt
      // matching at all.
      await tx.aIRecommendation.updateMany({
        where: { status: "ACTIVE" },
        data: { aiNarrative: null },
      });

      const provider = new FakeNarrativeProvider("Should not be persisted for unmatched rows.");
      const result = await narrateActiveRecommendations(provider, tx);

      expect(result.skippedNoMatch).toBeGreaterThan(0);
      expect(result.eligible + result.skippedNoMatch).toBe(result.totalActive);
    });
  }, 30000);
});
