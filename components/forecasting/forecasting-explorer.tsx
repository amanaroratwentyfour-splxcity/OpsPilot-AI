"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { ForecastChart } from "./forecast-chart";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { LineChart } from "lucide-react";
import type { getForecastData } from "@/lib/presentation/forecastingData";
import { KPI_DEFINITIONS, kpiCurrentInterpretation } from "@/lib/presentation/kpiDefinitions";

type ForecastData = Awaited<ReturnType<typeof getForecastData>>;

export function ForecastingExplorer({
  products,
  initialData,
}: {
  products: { id: string; sku: string; name: string }[];
  initialData: ForecastData;
}) {
  const [data, setData] = useState<ForecastData>(initialData);
  const [selectedId, setSelectedId] = useState<string>(initialData?.product.id ?? products[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [productSearch, setProductSearch] = useState("");

  function handleSelect(productId: string) {
    setSelectedId(productId);
    startTransition(async () => {
      const response = await fetch(`/api/forecasting?productId=${productId}`);
      if (response.ok) {
        setData(await response.json());
      }
    });
  }

  const normalizedSearch = productSearch.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <Select value={selectedId} onValueChange={handleSelect} onOpenChange={(open) => !open && setProductSearch("")}>
        <SelectTrigger className="w-[320px]">
          <SelectValue placeholder="Select a product" />
        </SelectTrigger>
        <SelectContent>
          {/* A plain input, not a SelectItem — stopPropagation keeps Radix's
              roving-focus/typeahead handling from stealing keystrokes typed
              here. Non-matching items stay mounted (just hidden) rather than
              being removed, so SelectValue can still resolve the currently
              selected item's label after the list is filtered. */}
          <input
            autoFocus
            placeholder="Search 203 products…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="mb-1 w-full rounded-sm border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          {products.map((p) => {
            const matches =
              normalizedSearch === "" ||
              p.sku.toLowerCase().includes(normalizedSearch) ||
              p.name.toLowerCase().includes(normalizedSearch);
            return (
              <SelectItem key={p.id} value={p.id} className={matches ? undefined : "hidden"}>
                {p.sku} — {p.name}
              </SelectItem>
            );
          })}
          {products.every(
            (p) =>
              normalizedSearch !== "" &&
              !p.sku.toLowerCase().includes(normalizedSearch) &&
              !p.name.toLowerCase().includes(normalizedSearch),
          ) && <p className="px-2 py-3 text-center text-sm text-muted-foreground">No products match &ldquo;{productSearch}&rdquo;</p>}
        </SelectContent>
      </Select>

      {isPending && <p className="text-sm text-muted-foreground">Loading forecast…</p>}

      {!isPending && data && !data.hasForecastData && (
        <EmptyState
          icon={LineChart}
          title="No forecast data for this product yet"
          description="Run Recalculate All to generate forecasts for every product."
        />
      )}

      {!isPending && data && data.hasForecastData && (
        <>
          {(() => {
            const movingAverageAccuracy =
              data.aggregateMAPE.movingAverage !== null ? 100 - data.aggregateMAPE.movingAverage : null;
            const exponentialSmoothingAccuracy =
              data.aggregateMAPE.exponentialSmoothing !== null ? 100 - data.aggregateMAPE.exponentialSmoothing : null;
            return (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <KpiCard
                  label="Moving Average Accuracy"
                  value={formatPercent(movingAverageAccuracy)}
                  subtitle={`MAPE ${formatPercent(data.aggregateMAPE.movingAverage)}`}
                  info={{
                    label: "Moving Average Accuracy",
                    content: KPI_DEFINITIONS.movingAverageAccuracy,
                    currentInterpretation: kpiCurrentInterpretation("movingAverageAccuracy", movingAverageAccuracy),
                  }}
                />
                <KpiCard
                  label="Exponential Smoothing Accuracy"
                  value={formatPercent(exponentialSmoothingAccuracy)}
                  subtitle={`MAPE ${formatPercent(data.aggregateMAPE.exponentialSmoothing)}`}
                  info={{
                    label: "Exponential Smoothing Accuracy",
                    content: KPI_DEFINITIONS.exponentialSmoothingAccuracy,
                    currentInterpretation: kpiCurrentInterpretation(
                      "exponentialSmoothingAccuracy",
                      exponentialSmoothingAccuracy,
                    ),
                  }}
                />
              </div>
            );
          })()}

          <ForecastChart series={data.series} />

          <Card>
            <CardHeader>
              <CardTitle>Weekly Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Moving Avg</TableHead>
                    <TableHead className="text-right">Exp. Smoothing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.series.map((point) => (
                    <TableRow key={String(point.periodDate)}>
                      <TableCell>{formatDate(point.periodDate)}</TableCell>
                      <TableCell className="text-right">{formatNumber(point.actual)}</TableCell>
                      <TableCell className="text-right">{formatNumber(point.movingAverage)}</TableCell>
                      <TableCell className="text-right">{formatNumber(point.exponentialSmoothing)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
