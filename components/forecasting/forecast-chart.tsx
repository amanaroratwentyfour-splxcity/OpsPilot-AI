"use client";

import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export interface ForecastSeriesPoint {
  periodDate: string | Date;
  actual: number | null;
  movingAverage: number | null;
  exponentialSmoothing: number | null;
}

export function ForecastChart({ series }: { series: ForecastSeriesPoint[] }) {
  const chartData = series.map((point) => ({
    date: formatDate(point.periodDate),
    Actual: point.actual,
    "Moving Average": point.movingAverage,
    "Exponential Smoothing": point.exponentialSmoothing,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Actual vs. Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Actual" stroke="#0f172a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Moving Average" stroke="#3b82f6" strokeDasharray="4 2" dot={false} />
            <Line
              type="monotone"
              dataKey="Exponential Smoothing"
              stroke="#f59e0b"
              strokeDasharray="4 2"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
