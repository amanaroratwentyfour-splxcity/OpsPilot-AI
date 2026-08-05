import { Sparkles } from "lucide-react";

/**
 * The Executive Dashboard's top-of-page identity block
 * (DESIGN_SPECIFICATION.md §2.1) — distinct from the sidebar's own
 * OpsPilot AI lockup (navigation, untouched by this phase). Permanent,
 * hardcoded product identity only — no per-dataset company name, since
 * Company metadata import doesn't exist yet (see git history for the
 * removed warehouse-name-derived "Current Company" workaround).
 */
export function CompanyBrandHeader() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1 className="text-page-title tracking-tight">OpsPilot AI</h1>
        <p className="text-sm text-muted-foreground">AI-Powered Operations Intelligence Platform</p>
      </div>
    </div>
  );
}
