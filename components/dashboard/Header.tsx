"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  ShieldCheck, 
  User, 
  Building2, 
  ChevronDown,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  /** Optional current page or section title */
  title?: string;
  /** Search query state */
  searchQuery?: string;
  /** Callback fired when user types in search input */
  onSearchChange?: (query: string) => void;
  /** Unread notification count */
  unreadNotificationsCount?: number;
}

export default function Header({
  title = "Overview",
  searchQuery = "",
  onSearchChange,
  unreadNotificationsCount = 3,
}: Readonly<HeaderProps>) {
  const router = useRouter();
  const { user, role } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Generate User Initials (e.g. "Med El Anani" -> "MA")
  const getInitials = (name?: string) => {
    if (!name) return "PF";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Handle Logout Execution
  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // Ignore logout API failures and force redirect
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  // Role Badge Color Mapping
  const getRoleBadgeStyle = (userRole?: string | null) => {
    switch (userRole) {
      case "Admin":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "Support Manager":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Technician":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        
        {/* 1. Left Section: Logo & Page Title */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 select-none">
            <span className="hidden font-extrabold tracking-tighter text-slate-900 dark:text-white sm:inline-block text-lg">
              POWER FLEET <span className="text-emerald-500 dark:text-emerald-400">IMS</span>
            </span>
          </div>

          <div className="hidden h-5 w-px bg-slate-200 dark:bg-slate-800 md:block" />

          {/* Dynamic Active Section Title */}
          <h1 className="text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300 capitalize">
            {title}
          </h1>
        </div>

        {/* 2. Center Section: Global Command Search Bar */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 size-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search incidents, vehicles, IMEIs... (Press ⌘K)"
              className="w-full rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 py-1.5 pl-10 pr-12 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <kbd className="absolute right-3 pointer-events-none hidden select-none items-center gap-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-1.5 font-mono text-[10px] font-medium text-slate-400 sm:flex">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* 3. Right Section: Controls & Profile Menu */}
        <div className="flex items-center gap-3">

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex size-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            aria-label="Toggle Theme"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative flex size-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950 shadow-sm animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl z-50"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Notifications
                    </span>
                    <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {unreadNotificationsCount} Unread
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <p className="font-semibold text-slate-900 dark:text-slate-200">SLA Warning: Ticket #104</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Response window expires in 15 mins.</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <p className="font-semibold text-slate-900 dark:text-slate-200">New Incident Logged</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Vehicle RAM-402 reported GPS offline.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* User Profile Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 rounded-full p-1 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 transition-all cursor-pointer select-none"
            >
              {/* Avatar initials */}
              <div className="flex size-8 items-center justify-center rounded-full bg-slate-900 dark:bg-emerald-400 text-slate-100 dark:text-slate-950 font-bold text-xs shadow-sm">
                {getInitials(user?.name)}
              </div>
              <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform duration-200 mr-1", isProfileOpen && "rotate-180")} />
            </button>

            {/* Profile Dropdown Content */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl z-50 text-xs"
                >
                  {/* User Profile Summary Header */}
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 mb-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {user?.name ?? "User Account"}
                      </p>
                      <span className={cn("px-2 py-0.5 rounded-full font-bold text-[10px] border", getRoleBadgeStyle(role))}>
                        {role ?? "User"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>

                    {/* Role-Specific Detail Highlights */}
                    {user?.details?.companyName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 dark:text-emerald-400 font-medium pt-1">
                        <Building2 className="size-3 shrink-0" />
                        <span className="truncate">{user.details.companyName}</span>
                      </div>
                    )}
                    {user?.details?.specialty && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-500 font-medium pt-1">
                        <Sparkles className="size-3 shrink-0" />
                        <span className="truncate">{user.details.specialty}</span>
                      </div>
                    )}
                  </div>

                  {/* Menu Action Items */}
                  <div className="space-y-0.5 p-1">
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                      <User className="size-3.5 text-slate-400" />
                      <span>Account Profile</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                      <ShieldCheck className="size-3.5 text-slate-400" />
                      <span>Security & Sessions</span>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1" />

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors font-semibold cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </header>
  );
}
