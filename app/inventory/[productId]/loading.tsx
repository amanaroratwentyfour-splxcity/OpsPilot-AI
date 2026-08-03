import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return <PageSkeleton kpiCount={3} showCharts={false} />;
}
