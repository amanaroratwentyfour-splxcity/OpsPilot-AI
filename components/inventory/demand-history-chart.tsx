"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import {
  CHART_AXIS_LINE_STROKE,
  CHART_AXIS_TICK_FILL,
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/chart-theme";

export function DemandHistoryChart({
  data,
}: {
  data: { periodDate: string | Date; quantitySold: number }[];
}) {
  const chartData = data.map((d) => ({ date: formatDate(d.periodDate), quantity: d.quantitySold }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Demand History</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              interval={Math.ceil(chartData.length / 10)}
            />
            <YAxis
              tick={{ fontSize: 12, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
            <Area type="monotone" dataKey="quantity" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
