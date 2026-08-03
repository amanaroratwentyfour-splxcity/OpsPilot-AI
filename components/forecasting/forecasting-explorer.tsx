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

  function handleSelect(productId: string) {
    setSelectedId(productId);
    startTransition(async () => {
      const response = await fetch(`/api/forecasting?productId=${productId}`);
      if (response.ok) {
        setData(await response.json());
      }
    });
  }

  return (
    <div className="space-y-6">
      <Select value={selectedId} onValueChange={handleSelect}>
        <SelectTrigger className="w-[320px]">
          <SelectValue placeholder="Select a product" />
        </SelectTrigger>
        <SelectContent>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.sku} — {p.name}
            </SelectItem>
          ))}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              label="Moving Average Accuracy"
              value={formatPercent(
                data.aggregateMAPE.movingAverage !== null ? 100 - data.aggregateMAPE.movingAverage : null,
              )}
              subtitle={`MAPE ${formatPercent(data.aggregateMAPE.movingAverage)}`}
            />
            <KpiCard
              label="Exponential Smoothing Accuracy"
              value={formatPercent(
                data.aggregateMAPE.exponentialSmoothing !== null
                  ? 100 - data.aggregateMAPE.exponentialSmoothing
                  : null,
              )}
              subtitle={`MAPE ${formatPercent(data.aggregateMAPE.exponentialSmoothing)}`}
            />
          </div>

          <ForecastChart series={data.series} />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Weekly Detail</CardTitle>
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
