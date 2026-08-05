"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Inline explainer for the 0–100 Health Score column/field, shared between
 * the Inventory list table and the product detail page's Stock Status
 * table (DESIGN_SPECIFICATION.md §9.1's "unexplained 0–100 scores"
 * closure) — kept inside components/inventory/ since nothing outside this
 * module currently shows a health-score column.
 */
export function HealthScoreInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="About the Health score"
          className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-2">
          <p className="text-section-title leading-snug">Health Score</p>
          <p className="text-sm text-foreground">
            A 0–100 score for how healthy this position&apos;s stock level is, relative to its reorder point. Peaks at
            100 around 2.3x the reorder point; penalizes running low more steeply than running high.
          </p>
          <dl className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">80–100</dt>
              <dd className="text-success">Healthy</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">60–79</dt>
              <dd className="text-warning">Needs attention</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Below 60</dt>
              <dd className="text-critical">At risk</dd>
            </div>
          </dl>
        </div>
      </PopoverContent>
    </Popover>
  );
}
