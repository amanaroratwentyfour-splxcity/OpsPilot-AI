import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getCopilotOverview } from "@/lib/presentation/copilotData";

/**
 * Integration tests against the real seeded database. getCopilotOverview
 * is read-only (never writes to AIRecommendation), so — unlike the
 * write-touching domain-layer orchestrators elsewhere in this test suite —
 * these run directly against the live `prisma` singleton with no
 * rolled-back-transaction wrapper needed: there's nothing to roll back.
 *
 * Regression coverage for the Operations Copilot filter bug: kpis used to
 * be computed from queries that ignored the severity/category filters
 * entirely (always scoped to status=ACTIVE company-wide), so the KPI row
 * never matched what the filtered list below it actually showed.
 */
describe("getCopilotOverview (integration)", () => {
  it("kpis.activeTotal always equals the number of items actually returned, for any severity/category filter", async () => {
    const filterCombinations = [
      {},
      { category: "INVENTORY" as const },
      { category: "SUPPLIER" as const },
      { severity: "CRITICAL" as const },
      { severity: "WARNING" as const },
      { severity: "WARNING" as const, category: "INVENTORY" as const },
      { severity: "CRITICAL" as const, category: "SUPPLIER" as const },
    ];

    for (const filters of filterCombinations) {
      const { items, kpis } = await getCopilotOverview(filters);
      expect(kpis.activeTotal).toBe(items.length);
      expect(kpis.activeSeverity.CRITICAL + kpis.activeSeverity.WARNING + kpis.activeSeverity.INFO).toBe(
        items.length,
      );
    }
  });

  it("narrows activeTotal when a category filter is applied, rather than always returning the company-wide count", async () => {
    const unfiltered = await getCopilotOverview({});
    const inventoryOnly = await getCopilotOverview({ category: "INVENTORY" as const });

    expect(inventoryOnly.kpis.activeTotal).toBeLessThan(unfiltered.kpis.activeTotal);
    expect(inventoryOnly.kpis.activeTotal).toBeGreaterThan(0);
    expect(inventoryOnly.items.every((item) => item.category === "INVENTORY")).toBe(true);
  });

  it("narrows activeSeverity when a severity filter is applied", async () => {
    const critical = await getCopilotOverview({ severity: "CRITICAL" as const });

    expect(critical.kpis.activeSeverity.WARNING).toBe(0);
    expect(critical.kpis.activeSeverity.INFO).toBe(0);
    expect(critical.kpis.activeSeverity.CRITICAL).toBeGreaterThan(0);
    expect(critical.items.every((item) => item.severity === "CRITICAL")).toBe(true);
  });

  it("combines severity and category filters with AND semantics, matching the filtered list", async () => {
    const combined = await getCopilotOverview({ severity: "WARNING" as const, category: "INVENTORY" as const });

    expect(combined.items.every((item) => item.severity === "WARNING" && item.category === "INVENTORY")).toBe(
      true,
    );
    expect(combined.kpis.activeTotal).toBe(combined.items.length);
  });

  it("scopes byStatus to the category filter too, not just the ACTIVE-only list", async () => {
    // The seeded dataset has exactly one DISMISSED row, and it's INVENTORY
    // category — so filtering to a different category must show 0 dismissed,
    // proving byStatus is no longer a company-wide, filter-blind count.
    const inventory = await getCopilotOverview({ category: "INVENTORY" as const });
    const supplier = await getCopilotOverview({ category: "SUPPLIER" as const });

    expect(inventory.kpis.byStatus.DISMISSED).toBeGreaterThan(0);
    expect(supplier.kpis.byStatus.DISMISSED).toBe(0);
  });

  it("returns an empty items array and zeroed kpis for a filter combination that matches nothing", async () => {
    // DEMAND-category recommendations in the seed data are all INFO
    // severity, so DEMAND + CRITICAL should match nothing.
    const { items, kpis } = await getCopilotOverview({
      severity: "CRITICAL" as const,
      category: "DEMAND" as const,
    });

    expect(items).toEqual([]);
    expect(kpis.activeTotal).toBe(0);
    expect(kpis.narratedCoveragePercent).toBe(0);
  });
});

/**
 * Regression coverage for the Operations Copilot status-transition bug:
 * Accept/Snooze/Dismiss write correctly via PATCH
 * /api/copilot/recommendations/:id (untouched — see that route file), but
 * the client component displaying the list never re-rendered afterward
 * because of the same stale-state bug covered above, so the count/KPI
 * updates never appeared to happen. These tests exercise the same
 * status-transition + re-read cycle the UI performs, proving the data
 * layer keeps ACTIVE list membership, byStatus counts, and status-scoped
 * retrieval ("view it later") all correct — with no `db` param on
 * getCopilotOverview to run inside a rolled-back transaction, each test
 * creates its own disposable fixture row and deletes it in `afterEach`.
 */
describe("recommendation status transitions (integration)", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    while (createdIds.length > 0) {
      const id = createdIds.pop()!;
      await prisma.aIRecommendation.delete({ where: { id } }).catch(() => {});
    }
  });

  async function createActiveFixture() {
    const created = await prisma.aIRecommendation.create({
      data: {
        category: "INVENTORY",
        severity: "WARNING",
        status: "ACTIVE",
        metricJustification: "TEST FIXTURE — safe to delete (copilotData.test.ts)",
      },
    });
    createdIds.push(created.id);
    return created;
  }

  it.each([
    ["ACCEPTED", "Accept"],
    ["SNOOZED", "Snooze"],
    ["DISMISSED", "Dismiss"],
  ] as const)("%s: removes the item from the ACTIVE list and updates byStatus", async (status, _label) => {
    const fixture = await createActiveFixture();

    const before = await getCopilotOverview({});
    expect(before.items.some((item) => item.id === fixture.id)).toBe(true);
    const activeCountBefore = before.kpis.byStatus.ACTIVE;
    const targetStatusCountBefore = before.kpis.byStatus[status];

    await prisma.aIRecommendation.update({ where: { id: fixture.id }, data: { status } });

    const after = await getCopilotOverview({});
    expect(after.items.some((item) => item.id === fixture.id)).toBe(false);
    expect(after.kpis.byStatus.ACTIVE).toBe(activeCountBefore - 1);
    expect(after.kpis.byStatus[status]).toBe(targetStatusCountBefore + 1);
  });

  it("a Snoozed recommendation is correctly retrievable when viewed later via the status filter", async () => {
    const fixture = await createActiveFixture();
    await prisma.aIRecommendation.update({ where: { id: fixture.id }, data: { status: "SNOOZED" } });

    const snoozedView = await getCopilotOverview({ status: "SNOOZED" as const });
    const found = snoozedView.items.find((item) => item.id === fixture.id);

    expect(found).toBeDefined();
    expect(found?.status).toBe("SNOOZED");
    expect(found?.justification).toBe(fixture.metricJustification);
  });

  it("a Dismissed recommendation never reappears in the default (ACTIVE) view, even combined with filters", async () => {
    const fixture = await createActiveFixture();
    await prisma.aIRecommendation.update({ where: { id: fixture.id }, data: { status: "DISMISSED" } });

    const activeInventory = await getCopilotOverview({ category: "INVENTORY" as const });
    expect(activeInventory.items.some((item) => item.id === fixture.id)).toBe(false);
  });
});
