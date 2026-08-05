"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  STATUS_CHART_COLORS,
} from "@/lib/chart-theme";

// Status-carrying chart — maps to the semantic tokens (§10.1), never the categorical palette.
const COLORS: Record<string, string> = {
  CRITICAL: STATUS_CHART_COLORS.critical,
  LOW: STATUS_CHART_COLORS.warning,
  HEALTHY: STATUS_CHART_COLORS.success,
  OVERSTOCKED: STATUS_CHART_COLORS.warning,
};

export interface StockStatusChartProps {
  counts: { CRITICAL: number; LOW: number; HEALTHY: number; OVERSTOCKED: number };
}

export function StockStatusChart({ counts }: StockStatusChartProps) {
  const data = (Object.keys(counts) as (keyof typeof counts)[])
    .map((key) => ({ name: key, value: counts[key] }))
    .filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No inventory data</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
              <Legend wrapperStyle={CHART_LEGEND_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
