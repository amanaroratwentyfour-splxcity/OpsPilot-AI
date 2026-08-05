"use client";

import { Info, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { KpiInfoContent } from "@/lib/presentation/kpiDefinitions";

/**
 * Generic KPI info affordance (DESIGN_SPECIFICATION.md §7.1) — an `(i)`
 * button that opens a lightweight popover with a fixed 6-section
 * structure. Deliberately content-agnostic (plain string/string[] props,
 * no dashboard-specific types) so any future page's KpiCard can reuse it
 * without depending on Executive Dashboard code.
 *
 * Every field here is static, deterministic copy except
 * `currentInterpretation`, which is visually unmarked (no AI badge)
 * because it's a template sentence filled with the live value, not an
 * AI-generated observation — see kpiDefinitions.ts's kpiCurrentInterpretation.
 */
export function KpiInfoPopover({
  label,
  content,
  currentInterpretation,
}: {
  label: string;
  content: KpiInfoContent;
  currentInterpretation: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`About ${label}`}
          className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <p className="text-section-title leading-snug">{label}</p>

          <div className="rounded-md bg-secondary px-3 py-2 text-sm">{currentInterpretation}</div>

          <dl className="space-y-2.5 text-sm">
            <div>
              <dt className="text-label uppercase text-muted-foreground">Definition</dt>
              <dd className="mt-0.5 text-foreground">{content.definition}</dd>
            </div>
            <div>
              <dt className="text-label uppercase text-muted-foreground">Why it matters</dt>
              <dd className="mt-0.5 text-foreground">{content.whyItMatters}</dd>
            </div>
            <div>
              <dt className="text-label uppercase text-muted-foreground">How it&apos;s calculated</dt>
              <dd className="mt-0.5 text-foreground">{content.howCalculated}</dd>
            </div>
            <div>
              <dt className="text-label uppercase text-muted-foreground">Ideal range</dt>
              <dd className="mt-0.5 text-foreground">{content.idealRange}</dd>
            </div>
            <div>
              <dt className="text-label uppercase text-muted-foreground">How to improve it</dt>
              <dd className="mt-0.5 text-foreground">
                <ul className="list-inside list-disc space-y-1">
                  {content.howToImprove.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </dd>
            </div>
            {content.whatIfIgnored && (
              <div>
                <dt className="text-label uppercase text-muted-foreground">What happens if ignored</dt>
                <dd className="mt-0.5 text-foreground">{content.whatIfIgnored}</dd>
              </div>
            )}
          </dl>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Optional AI-generated addendum, shown appended to a KpiInfoPopover's
 *  content only when generated — see the static-vs-dynamic contract in
 *  DESIGN_SPECIFICATION.md §7.5. Its own small trigger keeps AI content
 *  opt-in and clearly separated from the static panel above. */
export function KpiInfoAiSuggestion({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-md border border-ai/20 bg-ai/[0.06] p-3 text-sm">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ai">
        <Sparkles className="h-3 w-3" />
        AI Suggestion
      </p>
      {text}
    </div>
  );
}
