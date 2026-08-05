import { OperationalBrief } from "@/components/intelligence/operational-brief";
import type { InventoryBriefSections } from "@/lib/presentation/inventoryBrief";

const SECTION_LABELS: { key: keyof InventoryBriefSections; label: string }[] = [
  { key: "inventoryHealth", label: "Inventory Health" },
  { key: "criticalStockouts", label: "Critical Stockouts" },
  { key: "excessInventory", label: "Excess Inventory" },
  { key: "warehousePerformance", label: "Warehouse Performance" },
  { key: "inventoryTurnover", label: "Inventory Turnover" },
  { key: "recommendedPriority", label: "Recommended Priority" },
];

/**
 * "Today's Inventory Brief" — the first thing an Inventory Manager reads
 * on this page (DESIGN_SPECIFICATION.md §7.3/§9.1), same pattern as the
 * Executive Dashboard's "Today's Operational Brief"
 * (components/dashboard/executive-brief.tsx): a thin mapping from this
 * page's own section builder (lib/presentation/inventoryBrief.ts) onto the
 * shared OperationalBrief layout. Every sentence is deterministic,
 * template-filled prose — no LLM call, no hardcoded company/industry text.
 */
export function InventoryBrief({ sections }: { sections: InventoryBriefSections }) {
  return (
    <OperationalBrief
      title="Today's Inventory Brief"
      sections={SECTION_LABELS.map(({ key, label }) => ({ label, text: sections[key] }))}
    />
  );
}
