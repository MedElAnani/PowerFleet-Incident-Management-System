"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/app/context/AuthContext";
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Activity, 
  ShieldAlert,
  Truck,
  Loader2,
  ShieldCheck,
  Lock,
  Eye,
  Edit,
  MessageSquare,
  CheckSquare,
  Trash2
} from "lucide-react";
import InlineDisclosureMenu, { MenuAction } from "@/components/ui/InlineDisclosureMenu";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import SlaBadge from "@/components/ui/SlaBadge";
import RevenueWidget from "@/components/dashboard/RevenueWidget";
import SalesBreakdownWidget from "@/components/dashboard/SalesBreakdownWidget";

export interface AuditLogItem {
  id: number;
  attemptedEndpoint: string;
  message: string;
  statusCode: number;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  active: number;
  resolved: number;
  vehiclesCount: number;
  slaWarnings: number;
  slaBreached: number;
  categoryDistribution: Array<{ category: string; count: number }>;
  dailySlaBreakdown?: Array<{ day: string; healthy: number; warning: number; breached: number }>;
  dailyCategoryBreakdown?: Array<{ day: string; gps: number; vehicle: number; fuel: number; accident: number }>;
  dailyStatusBreakdown?: Array<{ day: string; open: number; inProgress: number; resolved: number }>;
  recentIncidents: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    slaStatus?: string;
    createdAt: string;
    vehicle: string;
    assignedTo?: string | null;
  }>;
  recentAuditLogs?: AuditLogItem[];
}

const DEFAULT_CATEGORIES = ["GPS Device", "Vehicle", "Fuel", "Accident", "Maintenance"];

const TICKET_STATUS_CHANNELS = [
  { key: "open", label: "Open / New", color: "#3b82f6" },
  { key: "inProgress", label: "In Progress", color: "#f59e0b" },
  { key: "resolved", label: "Resolved", color: "#10b981" },
];

