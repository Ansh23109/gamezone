"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { formatCurrency } from "@/lib/format";

const GRID_COLOR = "#26262f";
const AXIS_COLOR = "#6b6b78";
const ACCENT = "#7c5cff";

function ChartTooltip({ active, payload, label, valueFormatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs shadow-xl">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium text-foreground">
          {p.name ? `${p.name}: ` : ""}
          {valueFormatter ? valueFormatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export function RevenueAreaChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
        <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} cursor={{ stroke: GRID_COLOR }} />
        <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill="url(#revFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BookingsLineChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID_COLOR }} />
        <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const FORMATTERS: Record<string, (v: number) => string> = {
  currency: (v: number) => formatCurrency(v),
  hours: (v: number) => `${v}h`,
  number: (v: number) => `${v}`,
};

export function CategoryBarChart({
  data,
  format = "number",
  height = 240,
  layout = "vertical",
}: {
  data: { name: string; value: number; color?: string }[];
  format?: "currency" | "hours" | "number";
  height?: number;
  layout?: "vertical" | "horizontal";
}) {
  const valueFormatter = FORMATTERS[format];
  if (data.length === 0) {
    return <div className="flex h-[240px] items-center justify-center text-xs text-muted-2">No data for this range</div>;
  }
  if (layout === "horizontal") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
          <XAxis type="number" stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
          <YAxis dataKey="name" type="category" stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} width={90} />
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color || ACCENT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="name" stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} width={40} tickFormatter={valueFormatter} />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color || ACCENT} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HourlyBarChart({ data }: { data: { hour: number; value: number }[] }) {
  const chartData = data.map((d) => ({
    label: `${d.hour % 12 === 0 ? 12 : d.hour % 12}${d.hour < 12 ? "a" : "p"}`,
    value: d.value,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS_COLOR} fontSize={10} tickLine={false} axisLine={false} interval={1} />
        <YAxis stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#f59e0b" />
      </BarChart>
    </ResponsiveContainer>
  );
}
