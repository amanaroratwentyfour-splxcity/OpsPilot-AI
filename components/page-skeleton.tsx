import { Skeleton } from "@/components/ui/skeleton";

/** Generic loading skeleton approximating "KPI row + chart row + table" —
 *  the shape shared by every module page — used by each route's loading.tsx. */
export function PageSkeleton({ kpiCount = 4, showCharts = true }: { kpiCount?: number; showCharts?: boolean }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))` }}
      >
        {Array.from({ length: kpiCount }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>

      {showCharts && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      <Skeleton className="h-96 w-full" />
    </div>
  );
}
