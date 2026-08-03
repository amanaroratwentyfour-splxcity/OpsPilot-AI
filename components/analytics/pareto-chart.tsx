"use client";

import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <CardTitle className="text-sm font-medium">ABC Pareto Curve (top 40 SKUs by usage value)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="sku" tick={{ fontSize: 9 }} interval={3} angle={-45} textAnchor="end" height={60} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="Usage Value" fill="#3b82f6" />
            <Area yAxisId="right" type="monotone" dataKey="Cumulative %" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
