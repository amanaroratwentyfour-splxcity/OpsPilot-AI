import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 * dashboard (DESIGN_SPECIFICATION.md §7.3/§8.1), sectioned per the
 * product spec rather than a flat bullet list. Every sentence is
 * deterministic, template-filled prose from buildExecutiveBrief — no LLM
 * call, no company-specific hardcoding.
 */
export function ExecutiveBrief({ sections }: { sections: ExecutiveBriefSections }) {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <ClipboardList className="h-4 w-4 text-primary" />
        <CardTitle>Today&apos;s Operational Brief</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {SECTION_LABELS.map(({ key, label }) => (
            <div key={key}>
              <p className="text-label uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm text-foreground">{sections[key]}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-caption text-muted-foreground">
          Deterministic summary generated from current engine outputs.
        </p>
      </CardContent>
    </Card>
  );
}