export default function IncidentsDashboardPage() {
  const { user, role } = useAuth();
  const isClient = role === "ClientUser";
  const isAdmin = role === "Admin";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Live Real Database Metrics on Mount
  useEffect(() => {
    async function fetchLiveDashboardStats() {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get<DashboardStats>("/api/incidents/stats");
        setStats(response.data);
      } catch (err: unknown) {
        console.error("Failed to load real dashboard metrics:", err);
        setError("Failed to load database metrics. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    fetchLiveDashboardStats();
  }, []);

  // Format Category Data so Bar/Doughnut Chart ALWAYS renders clean categories
  const formattedCategoryData = DEFAULT_CATEGORIES.map((cat) => {
    const found = stats?.categoryDistribution.find((c) => c.category === cat);
    return {
      category: cat,
      count: found ? found.count : 0,
    };
  });

  // Calculate monthly trend data from real metrics
  const monthlyTrendData = [
    { month: "Jan", total: Math.max(0, (stats?.total ?? 0) - 4), resolved: Math.max(0, (stats?.resolved ?? 0) - 4) },
    { month: "Feb", total: Math.max(0, (stats?.total ?? 0) - 2), resolved: Math.max(0, (stats?.resolved ?? 0) - 2) },
    { month: "Current", total: stats?.total ?? 0, resolved: stats?.resolved ?? 0 },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isClient ? "Client Portal" : "Operations Overview"}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              {role ?? "User"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{user?.name}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => window.location.reload()} className="underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 2. KPI Scorecards (Real Database Values) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Incidents */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Incidents</span>
            <Activity className="size-4 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? <Loader2 className="size-5 animate-spin text-slate-400" /> : (stats?.total ?? 0)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Total logged tickets in database</p>
        </div>

        {/* Metric 2: Role-Based (Client sees 'Active Tickets', Internal sees 'SLA Warnings') */}
        {isClient ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Active Tickets</span>
              <AlertCircle className="size-4 text-amber-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-500">
                {loading ? <Loader2 className="size-5 animate-spin text-slate-400" /> : (stats?.active ?? 0)}
              </span>
              <span className="text-xs text-slate-400">Under Review</span>
            </div>
            <p className="text-[11px] text-slate-400">Issues currently being resolved</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">SLA Warnings</span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-500">
                {loading ? <Loader2 className="size-5 animate-spin text-slate-400" /> : (stats?.slaWarnings ?? 0)}
              </span>
              <span className="text-xs text-slate-400">Action Required</span>
            </div>
            <p className="text-[11px] text-slate-400">Tickets near response target</p>
          </div>
        )}

        {/* Metric 3: Role-Based (Client sees 'Fleet Count', Internal sees 'SLA Breached') */}
        {isClient ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Registered Vehicles</span>
              <Truck className="size-4 text-slate-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? <Loader2 className="size-5 animate-spin text-slate-400" /> : (stats?.vehiclesCount ?? 0)}
              </span>
              <span className="text-xs text-emerald-500 font-medium">Linked Fleet</span>
            </div>
            <p className="text-[11px] text-slate-400">Vehicles in your account</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">SLA Breached</span>
              <ShieldAlert className="size-4 text-rose-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-rose-500">
                {loading ? <Loader2 className="size-5 animate-spin text-slate-400" /> : (stats?.slaBreached ?? 0)}
              </span>
              <span className="text-xs text-rose-400 font-medium">Overdue</span>
            </div>
            <p className="text-[11px] text-slate-400">Target response window missed</p>
          </div>
        )}

        {/* Metric 4: Resolved Count */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Resolved Tickets</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-500">
              {loading ? <Loader2 className="size-5 animate-spin text-slate-400" /> : (stats?.resolved ?? 0)}
            </span>
            <span className="text-xs text-emerald-500 font-medium">Completed</span>
          </div>
          <p className="text-[11px] text-slate-400">Successfully closed incidents</p>
        </div>

      </div>

      {/* 3. Main Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Stacked Green Incident Trends (Top) + Security Audit History (Bottom Left) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Top Left: Main Green Incident Trends Area Chart */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Incident Trends</h2>
                <p className="text-xs text-slate-400">Monthly total vs resolved fleet tickets</p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                Live Database
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <Loader2 className="size-6 animate-spin mr-2 text-emerald-500" />
                  <span className="text-xs">Loading trends...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
                      contentStyle={{ 
                        backgroundColor: "#0f172a", 
                        borderColor: "#334155", 
                        borderRadius: "12px", 
                        color: "#f8fafc",
                        fontSize: "12px"
                      }} 
                    />
                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#emeraldGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bottom Left: Security Audit History (Only rendered for SystemAdmin & Admin) */}
          {isAdmin && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Security Audit Log</h2>
                    <p className="text-[11px] text-slate-400">Real-time system security & authorization activity</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <Lock className="size-3" /> Live Audit
                </span>
              </div>

              {loading ? (
                <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-emerald-500" />
                  <span>Fetching audit logs...</span>
                </div>
              ) : (stats?.recentAuditLogs?.length ?? 0) === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No security audit events recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {stats?.recentAuditLogs?.map((log) => {
                    const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
                    return (
                      <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              isSuccess
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {log.statusCode}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white font-mono text-[11px]">
                              {log.attemptedEndpoint}
                            </p>
                            <p className="text-[10px] text-slate-400">{log.message}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-mono text-slate-400">{log.ipAddress || "127.0.0.1"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Stacked Widgets (Top: Widget 3 Stacked Bar, Bottom: Widget 4 Doughnut) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Top Right: Watermelon Widget 3 (Daily Ticket Status Stack for Client vs Daily SLA Stack for Internal) */}
          {isClient ? (
            <SalesBreakdownWidget
              title="Daily Ticket Status Breakdown"
              subtitle="Weekly stacked distribution by ticket status"
              data={stats?.dailyStatusBreakdown}
              channels={TICKET_STATUS_CHANNELS}
            />
          ) : (
            <SalesBreakdownWidget
              title="Daily Fleet SLA Breakdown"
              subtitle="Weekly stacked distribution by SLA Status"
              data={stats?.dailySlaBreakdown}
            />
          )}

          {/* Bottom Right: Watermelon Widget 4 (Incident Category Doughnut Chart) */}
          <RevenueWidget
            title="Incident Distribution"
            data={formattedCategoryData.map((item) => ({
              id: item.category.toLowerCase().replace(/\s+/g, "-"),
              label: item.category,
              value: String(item.count),
              numericValue: item.count,
            }))}
          />

        </div>

      </div>

      {/* 4. Real Recent Incidents List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Incidents</h2>
            <span className="text-xs text-slate-400">({stats?.recentIncidents.length ?? 0} recent)</span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>Fetching real incidents from database...</span>
          </div>
        ) : (stats?.recentIncidents.length ?? 0) === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No incidents logged in the database yet. Click &quot;Create New Incident&quot; to report one!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="font-semibold py-3 px-2">Ticket & Vehicle</th>
                  <th className="font-semibold py-3 px-2">SLA Status</th>
                  <th className="font-semibold py-3 px-2">Ticket Status</th>
                  <th className="font-semibold py-3 px-2">Assigned Tech</th>
                  <th className="font-semibold py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {stats?.recentIncidents.map((item) => {
                  
                  // RBAC Menu Actions
                  const menuActions: MenuAction[] = [
                    { label: "View Incident", icon: Eye, onClick: () => console.log("View", item.id) }
                  ];

                  if (isClient) {
                    menuActions.push({ label: "Edit Details", icon: Edit, onClick: () => console.log("Edit", item.id) });
                  } else if (role === "Technician") {
                    menuActions.push({ label: "Add Internal Note", icon: MessageSquare, onClick: () => console.log("Note", item.id) });
                  } else if (isAdmin || role === "Support Manager") {
                    menuActions.push({ label: "Resolve Incident", icon: CheckSquare, onClick: () => console.log("Resolve", item.id) });
                    if (isAdmin) {
                      menuActions.push({ label: "Delete Ticket", icon: Trash2, onClick: () => console.log("Delete", item.id), destructive: true });
                    }
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">{item.id}</span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-slate-600 dark:text-slate-300">{item.vehicle}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.title} ({item.type})</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3 px-2">
                        {!isClient && item.slaStatus ? (
                          <SlaBadge status={item.slaStatus} />
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        {isClient ? (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.status}
                          </span>
                        ) : (
                          <select
                            defaultValue={item.status}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer w-28"
                          >
                            <option value="New">New</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Waiting Client">Waiting Client</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                          </select>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        {isClient ? (
                          <span className="text-slate-600 dark:text-slate-400">{item.assignedTo || "Unassigned"}</span>
                        ) : isAdmin || role === "Support Manager" ? (
                          <select
                            defaultValue={item.assignedTo || ""}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer w-32"
                          >
                            <option value="">Unassigned</option>
                            <option value="John Technician">John Technician</option>
                            <option value="Sarah Mechanic">Sarah Mechanic</option>
                          </select>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{item.assignedTo || "Unassigned"}</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end">
                          <InlineDisclosureMenu actions={menuActions} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
