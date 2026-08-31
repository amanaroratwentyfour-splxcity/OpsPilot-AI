import { AlertTriangle, CheckCircle2, Sparkles, Percent } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { FilterSelect } from "@/components/filter-select";
import { CopilotExplorer } from "@/components/copilot/copilot-explorer";
import { getCopilotOverview } from "@/lib/presentation/copilotData";
import {
  RECOMMENDATION_SEVERITIES,
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_STATUSES,
} from "@/lib/presentation/constants";
import { formatNumber, formatPercent } from "@/lib/format";
import { matchEnumValue } from "@/lib/api/http";
import { RecommendationCategory, RecommendationSeverity, RecommendationStatus } from "@/lib/generated/prisma";

export default async function CopilotPage({
  searchParams,
}: {
  searchParams: { severity?: string; category?: string; status?: string };
}) {
  const { items, kpis } = await getCopilotOverview({
    severity: matchEnumValue(searchParams.severity, Object.values(RecommendationSeverity)),
    category: matchEnumValue(searchParams.category, Object.values(RecommendationCategory)),
    status: matchEnumValue(searchParams.status, Object.values(RecommendationStatus)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Copilot"
        description="Deterministic recommendations from every engine, with optional AI-generated insights."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active Recommendations"
          value={formatNumber(kpis.activeTotal)}
          icon={Sparkles}
          tone={kpis.activeSeverity.CRITICAL > 0 ? "critical" : "neutral"}
        />
        <KpiCard
          label="Critical"
          value={formatNumber(kpis.activeSeverity.CRITICAL)}
          icon={AlertTriangle}
          tone={kpis.activeSeverity.CRITICAL > 0 ? "critical" : "neutral"}
        />
        <KpiCard label="Accepted" value={formatNumber(kpis.byStatus.ACCEPTED)} icon={CheckCircle2} />
        <KpiCard label="AI-Narrated Coverage" value={formatPercent(kpis.narratedCoveragePercent)} icon={Percent} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect paramKey="severity" label="Severity" allLabel="All Severities" options={RECOMMENDATION_SEVERITIES} />
        <FilterSelect paramKey="category" label="Category" allLabel="All Categories" options={RECOMMENDATION_CATEGORIES} />
        {/* Defaults to ACTIVE (matching getCopilotOverview's own default)
            so Snoozed/Dismissed/Accepted recommendations aren't a dead end
            — this is the only way to see them again after acting on them. */}
        <FilterSelect paramKey="status" label="Status" allLabel="Active" options={RECOMMENDATION_STATUSES.filter((s) => s !== "ACTIVE")} />
      </div>

      <CopilotExplorer initialItems={items} />
    </div>
  );
}
