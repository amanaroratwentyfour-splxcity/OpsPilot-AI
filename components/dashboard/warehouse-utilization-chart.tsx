"use client";

import type { ReactNode } from "react";
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
  /** Optional — renders next to the title only when supplied (e.g. an info popover). Every existing call site that omits this is visually unaffected. */
  titleAction?: ReactNode;
}

/**
 * Shortens a warehouse name for the X-axis tick only (the full name stays
 * in the underlying data, so the tooltip — which reads straight from the
 * data, not the tick — still shows it in full). Generic pattern match, not
 * a hardcoded company name: takes whatever single word immediately
 * precedes "Distribution Center" and appends "DC", so it works for any
 * imported dataset following that facility-naming convention and falls
 * back to the untouched name otherwise.
 */
function shortenWarehouseLabel(name: string): string {
  const match = name.match(/(\S+)\s+Distribution Center$/i);
  return match ? `${match[1]} DC` : name;
}

export function WarehouseUtilizationChart({
  data,
  warningThreshold,
  criticalThreshold,
  titleAction,
}: WarehouseUtilizationChartProps) {
  const chartData = data.map((d) => ({
    name: d.warehouseName,
    utilization: d.utilizationPercent ?? 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Warehouse Utilization
          {titleAction}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 24, right: 8, left: -16, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} strokeOpacity={0.5} />
            <XAxis
              dataKey="name"
              tickFormatter={shortenWarehouseLabel}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={50}
              tick={{ fontSize: 11, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: CHART_AXIS_TICK_FILL }}
              axisLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              tickLine={{ stroke: CHART_AXIS_LINE_STROKE }}
              allowDecimals={false}
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
