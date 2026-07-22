"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface CategorySource {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  fill?: string;
  opacity?: number;
}

export interface RevenueWidgetProps {
  title?: string;
  data?: CategorySource[];
}

const defaultData: CategorySource[] = [
  {
    id: "gps",
    label: "GPS Device",
    value: "42",
    numericValue: 42,
    fill: "#10b981",
    opacity: 1,
  },
  {
    id: "vehicle",
    label: "Vehicle",
    value: "26",
    numericValue: 26,
    fill: "#3b82f6",
    opacity: 0.85,
  },
  {
    id: "fuel",
    label: "Fuel Anomaly",
    value: "16",
    numericValue: 16,
    fill: "#f59e0b",
    opacity: 0.7,
  },
  {
    id: "accident",
    label: "Accident",
    value: "10",
    numericValue: 10,
    fill: "#f43f5e",
    opacity: 0.8,
  },
];

export function RevenueWidget({
  title = "Incident Breakdown",
  data = defaultData,
}: RevenueWidgetProps) {
  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      ...item,
      fill: item.fill || "#10b981",
      opacity: item.opacity ?? 1,
    }));
  }, [data]);

  return (
    <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-slate-900 dark:text-white text-base font-semibold">
          {title}
        </h3>
        <p className="text-xs text-slate-400">Distribution by event type</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative size-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="95%"
                paddingAngle={4}
                dataKey="numericValue"
                stroke="none"
                cornerRadius={4}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.id || index}`}
                    fill={entry.fill}
                    fillOpacity={entry.opacity}
                    className="cursor-pointer transition-all duration-300 outline-none hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="border border-slate-700 bg-slate-900/90 text-white flex flex-col gap-1 rounded-lg p-2 text-xs shadow-lg backdrop-blur-md">
                        <span className="text-slate-400 text-[10px] font-semibold">
                          {payload[0].payload.label}
                        </span>
                        <span className="font-bold">
                          {payload[0].payload.value} tickets
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          {chartData.map((item) => (
            <div
              key={item.id}
              className="flex w-full items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {item.label}
                </span>
              </div>
              <span className="text-slate-900 dark:text-white font-bold tabular-nums">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RevenueWidget;
