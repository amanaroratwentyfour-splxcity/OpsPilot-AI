"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <CardTitle className="text-sm font-medium">Warehouse Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Utilization"]} />
            <ReferenceLine y={warningThreshold} stroke="#f59e0b" strokeDasharray="4 4" />
            <ReferenceLine y={criticalThreshold} stroke="#ef4444" strokeDasharray="4 4" />
            <Bar dataKey="utilization" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
