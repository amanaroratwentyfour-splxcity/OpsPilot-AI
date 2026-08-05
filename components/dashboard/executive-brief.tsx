import { OperationalBrief } from "@/components/intelligence/operational-brief";
import type { ExecutiveBriefSections } from "@/lib/presentation/executiveBrief";

const SECTION_LABELS: { key: keyof ExecutiveBriefSections; label: string }[] = [
  { key: "overallStatus", label: "Overall Status" },
  { key: "inventory", label: "Inventory" },
  { key: "supplierPerformance", label: "Supplier Performance" },
  { key: "forecasting", label: "Forecasting" },
  { key: "procurement", label: "Procurement" },
  { key: "recommendedPriority", label: "Recommended Priority" },
];

/**
 * "Today's Operational Brief" — the first thing a user reads on the
 * dashboard (DESIGN_SPECIFICATION.md §7.3/§8.1). Every sentence is
 * deterministic, template-filled prose from buildExecutiveBrief — no LLM
 * call, no company-specific hardcoding. Thin mapping from
 * ExecutiveBriefSections onto the shared OperationalBrief layout
 * (components/intelligence/operational-brief.tsx) — Phase 5 extracted that
 * layout from this file's original implementation so Inventory
 * Intelligence's own brief could reuse it; this file's rendered output is
 * unchanged.
 */
export function ExecutiveBrief({ sections }: { sections: ExecutiveBriefSections }) {
  return <OperationalBrief sections={SECTION_LABELS.map(({ key, label }) => ({ label, text: sections[key] }))} />;
}
