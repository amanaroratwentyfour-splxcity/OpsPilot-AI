"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Check, X, Clock, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge, RecommendationStatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import type { getCopilotOverview } from "@/lib/presentation/copilotData";

type Recommendation = Awaited<ReturnType<typeof getCopilotOverview>>["items"][number];

export function RecommendationCard({
  recommendation,
  onStatusChange,
}: {
  recommendation: Recommendation;
  onStatusChange: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);

  async function updateStatus(status: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/copilot/recommendations/${recommendation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        onStatusChange(recommendation.id);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <SeverityBadge severity={recommendation.severity} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {recommendation.category}
              </p>
              {recommendation.entityLink ? (
                <Link href={recommendation.entityLink} className="font-semibold hover:underline">
                  {recommendation.entityName}
                </Link>
              ) : (
                <p className="font-semibold">{recommendation.entityName ?? "Company-wide"}</p>
              )}
            </div>
          </div>

          {recommendation.status === "ACTIVE" ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => updateStatus("ACCEPTED")}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Accept
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => updateStatus("SNOOZED")}>
                <Clock className="mr-1 h-3.5 w-3.5" />
                Snooze
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => updateStatus("DISMISSED")}>
                <X className="mr-1 h-3.5 w-3.5" />
                Dismiss
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <RecommendationStatusBadge status={recommendation.status} />
              <Button size="sm" variant="outline" disabled={pending} onClick={() => updateStatus("ACTIVE")}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Reactivate
              </Button>
            </div>
          )}
        </div>

        <p className="mt-3 text-sm text-foreground">{recommendation.justification}</p>

        {recommendation.aiNarrative && (
          <div className="mt-3">
            <button
              className="flex items-center gap-1.5 text-xs font-medium text-ai hover:underline"
              onClick={() => setShowNarrative((v) => !v)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {showNarrative ? "Hide AI Insight" : "Show AI Insight"}
            </button>
            {showNarrative && (
              <div className="mt-2 rounded-md border border-ai/20 bg-ai/[0.06] p-3 text-sm">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ai">
                  <Sparkles className="h-3 w-3" />
                  AI Insight — optional enhancement, not a substitute for the justification above
                </p>
                {recommendation.aiNarrative}
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(recommendation.createdAt)}</p>
      </CardContent>
    </Card>
  );
}
