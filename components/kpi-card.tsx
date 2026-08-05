import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "warning" | "critical";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "text-foreground",
  good: "text-success",
  warning: "text-warning",
  critical: "text-critical",
};

export function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-label uppercase text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-kpi-hero", TONE_STYLES[tone])}>{value}</div>
        {subtitle && <p className="mt-1 text-caption text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
