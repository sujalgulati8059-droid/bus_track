import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#eab308", "#22d3ee", "#facc15", "#a855f7", "#4ade80", "#f472b6", "#60a5fa"];

export default function RegionChart({ data = [] }) {
  if (!data.length) return null;
  const chartData = data.map((d) => ({ name: d._id || "Other", count: d.count }));

  return (
    <div className="glass rounded-2xl p-5 border border-black/10">
      <h3 className="font-bold text-black mb-4">Routes by Region</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 12,
              fontSize: 12,
              color: "#0f172a",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={900} animationEasing="ease-out">
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
