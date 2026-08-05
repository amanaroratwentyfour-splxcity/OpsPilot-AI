"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Inline explainer for the Warehouse Utilization chart — mirrors
 * components/inventory/health-score-info-popover.tsx exactly (same
 * pattern, different content).
 */
export function WarehouseUtilizationInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="About Warehouse Utilization"
          className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-2">
          <p className="text-section-title leading-snug">Warehouse Utilization</p>
          <p className="text-sm text-foreground">
            How full each warehouse is, as a percentage of its total storage capacity currently occupied by
            on-hand inventory.
          </p>
          <dl className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Too low</dt>
              <dd className="text-foreground">Space and capital sit idle</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Too high</dt>
              <dd className="text-critical">Little room for incoming stock</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            A warehouse near or above its critical threshold may struggle to receive new purchase orders, directly
            affecting procurement and delivery planning.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
