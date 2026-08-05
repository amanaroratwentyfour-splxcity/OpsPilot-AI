"use client";

import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParetoCurveInfoPopover } from "./pareto-curve-info-popover";
import {
  CHART_AXIS_LINE_STROKE,
  CHART_AXIS_TICK_FILL,
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/chart-theme";

export function ParetoChart({
  data,
}: {
  data: { sku: string; usageValue: number; cumulativeValuePercent: number }[];
}) {
  const chartData = data.slice(0, 40).map((d) => ({
    sku: d.sku,
    "Usage Value": d.usageValue,
    "Cumulative %": d.cumulativeValuePercent,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          ABC Pareto Curve (top 40 SKUs by usage value)
          <ParetoCurveInfoPopover />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} strokeOpacity={0.5} />
            <XAxis
              dataKey="sku"
              tick={{ fontSize: 9, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              interval={3}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              unit="%"
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar yAxisId="left" dataKey="Usage Value" fill={CHART_COLORS[0]} />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="Cumulative %"
              stroke={CHART_COLORS[2]}
              fill={CHART_COLORS[2]}
              fillOpacity={0.15}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
