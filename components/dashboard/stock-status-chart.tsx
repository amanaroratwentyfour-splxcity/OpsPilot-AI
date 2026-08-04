"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  LOW: "#f59e0b",
  HEALTHY: "#10b981",
  OVERSTOCKED: "#8b5cf6",
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
        <CardTitle className="text-sm font-medium">Inventory Status Distribution</CardTitle>
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
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
