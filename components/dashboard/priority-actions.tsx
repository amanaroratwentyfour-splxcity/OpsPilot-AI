import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import type { DashboardSummary } from "@/lib/presentation/dashboardData";

/**
 * "Priority Actions" — a compact strip of the 3 highest-severity active
 * recommendations, positioned between the KPI row and the charts per the
 * dashboard's visual hierarchy. Distinct from the fuller "Recommendations"
 * list further down the page (which shows more items with Accept/Snooze/
 * Dismiss-equivalent context and a "Why?" explanation): this is a
 * scan-in-five-seconds call to action, not a browsable list.
 */
export function PriorityActions({ recommendations }: { recommendations: DashboardSummary["topRecommendations"] }) {
  const top3 = recommendations.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <CardTitle>Priority Actions</CardTitle>
        </div>
        <Link href="/copilot" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Open Operations Copilot
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {top3.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No urgent action required right now" />
        ) : (
          <ul className="divide-y">
            {top3.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <SeverityBadge severity={item.severity} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.entityName ?? item.category}</p>
                  <p className="line-clamp-1 text-caption text-muted-foreground">{item.justification}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
