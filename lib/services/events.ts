import { db } from "@/db";
import { incidents, clients, internal_users, technicians, incident_events } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

interface CurrentUser {
    userId: number;
    role: "ClientUser" | "InternalUser";
}

export async function getEventIncidents(user: CurrentUser) {
    // 1. Check if user is a ClientUser
    if (user.role === "ClientUser") {
        const clientRecord = await db.query.clients.findFirst({
            where: eq(clients.userId, user.userId)
        });
        if (!clientRecord) return [];

        const userIncidents = await db.query.incidents.findMany({
            where: eq(incidents.clientId, clientRecord.id),
            columns: { id: true }
        });
        const incidentIds = userIncidents.map(i => i.id);
        if (incidentIds.length === 0) return [];

        return await db.query.incident_events.findMany({
            where: inArray(incident_events.incidentId, incidentIds),
            orderBy: (events, { desc }) => [desc(events.createdAt)],
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
    }

    // 2. Check if user is an InternalUser (Technician, Support Manager, Admin)
    const internalProfile = await db.query.internal_users.findFirst({
        where: and(
            eq(internal_users.userId, user.userId),
            eq(internal_users.isActive, true)
        ),
    });

    if (!internalProfile) return [];

    // TIER 3-4: Admin / Support Manager -> unrestricted
    if (
        internalProfile.internalRole === "Admin" ||
        internalProfile.internalRole === "Support Manager"
    ) {
        return await db.query.incident_events.findMany({
            orderBy: (events, { desc }) => [desc(events.createdAt)],
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
    }

    // TIER 2: Technician -> only events for incidents assigned to them
    if (internalProfile.internalRole === "Technician") {
        const techRecord = await db.query.technicians.findFirst({
            where: eq(technicians.internalUserId, internalProfile.id)
        });
        if (!techRecord) return [];

        const assignedIncidents = await db.query.incidents.findMany({
            where: eq(incidents.assignedToId, techRecord.id),
            columns: { id: true }
        });
        const incidentIds = assignedIncidents.map(i => i.id);
        if (incidentIds.length === 0) return [];

        return await db.query.incident_events.findMany({
            where: inArray(incident_events.incidentId, incidentIds),
            orderBy: (events, { desc }) => [desc(events.createdAt)],
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
    }

    return [];
}