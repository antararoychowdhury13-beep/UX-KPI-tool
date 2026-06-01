"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KPI } from "@/types/kpi";

function shortName(name: string): string {
  return name.replace(/ — .*/, "").split(" ").slice(0, 2).join(" ");
}

export function KPIBarChart({ kpis }: { kpis: KPI[] }) {
  const data = kpis.slice(0, 6).map((k) => ({
    name: shortName(k.name),
    Before: k.before_score,
    After: k.after_score,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9, fill: "var(--text3)" }}
          interval={0}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "var(--text3)" }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            fontSize: 11,
            borderRadius: 8,
            border: "1px solid var(--border)",
            fontFamily: "DM Sans, sans-serif",
          }}
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
        />
        <Legend wrapperStyle={{ fontSize: 10 }} iconType="rect" iconSize={8} />
        <Bar dataKey="Before" fill="#b4b2a9" radius={[2, 2, 0, 0]} />
        <Bar dataKey="After" fill="var(--blue)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
