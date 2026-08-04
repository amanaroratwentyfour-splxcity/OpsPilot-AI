"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "./recommendation-card";
import { EmptyState } from "@/components/empty-state";
import type { getCopilotOverview } from "@/lib/presentation/copilotData";

type Overview = Awaited<ReturnType<typeof getCopilotOverview>>;

export function CopilotExplorer({ initialItems }: { initialItems: Overview["items"] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [narrateStatus, setNarrateStatus] = useState<"idle" | "running" | "done" | "unavailable">("idle");
  const [narrateMessage, setNarrateMessage] = useState<string | null>(null);

  // The Server Component re-fetches and passes a new `initialItems` array
  // whenever the URL's filters change or router.refresh() runs (status
  // change, recalculation) — without this, `items` would stay frozen at
  // whatever it was on first mount, since useState()'s argument only seeds
  // the initial value and is ignored on subsequent re-renders.
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function handleStatusChange(id: string) {
    // This list is always scoped to a single status (the page's `status`
    // filter, or ACTIVE by default) — any status change, including
    // reactivating a Snoozed/Dismissed item back to ACTIVE, moves the item
    // out of whichever status is currently being viewed, so it's always
    // removed from view here rather than conditionally kept.
    setItems((prev) => prev.filter((item) => item.id !== id));
    router.refresh();
  }

  async function handleGenerateNarratives() {
    setNarrateStatus("running");
    setNarrateMessage(null);
    try {
      const response = await fetch("/api/copilot/narrate", { method: "POST" });
      const result = await response.json();
      if (result.narrated > 0) {
        setNarrateStatus("done");
        setNarrateMessage(`Generated ${result.narrated} AI insight${result.narrated === 1 ? "" : "s"}.`);
        router.refresh();
      } else {
        setNarrateStatus("unavailable");
        setNarrateMessage(
          "No new AI insights were generated. This usually means Claude is not configured (ANTHROPIC_API_KEY), or every eligible recommendation already has one — recommendations work fully either way.",
        );
      }
    } catch {
      setNarrateStatus("unavailable");
      setNarrateMessage("AI insight generation is unavailable right now — recommendations still work normally.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <p className="text-sm font-medium">AI Narrative Insights</p>
          <p className="text-xs text-muted-foreground">
            Optional. Turns the deterministic justification into a short, plain-English explanation via Claude.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {narrateMessage && (
            <span className="max-w-xs text-xs text-muted-foreground">{narrateMessage}</span>
          )}
          <Button size="sm" variant="outline" disabled={narrateStatus === "running"} onClick={handleGenerateNarratives}>
            {narrateStatus === "running" ? (
              <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-3.5 w-3.5" />
            )}
            Generate AI Insights
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Sparkles} title="No recommendations match these filters" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <RecommendationCard key={item.id} recommendation={item} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
