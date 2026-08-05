import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { KpiInfoPopover } from "@/components/intelligence/kpi-info-popover";
import type { KpiInfoContent } from "@/lib/presentation/kpiDefinitions";

type Tone = "neutral" | "good" | "warning" | "critical";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "text-foreground",
  good: "text-success",
  warning: "text-warning",
  critical: "text-critical",
};

const TREND_BADGE_STYLES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  good: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/15 text-critical",
};

export interface KpiTrend {
  label: string;
  tone?: Tone;
}

export interface KpiInfo {
  label: string;
  content: KpiInfoContent;
  currentInterpretation: string;
}

export function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = "neutral",
  trend,
  info,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: Tone;
  /**
   * Optional status-band indicator (DESIGN_SPECIFICATION.md §7.1's "Trend").
   * No historical KPI snapshot mechanism exists yet (OPERATIONS_ENGINE_SPEC.md
   * §4.6/§4.10 both document this as a future schema gap), so this is a
   * current-value-vs-threshold label like "Healthy"/"Needs Attention", not
   * a vs-last-period delta — never fabricated history.
   */
  trend?: KpiTrend;
  /** Optional — renders the (i) info popover only when supplied. Every existing call site that omits this is visually unaffected. */
  info?: KpiInfo;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-label uppercase text-muted-foreground">{label}</CardTitle>
          {info && (
            <KpiInfoPopover label={info.label} content={info.content} currentInterpretation={info.currentInterpretation} />
          )}
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className={cn("text-kpi-hero", TONE_STYLES[tone])}>{value}</div>
          {trend && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                TREND_BADGE_STYLES[trend.tone ?? "neutral"],
              )}
            >
              {trend.label}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-caption text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
