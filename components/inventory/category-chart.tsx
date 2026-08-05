"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHART_AXIS_LINE_STROKE,
  CHART_AXIS_TICK_FILL,
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/chart-theme";

export function CategoryChart({ data }: { data: { category: string; count: number }[] }) {
  const chartData = data.map((d) => ({ ...d, category: d.category.replace("_", " ") }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Positions by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} strokeOpacity={0.5} />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 12, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              allowDecimals={false}
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
