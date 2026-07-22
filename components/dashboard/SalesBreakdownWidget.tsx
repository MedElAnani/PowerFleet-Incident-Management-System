"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BreakdownChannel {
  key: string;
  label: string;
  color: string;
}

export interface SalesBreakdownWidgetProps {
  title?: string;
  subtitle?: string;

  data?: Record<string, unknown>[];
  channels?: BreakdownChannel[];
}

const defaultData = [
  { day: "Mon", healthy: 12, warning: 3, breached: 1 },
  { day: "Tue", healthy: 8, warning: 2, breached: 0 },
  { day: "Wed", healthy: 15, warning: 4, breached: 2 },
  { day: "Thu", healthy: 10, warning: 1, breached: 1 },
  { day: "Fri", healthy: 18, warning: 5, breached: 3 },
  { day: "Sat", healthy: 6, warning: 1, breached: 0 },
  { day: "Sun", healthy: 4, warning: 0, breached: 0 },
];

const defaultChannels: BreakdownChannel[] = [
  { key: "healthy", label: "SLA Healthy", color: "#10b981" },
  { key: "warning", label: "SLA Warning", color: "#f59e0b" },
  { key: "breached", label: "SLA Breached", color: "#f43f5e" },
];

interface TooltipItem {
  name: string;
  value: number;
  fill: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum: number, item: TooltipItem) => sum + (item.value ?? 0), 0);

  return (
    <div className="bg-slate-900/90 text-white border border-slate-700 min-w-[140px] rounded-xl p-3 shadow-xl backdrop-blur-md text-xs">
      <p className="text-slate-400 mb-2 font-semibold tracking-wider text-[11px]">
        {label}
      </p>
      <div className="flex flex-col gap-1.5">
        {[...payload].reverse().map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: entry.fill }}
              />
              <span className="text-slate-300 font-medium">{entry.name}</span>
            </div>
            <span className="font-bold tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-700 mt-2.5 pt-2 flex justify-between font-bold">
        <span className="text-slate-400">Total</span>
        <span className="text-emerald-400">{total}</span>
      </div>
    </div>
  );
}

export function SalesBreakdownWidget({
  title = "Daily Fleet Incident Breakdown",
  subtitle = "Weekly stacked distribution across issue categories",
  data = defaultData,
  channels = defaultChannels,
}: SalesBreakdownWidgetProps) {
  return (
    <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm flex flex-col gap-4">
      <div>
        <h3 className="text-slate-900 dark:text-white text-base font-semibold">
          {title}
        </h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={22}>
            <CartesianGrid
              vertical={false}
              stroke="#334155"
              strokeDasharray="2 4"
              opacity={0.15}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <YAxis hide axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {channels.map((channel) => (
              <Bar
                key={channel.key}
                dataKey={channel.key}
                name={channel.label}
                stackId="stack"
                fill={channel.color}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {channels.map((channel) => (
          <div key={channel.key} className="flex items-center gap-1.5">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: channel.color }}
            />
            <span className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
              {channel.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SalesBreakdownWidget;
