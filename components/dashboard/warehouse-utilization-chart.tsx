"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHART_AXIS_LINE_STROKE,
  CHART_AXIS_TICK_FILL,
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  STATUS_CHART_COLORS,
} from "@/lib/chart-theme";

export interface WarehouseUtilizationChartProps {
  data: { warehouseName: string; utilizationPercent: number | null }[];
  warningThreshold: number;
  criticalThreshold: number;
}

export function WarehouseUtilizationChart({
  data,
  warningThreshold,
  criticalThreshold,
}: WarehouseUtilizationChartProps) {
  const chartData = data.map((d) => ({
    name: d.warehouseName.replace("NovaFoods ", "").replace(" Distribution Center", ""),
    utilization: d.utilizationPercent ?? 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Warehouse Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} strokeOpacity={0.5} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              unit="%"
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              cursor={{ fill: "hsl(var(--muted))" }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, "Utilization"]}
            />
            <ReferenceLine y={warningThreshold} stroke={STATUS_CHART_COLORS.warning} strokeDasharray="4 4" />
            <ReferenceLine y={criticalThreshold} stroke={STATUS_CHART_COLORS.critical} strokeDasharray="4 4" />
            <Bar dataKey="utilization" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
