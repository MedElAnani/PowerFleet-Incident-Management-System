import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { db } from "@/db";
import { incidents, clients, vehicles, security_audit_events } from "@/db/schema";
import { eq, ne, or, inArray, count, isNull, and, desc } from "drizzle-orm";
import { withAudit } from "@/lib/utils/audit";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  return withAudit(req, 'GET /incidents/stats', async () => {
    const currentUser = req.user!;
    const isClient = currentUser.role === "ClientUser";

    try {
      let clientVehicleIds: number[] = [];

      // If ClientUser, fetch only their company's vehicle IDs
      if (isClient) {
        const clientRecord = await db.query.clients.findFirst({
          where: eq(clients.userId, currentUser.userId),
        });

        if (clientRecord) {
          const clientVehicles = await db
            .select({ id: vehicles.id })
            .from(vehicles)
            .where(and(eq(vehicles.clientId, clientRecord.userId), isNull(vehicles.deletedAt)));

          clientVehicleIds = clientVehicles.map((v) => v.id);
        }

        // If client has no vehicles, return zeroed metrics immediately
        if (clientVehicleIds.length === 0) {
          return NextResponse.json({
            total: 0,
            active: 0,
            resolved: 0,
            vehiclesCount: 0,
            slaWarnings: 0,
            slaBreached: 0,
            categoryDistribution: [],
            dailySlaBreakdown: [
              { day: "Mon", healthy: 0, warning: 0, breached: 0 },
              { day: "Tue", healthy: 0, warning: 0, breached: 0 },
              { day: "Wed", healthy: 0, warning: 0, breached: 0 },
              { day: "Thu", healthy: 0, warning: 0, breached: 0 },
              { day: "Fri", healthy: 0, warning: 0, breached: 0 },
              { day: "Sat", healthy: 0, warning: 0, breached: 0 },
              { day: "Sun", healthy: 0, warning: 0, breached: 0 },
            ],
            dailyCategoryBreakdown: [
              { day: "Mon", gps: 0, vehicle: 0, fuel: 0, accident: 0 },
              { day: "Tue", gps: 0, vehicle: 0, fuel: 0, accident: 0 },
              { day: "Wed", gps: 0, vehicle: 0, fuel: 0, accident: 0 },
              { day: "Thu", gps: 0, vehicle: 0, fuel: 0, accident: 0 },
              { day: "Fri", gps: 0, vehicle: 0, fuel: 0, accident: 0 },
              { day: "Sat", gps: 0, vehicle: 0, fuel: 0, accident: 0 },
              { day: "Sun", gps: 0, vehicle: 0, fuel: 0, accident: 0 },
            ],
            dailyStatusBreakdown: [
              { day: "Mon", open: 0, inProgress: 0, resolved: 0 },
              { day: "Tue", open: 0, inProgress: 0, resolved: 0 },
              { day: "Wed", open: 0, inProgress: 0, resolved: 0 },
              { day: "Thu", open: 0, inProgress: 0, resolved: 0 },
              { day: "Fri", open: 0, inProgress: 0, resolved: 0 },
              { day: "Sat", open: 0, inProgress: 0, resolved: 0 },
              { day: "Sun", open: 0, inProgress: 0, resolved: 0 },
            ],
            recentIncidents: [],
            recentAuditLogs: [],
          });
        }
      }

      // Base query filter
      const baseFilter = isClient
        ? inArray(incidents.vehicleId, clientVehicleIds)
        : undefined;

      // 1. Total Incidents Count
      const [totalResult] = await db
        .select({ total: count() })
        .from(incidents)
        .where(baseFilter);

      // 2. Active Incidents Count
      const [activeResult] = await db
        .select({ active: count() })
        .from(incidents)
        .where(
          and(
            baseFilter,
            inArray(incidents.status, ["New", "Open", "In Progress", "Waiting Client", "Waiting Technician"])
          )
        );

      // 3. Resolved Incidents Count
      const [resolvedResult] = await db
        .select({ resolved: count() })
        .from(incidents)
        .where(
          and(
            baseFilter,
            inArray(incidents.status, ["Resolved", "Closed"])
          )
        );

      // 4. SLA Warnings & Breaches (for internal users)
      const [slaWarningResult] = await db
        .select({ count: count() })
        .from(incidents)
        .where(
          and(
            baseFilter,
            inArray(incidents.slaStatus, ["Warning_Response", "Warning_Resolution"])
          )
        );

      const [slaBreachedResult] = await db
        .select({ count: count() })
        .from(incidents)
        .where(
          and(
            baseFilter,
            inArray(incidents.slaStatus, ["Breached_Response", "Breached_Resolution", "Breached_Both"])
          )
        );

      // 5. Category Distribution (Group by type)
      const categoryRows = await db
        .select({
          category: incidents.type,
          count: count(),
        })
        .from(incidents)
        .where(baseFilter)
        .groupBy(incidents.type);

      // 6. Fetch All Incidents for Daily SLA, Category & Status Breakdown calculations
      const allIncidents = await db
        .select({
          slaStatus: incidents.slaStatus,
          status: incidents.status,
          type: incidents.type,
          createdAt: incidents.createdAt,
        })
        .from(incidents)
        .where(baseFilter);

      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      
      const dailySlaMap: Record<string, { healthy: number; warning: number; breached: number }> = {
        Mon: { healthy: 0, warning: 0, breached: 0 },
        Tue: { healthy: 0, warning: 0, breached: 0 },
        Wed: { healthy: 0, warning: 0, breached: 0 },
        Thu: { healthy: 0, warning: 0, breached: 0 },
        Fri: { healthy: 0, warning: 0, breached: 0 },
        Sat: { healthy: 0, warning: 0, breached: 0 },
        Sun: { healthy: 0, warning: 0, breached: 0 },
      };

      const dailyCatMap: Record<string, { gps: number; vehicle: number; fuel: number; accident: number }> = {
        Mon: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Tue: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Wed: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Thu: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Fri: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Sat: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
        Sun: { gps: 0, vehicle: 0, fuel: 0, accident: 0 },
      };

      const dailyStatusMap: Record<string, { open: number; inProgress: number; resolved: number }> = {
        Mon: { open: 0, inProgress: 0, resolved: 0 },
        Tue: { open: 0, inProgress: 0, resolved: 0 },
        Wed: { open: 0, inProgress: 0, resolved: 0 },
        Thu: { open: 0, inProgress: 0, resolved: 0 },
        Fri: { open: 0, inProgress: 0, resolved: 0 },
        Sat: { open: 0, inProgress: 0, resolved: 0 },
        Sun: { open: 0, inProgress: 0, resolved: 0 },
      };

      allIncidents.forEach((inc) => {
        const d = inc.createdAt ? new Date(inc.createdAt) : new Date();
        const dayName = daysOfWeek[d.getDay()];
        if (!dailySlaMap[dayName]) return;

        // SLA breakdown
        const sla = inc.slaStatus || "Healthy";
        if (sla.startsWith("Breached")) {
          dailySlaMap[dayName].breached += 1;
        } else if (sla.startsWith("Warning")) {
          dailySlaMap[dayName].warning += 1;
        } else {
          dailySlaMap[dayName].healthy += 1;
        }

        // Category breakdown
        const type = (inc.type || "").toLowerCase();
        if (type.includes("gps")) {
          dailyCatMap[dayName].gps += 1;
        } else if (type.includes("vehicle") || type.includes("defect") || type.includes("engine")) {
          dailyCatMap[dayName].vehicle += 1;
        } else if (type.includes("fuel")) {
          dailyCatMap[dayName].fuel += 1;
        } else if (type.includes("accident") || type.includes("crash")) {
          dailyCatMap[dayName].accident += 1;
        } else {
          dailyCatMap[dayName].gps += 1;
        }

        // Ticket Status breakdown
        const st = inc.status || "New";
        if (st === "Resolved" || st === "Closed") {
          dailyStatusMap[dayName].resolved += 1;
        } else if (st === "In Progress" || st === "Waiting Client" || st === "Waiting Technician") {
          dailyStatusMap[dayName].inProgress += 1;
        } else {
          dailyStatusMap[dayName].open += 1;
        }
      });

      const dailySlaBreakdown = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
        day,
        healthy: dailySlaMap[day].healthy,
        warning: dailySlaMap[day].warning,
        breached: dailySlaMap[day].breached,
      }));

      const dailyCategoryBreakdown = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
        day,
        gps: dailyCatMap[day].gps,
        vehicle: dailyCatMap[day].vehicle,
        fuel: dailyCatMap[day].fuel,
        accident: dailyCatMap[day].accident,
      }));

      const dailyStatusBreakdown = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
        day,
        open: dailyStatusMap[day].open,
        inProgress: dailyStatusMap[day].inProgress,
        resolved: dailyStatusMap[day].resolved,
      }));

      // 7. Recent Active/Critical Incidents (Limit 5)
      const recentIncidents = await db.query.incidents.findMany({
        where: baseFilter,
        orderBy: [desc(incidents.createdAt)],
        limit: 5,
        with: {
          vehicle: {
            columns: { name: true, licensePlate: true },
          },
        },
      });

      // 8. Recent Security Audit Events (Only accessible by Admin)
      const isAdmin = currentUser.role === "Admin";
      const recentAuditLogs = isAdmin
        ? await db
            .select()
            .from(security_audit_events)
            .where(
              and(
                ne(security_audit_events.attemptedEndpoint, "GET /incidents/stats"),
                or(
                  isNull(security_audit_events.userId),
                  ne(security_audit_events.userId, currentUser.userId)
                )
              )
            )
            .orderBy(desc(security_audit_events.createdAt))
            .limit(4)
        : [];

      return NextResponse.json({
        total: totalResult?.total ?? 0,
        active: activeResult?.active ?? 0,
        resolved: resolvedResult?.resolved ?? 0,
        vehiclesCount: clientVehicleIds.length,
        slaWarnings: slaWarningResult?.count ?? 0,
        slaBreached: slaBreachedResult?.count ?? 0,
        categoryDistribution: categoryRows.map((r) => ({
          category: r.category,
          count: Number(r.count),
        })),
        dailySlaBreakdown,
        dailyCategoryBreakdown,
        dailyStatusBreakdown,
        recentIncidents: recentIncidents.map((inc) => ({
          id: `INC-${inc.id}`,
          title: inc.title,
          type: inc.type,
          priority: inc.priority,
          status: inc.status,
          slaStatus: inc.slaStatus,
          createdAt: inc.createdAt,
          vehicle: inc.vehicle ? `${inc.vehicle.name} (${inc.vehicle.licensePlate})` : "N/A",
        })),
        recentAuditLogs: recentAuditLogs.map((log) => ({
          id: log.id,
          attemptedEndpoint: log.attemptedEndpoint,
          message: log.message,
          statusCode: log.statusCode,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
        })),
      });
    } catch (error) {
      console.error("Failed to compute dashboard stats:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
});
