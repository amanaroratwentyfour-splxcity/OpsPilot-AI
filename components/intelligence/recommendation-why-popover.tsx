"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { RecommendationExplanation } from "@/lib/presentation/recommendationExplain";

/**
 * "Why?" transparency popover for a recommendation card
 * (DESIGN_SPECIFICATION.md §7.4) — which engine produced it, the exact
 * trigger condition, expected impact, and confidence (stated honestly as
 * "not tracked" rather than fabricated, since AIRecommendation has no
 * confidence field). Generic and content-agnostic: takes only the already-
 * computed explanation, no recommendation-shaped object, so it's reusable
 * anywhere a recommendation is rendered — the dashboard's condensed widget
 * today, Operations Copilot's full cards in a future phase.
 */
export function RecommendationWhyPopover({ explanation }: { explanation: RecommendationExplanation }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5" />
          Why?
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <dl className="space-y-2.5 text-sm">
          <div>
            <dt className="text-label uppercase text-muted-foreground">Engine</dt>
            <dd className="mt-0.5 font-medium text-foreground">{explanation.engine}</dd>
          </div>
          <div>
            <dt className="text-label uppercase text-muted-foreground">Trigger condition</dt>
            <dd className="mt-0.5 text-foreground">{explanation.triggerCondition}</dd>
          </div>
          <div>
            <dt className="text-label uppercase text-muted-foreground">Expected impact if unresolved</dt>
            <dd className="mt-0.5 text-foreground">{explanation.expectedImpact}</dd>
          </div>
          <div>
            <dt className="text-label uppercase text-muted-foreground">Confidence</dt>
            <dd className="mt-0.5 text-muted-foreground">{explanation.confidenceNote}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}
