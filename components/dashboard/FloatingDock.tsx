"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Truck, 
  AlertTriangle, 
  CheckSquare, 
  BarChart3, 
  Settings,
  type LucideIcon
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number;
}

export interface FloatingDockProps {
  items?: NavItem[];
  className?: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/incidents/dashboard", icon: LayoutDashboard },
  { id: "incidents", label: "Incidents", href: "/incidents", icon: AlertTriangle, badgeCount: 3 },
  { id: "my-tasks", label: "My Tasks", href: "/my-tasks", icon: CheckSquare },
  { id: "fleet", label: "Vehicles", href: "/vehicles", icon: Truck },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

/**
 * Floating Dock Navigation Component
 * Tactile floating navigation pill synced with Next.js App Router URLs.
 */
export default function FloatingDock({
  items = DEFAULT_NAV_ITEMS,
  className,
}: Readonly<FloatingDockProps>) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "fixed bottom-7 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-auto",
        className
      )}
    >
      <nav
        aria-label="Main Navigation"
        className="flex items-center gap-2 p-2.5 rounded-full bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800/90 shadow-2xl backdrop-blur-2xl text-slate-400"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/incidents" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 px-5 py-3 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer select-none",
                isActive
                  ? "text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200 dark:hover:text-slate-100"
              )}
            >
              {/* Active Tab Sliding Indicator */}
              {isActive && (
                <motion.div
                  layoutId="active-dock-pill"
                  className="absolute inset-0 bg-emerald-400 rounded-full shadow-md shadow-emerald-500/25"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 28,
                  }}
                />
              )}

              {/* Icon & Label Content */}
              <span className="relative z-10 flex items-center gap-2.5">
                <Icon className="size-5 shrink-0" />
                
                {/* Active item expands to reveal label */}
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="whitespace-nowrap font-bold tracking-wide text-xs"
                  >
                    {item.label}
                  </motion.span>
                )}

                {/* Badge Indicator */}
                {Boolean(item.badgeCount && item.badgeCount > 0) && (
                  <span
                    className={cn(
                      "flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-bold px-1.5",
                      isActive
                        ? "bg-slate-950 text-emerald-400"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    )}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
