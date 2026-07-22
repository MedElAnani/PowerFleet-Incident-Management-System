import React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";

export type SlaState =
  | "Healthy"
  | "Warning_Response"
  | "Warning_Resolution"
  | "Breached_Response"
  | "Breached_Resolution"
  | "Breached_Both"
  | string;

interface SlaBadgeProps {
  status?: SlaState;
  className?: string;
  showIcon?: boolean;
}

export function getSlaBadgeConfig(status?: SlaState) {
  switch (status) {
    case "Healthy":
      return {
        label: "SLA Healthy",
        colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30",
        dotClass: "bg-emerald-500",
        icon: ShieldCheck,
      };
    case "Warning_Response":
      return {
        label: "Response Warning",
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30",
        dotClass: "bg-amber-500 animate-pulse",
        icon: AlertTriangle,
      };
    case "Warning_Resolution":
      return {
        label: "Resolution Warning",
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30",
        dotClass: "bg-amber-500 animate-pulse",
        icon: AlertTriangle,
      };
    case "Breached_Response":
      return {
        label: "Response Breached",
        colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30",
        dotClass: "bg-rose-500 animate-pulse",
        icon: ShieldAlert,
      };
    case "Breached_Resolution":
      return {
        label: "Resolution Breached",
        colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30",
        dotClass: "bg-rose-500 animate-pulse",
        icon: ShieldAlert,
      };
    case "Breached_Both":
      return {
        label: "SLA Breached Both",
        colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/30",
        dotClass: "bg-purple-500 animate-pulse",
        icon: ShieldAlert,
      };
    default:
      return {
        label: status || "SLA Healthy",
        colorClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 dark:border-slate-500/30",
        dotClass: "bg-slate-400",
        icon: ShieldCheck,
      };
  }
}

export default function SlaBadge({ status, className, showIcon = true }: SlaBadgeProps) {
  const config = getSlaBadgeConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border select-none transition-colors",
        config.colorClass,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dotClass)} />
      {showIcon && <Icon className="size-3 shrink-0 opacity-80" />}
      <span>{config.label}</span>
    </span>
  );
}
