"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import { EngineerData } from "@/types";
import { useState } from "react";

interface ImpactChartProps {
  engineers: EngineerData[];
  selectedLogin: string | null;
  onSelect: (login: string) => void;
}

export function ImpactChart({
  engineers,
  selectedLogin,
  onSelect,
}: ImpactChartProps) {
  const [chartType, setChartType] = useState<"scatter" | "breakdown">(
    "breakdown"
  );

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-dim)" }}>
          Impact Overview
        </h3>
        <div className="flex gap-1">
          {(["breakdown", "scatter"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className="text-[10px] px-2 py-1 rounded-md transition-colors capitalize"
              style={{
                background:
                  chartType === t
                    ? "var(--color-accent-soft)"
                    : "transparent",
                color:
                  chartType === t
                    ? "var(--color-accent)"
                    : "var(--color-text-dim)",
              }}
            >
              {t === "breakdown" ? "Score Breakdown" : "Delivery vs Quality"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[180px]">
        {chartType === "scatter" ? (
          <ScatterPlot
            engineers={engineers}
            selectedLogin={selectedLogin}
            onSelect={onSelect}
          />
        ) : (
          <BreakdownChart
            engineers={engineers}
            selectedLogin={selectedLogin}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  );
}

function ScatterPlot({
  engineers,
  selectedLogin,
  onSelect,
}: ImpactChartProps) {
  const data = engineers.map((e) => ({
    x: e.delivery * 100,
    y: e.quality * 100,
    login: e.login,
    overall: e.overall * 100,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
        />
        <XAxis
          dataKey="x"
          name="Delivery"
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "var(--color-text-dim)" }}
          label={{
            value: "Delivery →",
            position: "bottom",
            offset: 0,
            style: { fontSize: 10, fill: "var(--color-text-dim)" },
          }}
        />
        <YAxis
          dataKey="y"
          name="Quality"
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "var(--color-text-dim)" }}
          label={{
            value: "Quality →",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { fontSize: 10, fill: "var(--color-text-dim)" },
          }}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div
                className="rounded-lg p-2 text-xs border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <p className="font-semibold">{d.login}</p>
                <p style={{ color: "var(--color-text-muted)" }}>
                  Delivery: {d.x.toFixed(0)} · Quality: {d.y.toFixed(0)}
                </p>
              </div>
            );
          }}
        />
        <Scatter
          data={data}
          cursor="pointer"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(d: any) => d?.login && onSelect(d.login)}
        >
          {data.map((entry) => (
            <Cell
              key={entry.login}
              fill={
                entry.login === selectedLogin
                  ? "var(--color-accent)"
                  : "var(--color-text-dim)"
              }
              opacity={entry.login === selectedLogin ? 1 : 0.7}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function BreakdownChart({
  engineers,
  selectedLogin,
  onSelect,
}: ImpactChartProps) {
  const data = engineers.map((e) => ({
    name: e.login,
    delivery: Math.round(e.delivery * 35),
    quality: Math.round(e.quality * 30),
    collaboration: Math.round(e.collaboration * 20),
    breadth: Math.round(e.breadth * 15),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
        barCategoryGap="20%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "var(--color-text-dim)" }}
          axisLine={{ stroke: "var(--color-border)" }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--color-text-dim)" }}
          axisLine={{ stroke: "var(--color-border)" }}
          label={{
            value: "Weighted Score",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { fontSize: 10, fill: "var(--color-text-dim)" },
          }}
        />
        <Tooltip
          content={({ payload, label }) => {
            if (!payload?.length) return null;
            const total = payload.reduce(
              (s, p) => s + (Number(p.value) || 0),
              0
            );
            return (
              <div
                className="rounded-lg p-2 text-xs border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
              >
                <p className="font-semibold mb-1">
                  {label}{" "}
                  <span style={{ color: "var(--color-text-dim)" }}>
                    ({total})
                  </span>
                </p>
                {payload.map((p) => (
                  <p key={p.name} style={{ color: p.color as string }}>
                    {p.name}: {p.value}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10 }}
          iconSize={8}
        />
        <Bar
          dataKey="delivery"
          name="Delivery"
          stackId="a"
          fill="var(--color-delivery)"
          cursor="pointer"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(d: any) => d?.name && onSelect(d.name)}
        />
        <Bar
          dataKey="quality"
          name="Quality"
          stackId="a"
          fill="var(--color-quality)"
          cursor="pointer"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(d: any) => d?.name && onSelect(d.name)}
        />
        <Bar
          dataKey="collaboration"
          name="Collaboration"
          stackId="a"
          fill="var(--color-collaboration)"
          cursor="pointer"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(d: any) => d?.name && onSelect(d.name)}
        />
        <Bar
          dataKey="breadth"
          name="Breadth"
          stackId="a"
          fill="var(--color-breadth)"
          cursor="pointer"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(d: any) => d?.name && onSelect(d.name)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
