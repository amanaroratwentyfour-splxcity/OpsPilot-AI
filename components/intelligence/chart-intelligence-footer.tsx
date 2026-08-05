"use client";

import { Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";

/**
 * Three-part chart footer (DESIGN_SPECIFICATION.md §6.3/§7.2): Summary and
 * Insight are always static/deterministic text supplied by the caller;
 * Recommendation is optional and, when present, is genuinely AI-generated
 * — visually marked with the `ai` token + sparkle + "AI" label per the
 * static-vs-dynamic contract (§7.5), and simply omitted (not shown empty)
 * when unavailable. Generic and content-agnostic so any future chart card
 * on any page can reuse it.
 *
 * Renders as its own bordered card (matching components/ui/card.tsx's
 * exact styling) rather than being injected inside the chart's own Card —
 * this keeps every existing chart component (several of which, like
 * StockStatusChart, are shared with other pages) completely untouched;
 * the footer simply sits directly beneath the chart's card as a visually
 * attached companion.
 */
export function ChartIntelligenceFooter({
  summary,
  insight,
  aiRecommendation,
  aiStatus = "idle",
}: {
  summary: string;
  insight: string;
  aiRecommendation?: string | null;
  aiStatus?: "idle" | "running" | "unavailable";
}) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border bg-card p-4 text-sm shadow-sm">
      <div>
        <p className="text-label uppercase text-muted-foreground">Summary</p>
        <p className="mt-0.5 text-foreground">{summary}</p>
      </div>
      <div>
        <p className="text-label uppercase text-muted-foreground">Insight</p>
        <p className="mt-0.5 text-foreground">{insight}</p>
      </div>

      {(aiRecommendation || aiStatus === "running") && (
        <>
          <Separator />
          <div>
            <p className="flex items-center gap-1.5 text-label uppercase text-ai">
              <Sparkles className="h-3 w-3" />
              AI Recommendation
            </p>
            <p className="mt-0.5 text-foreground">
              {aiStatus === "running" ? "Generating…" : aiRecommendation}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
