import { Sparkles } from "lucide-react";

/**
 * The Executive Dashboard's top-of-page identity block
 * (DESIGN_SPECIFICATION.md §2.1) — distinct from the sidebar's own
 * OpsPilot AI lockup (navigation, untouched by this phase). "OpsPilot AI"
 * and its tagline are permanent, hardcoded product identity; the company
 * name is the one dynamic value, passed in from whatever the currently
 * loaded dataset resolves to (see lib/presentation/companyIdentity.ts) —
 * never a literal company name in this file.
 */
export function CompanyBrandHeader({ companyName }: { companyName: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-page-title tracking-tight">OpsPilot AI</h1>
          <p className="text-sm text-muted-foreground">AI-Powered Operations Intelligence Platform</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-label uppercase text-muted-foreground">Current Company</p>
        <p className="text-section-title leading-snug">{companyName}</p>
      </div>
    </div>
  );
}
