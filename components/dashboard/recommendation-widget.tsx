import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import type { DashboardSummary } from "@/lib/presentation/dashboardData";

export function RecommendationWidget({
  recommendations,
}: {
  recommendations: DashboardSummary["topRecommendations"];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Top Recommendations</CardTitle>
        <Link href="/copilot" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No active recommendations"
            description="Every metric is within its healthy range."
          />
        ) : (
          <ul className="divide-y">
            {recommendations.map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <SeverityBadge severity={r.severity} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.entityName ?? r.category}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{r.justification}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
