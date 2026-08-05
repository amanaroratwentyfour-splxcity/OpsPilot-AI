import type { LucideIcon } from "lucide-react";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface OperationalBriefSection {
  label: string;
  text: string;
}

/**
 * Shared "Operational Brief" layout (DESIGN_SPECIFICATION.md §7.3) — the
 * deterministic, templated-prose summary every page opens with, per the
 * Executive Dashboard's original "Executive Brief" pattern. Purely a
 * layout/presentation shell: every section's text is supplied by the
 * caller's own page-specific brief builder (e.g. lib/presentation/
 * executiveBrief.ts, lib/presentation/inventoryBrief.ts) — this component
 * never computes anything itself, so a new page adopting the pattern only
 * ever needs to write a new brief builder, never a new layout.
 */
export function OperationalBrief({
  title = "Today's Operational Brief",
  icon: Icon = ClipboardList,
  sections,
  caption = "Deterministic summary generated from current engine outputs.",
}: {
  title?: string;
  icon?: LucideIcon;
  sections: OperationalBriefSection[];
  caption?: string;
}) {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <Icon className="h-4 w-4 text-primary" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {sections.map(({ label, text }) => (
            <div key={label}>
              <p className="text-label uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm text-foreground">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-caption text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}
