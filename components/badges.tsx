import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  ERROR: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  WARNING:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  INFO: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", SEVERITY_STYLES[severity])}>
      {severity}
    </Badge>
  );
}

const STOCK_STATUS_STYLES: Record<string, string> = {
  CRITICAL: SEVERITY_STYLES.CRITICAL,
  LOW: SEVERITY_STYLES.WARNING,
  HEALTHY:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  OVERSTOCKED:
    "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
};

export function StockStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("font-medium", STOCK_STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}

const PO_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  SUBMITTED: SEVERITY_STYLES.INFO,
  APPROVED: SEVERITY_STYLES.INFO,
  IN_TRANSIT: SEVERITY_STYLES.WARNING,
  RECEIVED: STOCK_STATUS_STYLES.HEALTHY,
  CANCELLED: SEVERITY_STYLES.CRITICAL,
};

export function PurchaseOrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", PO_STATUS_STYLES[status])}>
      {status.replace("_", " ")}
    </Badge>
  );
}

const ABC_CLASS_STYLES: Record<string, string> = {
  A: STOCK_STATUS_STYLES.HEALTHY,
  B: SEVERITY_STYLES.INFO,
  C: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export function ABCClassBadge({ abcClass }: { abcClass: string | null }) {
  if (!abcClass) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("font-medium", ABC_CLASS_STYLES[abcClass])}>
      Class {abcClass}
    </Badge>
  );
}

const RECOMMENDATION_STATUS_STYLES: Record<string, string> = {
  ACTIVE: SEVERITY_STYLES.INFO,
  ACCEPTED: STOCK_STATUS_STYLES.HEALTHY,
  DISMISSED: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  SNOOZED: SEVERITY_STYLES.WARNING,
};

export function RecommendationStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", RECOMMENDATION_STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}

/** Color-coded 0-100 score, used for Health Score / Reliability Score / etc. */
export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  const style =
    score >= 80
      ? STOCK_STATUS_STYLES.HEALTHY
      : score >= 60
        ? SEVERITY_STYLES.WARNING
        : SEVERITY_STYLES.CRITICAL;
  return (
    <Badge variant="outline" className={cn("font-medium", style)}>
      {Math.round(score)}
    </Badge>
  );
}
