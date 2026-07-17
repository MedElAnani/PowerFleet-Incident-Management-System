import { db } from "@/db";
import { incidents, clients, internal_users, technicians, incident_events, users } from "@/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { resolveUserRole } from "./role";

interface CurrentUser {
    userId: number;
    role: "ClientUser" | "InternalUser" | "Admin" | "Support Manager" | "Technician";
}

interface StatusError extends Error {
    status?: number;
}

function createStatusError(message: string, status: number): StatusError {
    const error = new Error(message) as StatusError;
    error.status = status;
    return error;
}

export class EventService {
    /**
     * Checks if a base user is soft-deleted.
     */
    private static async checkUserNotDeleted(userId: number) {
        const userRecord = await db.query.users.findFirst({
            where: and(eq(users.id, userId), isNull(users.deletedAt))
        });
        if (!userRecord) {
            throw createStatusError("Forbidden: Account is deleted or inactive.", 403);
        }
        return userRecord;
    }

    /**
     * Retrieves event logs for visible incidents.
     */
    static async getEventIncidents(user: CurrentUser) {
        // Enforce soft-deletion check on the querying user
        await this.checkUserNotDeleted(user.userId);

        if (user.role === "ClientUser") {
            const clientRecord = await db.query.clients.findFirst({
                where: eq(clients.userId, user.userId)
            });
            if (!clientRecord) return [];

            const userIncidents = await db.query.incidents.findMany({
                where: eq(incidents.clientId, clientRecord.userId),
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
                        }
                    }
                }
            });
        }

        const internalProfile = await db.query.internal_users.findFirst({
            where: and(
                eq(internal_users.userId, user.userId),
                eq(internal_users.isActive, true)
            ),
        });

        if (!internalProfile) return [];

        const resolvedRole = await resolveUserRole(user.userId);

        if (resolvedRole === "Admin" || resolvedRole === "Support Manager") {
            return await db.query.incident_events.findMany({
                orderBy: (events, { desc }) => [desc(events.createdAt)],
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                        }
                    }
                }
            });
        }

        if (resolvedRole === "Technician") {
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, user.userId)
            });
            if (!techRecord) return [];

            const assignedIncidents = await db.query.incidents.findMany({
                where: eq(incidents.assignedToId, techRecord.internalUserId),
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
                        }
                    }
                }
            });
        }

        return [];
    }
}
