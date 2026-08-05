"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LOW_RELIABILITY_THRESHOLD } from "@/lib/domain/config";

/**
 * Inline explainer for the 0-100 Supplier Reliability score — mirrors
 * components/inventory/health-score-info-popover.tsx exactly (same
 * pattern, different metric).
 */
export function ReliabilityScoreInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="About the Reliability score"
          className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-2">
          <p className="text-section-title leading-snug">Reliability Score</p>
          <p className="text-sm text-foreground">
            An equal-weighted average of three delivery-performance components: On-Time Delivery Rate, Lead Time
            Consistency, and Price Stability. Only computed once a supplier has enough received orders to be
            meaningful.
          </p>
          <dl className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{LOW_RELIABILITY_THRESHOLD}+</dt>
              <dd className="text-success">Trusted supplier</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Below {LOW_RELIABILITY_THRESHOLD}</dt>
              <dd className="text-critical">Flagged as at-risk</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            A score below the threshold means orders with this supplier carry elevated risk of late or inconsistent
            delivery — worth reviewing before placing new orders.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
