"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InsightsStatus } from "./insights-context";

/**
 * Shared presentational "Generate AI Insights" button (Executive Dashboard,
 * Inventory Intelligence). Pure props — no hook of its own — because each
 * page's Server Component page tree can only reach its own AI context via
 * its own thin "use client" wrapper (see components/dashboard/
 * generate-insights-button.tsx and components/inventory/
 * generate-insights-button.tsx); this component is what those wrappers
 * both render, so the actual markup/styling is shared even though each
 * page keeps its own context/provider.
 */
export function GenerateInsightsButtonView({
  status,
  message,
  onGenerate,
  label = "Generate AI Insights",
  loadingLabel = "Generating…",
}: {
  status: InsightsStatus;
  message: string | null;
  onGenerate: () => void;
  /** Optional label overrides so other pages (e.g. Procurement) can reuse this exact button with page-specific wording. */
  label?: string;
  loadingLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {message && <span className="max-w-xs text-caption text-muted-foreground">{message}</span>}
      <Button size="sm" variant="outline" disabled={status === "running"} onClick={onGenerate}>
        {status === "running" ? (
          <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-3.5 w-3.5" />
        )}
        {status === "running" ? loadingLabel : label}
      </Button>
    </div>
  );
}
