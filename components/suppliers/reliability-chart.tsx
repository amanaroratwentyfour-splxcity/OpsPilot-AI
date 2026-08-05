"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LOW_RELIABILITY_THRESHOLD } from "@/lib/domain/config";
import {
  CHART_AXIS_LINE_STROKE,
  CHART_AXIS_TICK_FILL,
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  STATUS_CHART_COLORS,
} from "@/lib/chart-theme";

export function ReliabilityChart({ data }: { data: { name: string; score: number | null }[] }) {
  const chartData = data
    .filter((d) => d.score !== null)
    .map((d) => ({ name: d.name.split(" ").slice(0, 2).join(" "), score: d.score as number }))
    .sort((a, b) => a.score - b.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier Reliability Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} strokeOpacity={0.5} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              width={120}
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
            <ReferenceLine x={LOW_RELIABILITY_THRESHOLD} stroke={STATUS_CHART_COLORS.critical} strokeDasharray="4 4" />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.score < LOW_RELIABILITY_THRESHOLD ? STATUS_CHART_COLORS.critical : CHART_COLORS[0]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
