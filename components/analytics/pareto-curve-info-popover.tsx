"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Inline explainer for the ABC Pareto Curve chart — mirrors
 * components/inventory/health-score-info-popover.tsx exactly (same
 * pattern, different content).
 */
export function ParetoCurveInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="About the Pareto Curve"
          className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <p className="text-section-title leading-snug">Pareto Curve</p>
          <p className="text-sm text-foreground">
            A chart combining each SKU&apos;s usage value (bars) with the running cumulative share of total usage
            value (line) — the same ranking behind ABC Classification, shown visually.
          </p>
          <p className="text-sm text-foreground">
            It illustrates the 80/20 principle: typically a small share of products (Class A) account for roughly
            80% of total usage value, while the majority of products (Class C) contribute comparatively little.
          </p>
          <p className="text-sm text-foreground">
            Read it left to right: the steep early rise in the cumulative line shows how quickly a few top SKUs add
            up. Businesses use this to prioritize which products deserve the tightest inventory control and
            attention.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
