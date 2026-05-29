"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsChartsProps = {
  data: {
    name: string;
    attendance: number;
    homework: number;
    grades: number;
  }[];
};

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="attendance" name="Attendance %" fill="var(--chart-1)" />
          <Bar dataKey="homework" name="Homework %" fill="var(--chart-2)" />
          <Bar dataKey="grades" name="Avg Grade" fill="var(--chart-3)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
