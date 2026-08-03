"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LOW_RELIABILITY_THRESHOLD } from "@/lib/domain/config";

export function ReliabilityChart({ data }: { data: { name: string; score: number | null }[] }) {
  const chartData = data
    .filter((d) => d.score !== null)
    .map((d) => ({ name: d.name.split(" ").slice(0, 2).join(" "), score: d.score as number }))
    .sort((a, b) => a.score - b.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Supplier Reliability Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
            <Tooltip />
            <ReferenceLine x={LOW_RELIABILITY_THRESHOLD} stroke="#ef4444" strokeDasharray="4 4" />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.score < LOW_RELIABILITY_THRESHOLD ? "#ef4444" : "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
