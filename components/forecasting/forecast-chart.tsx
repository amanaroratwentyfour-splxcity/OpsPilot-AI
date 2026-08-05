"use client";

import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import {
  CHART_AXIS_LINE_STROKE,
  CHART_AXIS_TICK_FILL,
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/chart-theme";

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
        <CardTitle>Actual vs. Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} cursor={{ stroke: CHART_AXIS_LINE_STROKE }} />
            <Legend wrapperStyle={CHART_LEGEND_STYLE} />
            <Line type="monotone" dataKey="Actual" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Moving Average" stroke={CHART_COLORS[0]} strokeDasharray="4 2" dot={false} />
            <Line
              type="monotone"
              dataKey="Exponential Smoothing"
              stroke={CHART_COLORS[2]}
              strokeDasharray="4 2"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
