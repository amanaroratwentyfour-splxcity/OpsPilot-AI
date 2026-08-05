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

/** Standardized status badge chrome — identical height/padding/radius/typography across every Executive Dashboard KPI card. */
export const STATUS_BADGE_CLASS = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";

const TREND_BADGE_STYLES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  good: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/15 text-critical",
};

/** Subtle lift/shadow/border on hover, scoped to the Executive Dashboard's KPI cards. Max 2px movement, reduced-motion-safe via the global override in globals.css. */
export const KPI_CARD_HOVER_CLASS =
  "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg";

export interface KpiTrend {
  label: string;
  tone?: Tone;
}

export interface KpiInfo {
  label: string;
  content: KpiInfoContent;
  currentInterpretation: string;
}

/**
 * Executive Dashboard-only KPI card (final polish pass before freezing the
 * dashboard). Deliberately a separate component from the shared
 * `components/kpi-card.tsx` — that component is reused by Inventory,
 * Procurement, Suppliers, Analytics, Copilot, and Forecasting, none of
 * which this polish pass was asked to touch, so this file owns the
 * standardized icon sizing, title/info spacing, number-first hierarchy,
 * badge vocabulary, and hover treatment without risking any visual change
 * on those other pages.
 */
export function DashboardKpiCard({
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
   * Status-band indicator (DESIGN_SPECIFICATION.md §7.1's "Trend").
   * No historical KPI snapshot mechanism exists yet (OPERATIONS_ENGINE_SPEC.md
   * §4.6/§4.10 both document this as a future schema gap), so this is a
   * current-value-vs-threshold label like "Healthy"/"Monitor", not a
   * vs-last-period delta — never fabricated history.
   */
  trend?: KpiTrend;
  info?: KpiInfo;
}) {
  return (
    <Card className={KPI_CARD_HOVER_CLASS}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-label uppercase text-muted-foreground">{label}</CardTitle>
          {info && (
            <KpiInfoPopover label={info.label} content={info.content} currentInterpretation={info.currentInterpretation} />
          )}
        </div>
        {Icon && <Icon className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-kpi-hero tracking-tight", TONE_STYLES[tone])}>{value}</div>
        {trend && (
          <span className={cn(STATUS_BADGE_CLASS, "mt-2", TREND_BADGE_STYLES[trend.tone ?? "neutral"])}>
            {trend.label}
          </span>
        )}
        {subtitle && <p className="mt-2 text-caption text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
