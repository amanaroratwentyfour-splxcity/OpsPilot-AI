import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * DESIGN_SPECIFICATION.md §3.3/§6.9: every status badge in the product maps
 * to exactly one of four semantic tokens — critical, warning, success, or
 * primary (the spec's "info") — at ~15% background opacity with full-opacity
 * text of the same hue. Purely neutral/non-alarming states (DRAFT, DISMISSED,
 * Class C) use `secondary`, the low-emphasis neutral fill, never a fifth
 * ad-hoc hue. No component in this file hardcodes a color value.
 */
const TONE_STYLES = {
  critical: "bg-critical/15 text-critical border-critical/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  success: "bg-success/15 text-success border-success/30",
  info: "bg-primary/15 text-primary border-primary/30",
  neutral: "bg-secondary text-secondary-foreground border-transparent",
} as const;

type Tone = keyof typeof TONE_STYLES;

const SEVERITY_TONES: Record<string, Tone> = {
  CRITICAL: "critical",
  ERROR: "critical",
  WARNING: "warning",
  INFO: "info",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TONE_STYLES[SEVERITY_TONES[severity]])}>
      {severity}
    </Badge>
  );
}

const STOCK_STATUS_TONES: Record<string, Tone> = {
  CRITICAL: "critical",
  LOW: "warning",
  HEALTHY: "success",
  // Consolidated onto `warning` per the spec's four-token rule (§3.3) rather
  // than a fifth ad-hoc hue — overstock is a "needs attention" state, same
  // family as low stock, just at the other end of the range.
  OVERSTOCKED: "warning",
};

export function StockStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("font-medium", TONE_STYLES[STOCK_STATUS_TONES[status]])}>
      {status}
    </Badge>
  );
}

const PO_STATUS_TONES: Record<string, Tone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  APPROVED: "info",
  IN_TRANSIT: "warning",
  RECEIVED: "success",
  CANCELLED: "critical",
};

export function PurchaseOrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TONE_STYLES[PO_STATUS_TONES[status]])}>
      {status.replace("_", " ")}
    </Badge>
  );
}

const ABC_CLASS_TONES: Record<string, Tone> = {
  A: "success",
  B: "info",
  C: "neutral",
};

export function ABCClassBadge({ abcClass }: { abcClass: string | null }) {
  if (!abcClass) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("font-medium", TONE_STYLES[ABC_CLASS_TONES[abcClass]])}>
      Class {abcClass}
    </Badge>
  );
}

const RECOMMENDATION_STATUS_TONES: Record<string, Tone> = {
  ACTIVE: "info",
  ACCEPTED: "success",
  DISMISSED: "neutral",
  SNOOZED: "warning",
};

export function RecommendationStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TONE_STYLES[RECOMMENDATION_STATUS_TONES[status]])}>
      {status}
    </Badge>
  );
}

/** Color-coded 0-100 score, used for Health Score / Reliability Score / etc. */
export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  const tone: Tone = score >= 80 ? "success" : score >= 60 ? "warning" : "critical";
  return (
    <Badge variant="outline" className={cn("font-medium", TONE_STYLES[tone])}>
      {Math.round(score)}
    </Badge>
  );
}
