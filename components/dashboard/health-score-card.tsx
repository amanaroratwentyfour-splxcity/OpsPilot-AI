"use client";

import { Activity, Info, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { KPI_DEFINITIONS, kpiCurrentInterpretation } from "@/lib/presentation/kpiDefinitions";
import { STATUS_BADGE_CLASS, KPI_CARD_HOVER_CLASS } from "@/components/dashboard/dashboard-kpi-card";
import {
  biggestHealthScoreContributors,
  listHealthScoreComponents,
  type HealthScoreComponentView,
} from "@/lib/presentation/healthScoreContributors";
import { useDashboardInsights } from "./dashboard-insights-context";

/** "Good" is the one exception to the KPI badge vocabulary (Healthy/Monitor/Critical) — reserved for this flagship composite score per the KPI polish pass. */
const STATUS_TONE = {
  good: { label: "Good", text: "text-success", badge: "bg-success/15 text-success" },
  warning: { label: "Monitor", text: "text-warning", badge: "bg-warning/15 text-warning" },
  critical: { label: "Critical", text: "text-critical", badge: "bg-critical/15 text-critical" },
  neutral: { label: "Not enough data", text: "text-foreground", badge: "bg-secondary text-secondary-foreground" },
} as const;

function statusFor(score: number | null): keyof typeof STATUS_TONE {
  if (score === null) return "neutral";
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "critical";
}

/**
 * The Executive Dashboard's flagship KPI (task 4.2 §4) — Operations
 * Health Score gets a richer treatment than the standard KpiCard: its own
 * larger card, a bespoke info panel (calculation inputs broken out per
 * component, the specific components dragging the score down, and an
 * optional AI suggestion), rather than the generic 6-field KpiInfoPopover
 * every other KPI uses.
 */
export function HealthScoreCard({
  score,
  components,
}: {
  score: number | null;
  components: Parameters<typeof listHealthScoreComponents>[0];
}) {
  const status = statusFor(score);
  const tone = STATUS_TONE[status];
  const contributors = biggestHealthScoreContributors(components);
  const componentViews = listHealthScoreComponents(components);
  const { insights } = useDashboardInsights();

  return (
    <Card className={cn("sm:col-span-2 lg:col-span-2", KPI_CARD_HOVER_CLASS)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-label uppercase text-muted-foreground">Operations Health Score</CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="About Operations Health Score"
                className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="start">
              <HealthScorePopoverContent
                score={score}
                componentViews={componentViews}
                contributors={contributors}
                aiSuggestion={insights?.healthScoreSuggestion}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Activity className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-kpi-hero tracking-tight", tone.text)}>{score !== null ? Math.round(score) : "—"}</div>
        <span className={cn(STATUS_BADGE_CLASS, "mt-2", tone.badge)}>{tone.label}</span>
        <p className="mt-2 text-caption text-muted-foreground">out of 100</p>
      </CardContent>
    </Card>
  );
}

function HealthScorePopoverContent({
  score,
  componentViews,
  contributors,
  aiSuggestion,
}: {
  score: number | null;
  componentViews: HealthScoreComponentView[];
  contributors: { label: string; value: number; weightedDeficit: number }[];
  aiSuggestion?: string | null;
}) {
  const content = KPI_DEFINITIONS.operationsHealthScore;

  return (
    <div className="space-y-3">
      <p className="text-section-title leading-snug">Operations Health Score</p>

      <div className="rounded-md bg-secondary px-3 py-2 text-sm">
        {kpiCurrentInterpretation("operationsHealthScore", score)}
      </div>

      <dl className="space-y-2.5 text-sm">
        <div>
          <dt className="text-label uppercase text-muted-foreground">Definition</dt>
          <dd className="mt-0.5 text-foreground">{content.definition}</dd>
        </div>
        <div>
          <dt className="text-label uppercase text-muted-foreground">Calculation inputs</dt>
          <dd className="mt-0.5">
            <ul className="space-y-1">
              {componentViews.map((c) => (
                <li key={c.label} className="flex items-center justify-between text-foreground">
                  <span>
                    {c.label} <span className="text-muted-foreground">({c.weightPercent}%)</span>
                  </span>
                  <span className="font-mono text-xs">{c.value !== null ? Math.round(c.value) : "n/a"}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        {contributors.length > 0 && (
          <div>
            <dt className="text-label uppercase text-muted-foreground">Biggest contributors lowering the score</dt>
            <dd className="mt-0.5 text-foreground">
              {contributors.map((c) => `${c.label} (${Math.round(c.value)}/100)`).join(", ")}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-label uppercase text-muted-foreground">Ideal range</dt>
          <dd className="mt-0.5 text-foreground">{content.idealRange}</dd>
        </div>
      </dl>

      {aiSuggestion && (
        <div className="rounded-md border border-ai/20 bg-ai/[0.06] p-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ai">
            <Sparkles className="h-3 w-3" />
            AI Suggestion
          </p>
          {aiSuggestion}
        </div>
      )}
    </div>
  );
}
