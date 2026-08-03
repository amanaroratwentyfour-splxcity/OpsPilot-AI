"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export function DemandHistoryChart({
  data,
}: {
  data: { periodDate: string | Date; quantitySold: number }[];
}) {
  const chartData = data.map((d) => ({ date: formatDate(d.periodDate), quantity: d.quantitySold }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Weekly Demand History</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.ceil(chartData.length / 10)} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="quantity" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
