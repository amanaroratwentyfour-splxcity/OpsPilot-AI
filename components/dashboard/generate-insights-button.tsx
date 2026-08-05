"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardInsights } from "./dashboard-insights-context";

/** Mirrors Operations Copilot's "Generate AI Insights" button pattern exactly, for the same optional, on-demand AI enrichment. */
export function GenerateInsightsButton() {
  const { status, message, generate } = useDashboardInsights();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {message && <span className="max-w-xs text-caption text-muted-foreground">{message}</span>}
      <Button size="sm" variant="outline" disabled={status === "running"} onClick={generate}>
        {status === "running" ? (
          <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-3.5 w-3.5" />
        )}
        {status === "running" ? "Generating…" : "Generate AI Insights"}
      </Button>
    </div>
  );
}
