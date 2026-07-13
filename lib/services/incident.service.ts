import { db } from "@/db";
import { incidents, clients, vehicles, internal_users, technicians, support_managers, admins, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auditLogChanges } from "./audit";
import { resolveUserRole } from "./role";

interface StatusError extends Error {
    status?: number;
}

function createStatusError(message: string, status: number): StatusError {
    const error = new Error(message) as StatusError;
    error.status = status;
    return error;
}

type IncidentType = 
    | "GPS Device" | "Vehicle" | "Driver" | "Client Complaint" 
    | "Accident" | "Fuel" | "Mission" | "Maintenance" 
    | "Payment" | "System Bug" | "Other";
    
type IncidentPriority =
    | "Low" | "Medium" | "High" | "Critical" ;
    
type IncidentStatus = 
    | "New" | "Open" | "In Progress" | "Waiting Client" 
    | "Waiting Technician" | "Resolved" | "Closed" | "Cancelled" ;

interface CreateIncidentInput {
    title: string;
    description: string;
    type: IncidentType;
    address: string;
    vehicleId: number;
    latitude?: number;
    longitude?: number;
}

interface UpdateIncidentInput {
    title?: string;
    description?: string;
    type?: IncidentType;
    priority?: IncidentPriority;
    status?: IncidentStatus;
    assignedToId?: number;
    message?: string;
}

interface CurrentUser {
    userId: number;
    role: "ClientUser" | "InternalUser" | "Admin" | "Support Manager" | "Technician";
}

export class IncidentService {
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
     * Checks if an internal user is active.
     */
    private static async checkInternalUserActive(userId: number) {
        const internalRecord = await db.query.internal_users.findFirst({
            where: eq(internal_users.userId, userId)
        });
        if (!internalRecord) {
            throw createStatusError("Forbidden: Internal user profile not found.", 403);
        }
        if (!internalRecord.isActive) {
            throw createStatusError("Forbidden: Your account is inactive and cannot make changes.", 403);
        }
        return internalRecord;
    }

    /**
     * Creates a new incident ticket.
     */
    static async createTicket(data: CreateIncidentInput, authenticatedUserId: number) {
        const { title, description, type, address, vehicleId, latitude, longitude } = data;

        if (!title || !description || !type || !address || !vehicleId) {
            throw createStatusError("Missing required fields", 400);
        }

        // 1. Enforce user soft-deletion check
        await this.checkUserNotDeleted(authenticatedUserId);

        // 2. Fetch Client Profile
        const clientRecord = await db.query.clients.findFirst({
            where: eq(clients.userId, authenticatedUserId)
        });

        if (!clientRecord) {
            throw createStatusError("No client profile associated with this user account.", 404);
        }

        // 3. Fetch Vehicle Record
        const vehicle = await db.query.vehicles.findFirst({
            where: eq(vehicles.id, vehicleId)
        });

        if (!vehicle) {
            throw createStatusError("Vehicle not found", 404);
        }

        if (vehicle.clientId !== clientRecord.userId) {
            throw createStatusError("You can only report incidents for your own vehicles.", 403);
        }

        const [newIncident] = await db.insert(incidents).values({
            title,
            description,
            type,
            address,
            vehicleId,
            latitude,
            longitude,
            clientId: clientRecord.userId,
            reportedById: authenticatedUserId,
        }).returning();
        
        const incidentId = newIncident.id;
        
        if (newIncident) {
            await auditLogChanges({
                incidentId,
                userId: authenticatedUserId,
                logType: 'create',
                newRecord: newIncident
            });
        }

        return newIncident;
    }

    /**
     * Retrieves incidents visible to the user.
     */
    static async getIncidents(user: CurrentUser) {
        // Enforce user soft-deletion check
        await this.checkUserNotDeleted(user.userId);

        const sharedRelations = {
            vehicle: true,
            reportedBy: {
                with: {
                    user: { columns: { password: false } }
                }
            },
            assignedTo: {
                with: {
                    internalUser: {
                        with: { user: { columns: { password: false } } }
                    }
                }
            },
        } as const;

        if (user.role === "ClientUser") {
            const clientRecord = await db.query.clients.findFirst({
                where: eq(clients.userId, user.userId),
            });

            if (!clientRecord) return [];

            return await db.query.incidents.findMany({
                where: eq(incidents.clientId, clientRecord.userId),
                with: sharedRelations,
                orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
            });
        }

        // For internal users, verify activity status
        const internalProfile = await this.checkInternalUserActive(user.userId);
        const resolvedRole = await resolveUserRole(user.userId);

        if (resolvedRole === "Technician") {
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, internalProfile.userId),
            });

            if (!techRecord) return [];

            return await db.query.incidents.findMany({
                where: eq(incidents.assignedToId, techRecord.internalUserId),
                with: sharedRelations,
                orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
            });
        }

        if (resolvedRole === "Support Manager" || resolvedRole === "Admin") {
            return await db.query.incidents.findMany({
                with: sharedRelations,
                orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
            });
        }

        return [];
    }

    /**
     * Changes the status of an incident ticket.
     */
    static async changeStatus(incidentId: number, newStatus: IncidentStatus, userId: number, message: string) {
        if (!message) {
            throw createStatusError("Message For This Action Is Required", 400);
        }

        // 1. Check user soft-deletion
        await this.checkUserNotDeleted(userId);

        const incident = await db.query.incidents.findFirst({
            where: eq(incidents.id, incidentId)
        });

        if (!incident) {
            throw createStatusError("Incident Not Found!", 404);
        }

        const resolvedRole = await resolveUserRole(userId);

        if (resolvedRole === "ClientUser") {
            throw createStatusError("Forbidden: Clients cannot directly change incident status.", 403);
        }

        // 2. Check internal user active
        await this.checkInternalUserActive(userId);

        if (resolvedRole === "Technician") {
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, userId)
            });

            if (!techRecord || incident.assignedToId !== techRecord.internalUserId) {
                throw createStatusError("Forbidden: This incident is not assigned to you.", 403);
            }

            if (newStatus === "Closed" || newStatus === "Cancelled") {
                throw createStatusError("Forbidden: Technicians cannot close or cancel an incident.", 403);
            }
        }

        if (resolvedRole === "Support Manager") {
            if (newStatus === "Closed" || newStatus === "Cancelled") {
                throw createStatusError("Forbidden: Support Managers cannot close or cancel an incident.", 403);
            }
        }

        const [updatedIncident] = await db
            .update(incidents)
            .set({
                status: newStatus,
                ...(newStatus === "Resolved" && { resolvedAt: new Date() }),
                updatedAt: new Date(),
            })
            .where(eq(incidents.id, incidentId))
            .returning();

        await auditLogChanges({
            incidentId,
            userId,
            logType: 'update',
            oldRecord: incident,
            newRecord: updatedIncident,
            message
        });

        return updatedIncident;
    }

    /**
     * Assigns an incident to a technician.
     */
    static async assignTo(incidentId: number, technicianUserId: number, managerUserId: number, message: string) {
        if (!message) {
            throw createStatusError("Message For This Action Is Required", 400);
        }

        // 1. Check manager soft-deletion & activity
        await this.checkUserNotDeleted(managerUserId);
        await this.checkInternalUserActive(managerUserId);

        // 2. Check technician soft-deletion & activity
        await this.checkUserNotDeleted(technicianUserId);
        await this.checkInternalUserActive(technicianUserId);

        // 3. Check technician availability
        const techRecord = await db.query.technicians.findFirst({
            where: eq(technicians.internalUserId, technicianUserId)
        });

        if (!techRecord) {
            throw createStatusError("Target technician user profile not found.", 404);
        }

        if (!techRecord.isAvailable) {
            throw createStatusError("Forbidden: Selected technician is currently unavailable.", 403);
        }

        const incident = await db.query.incidents.findFirst({
            where: eq(incidents.id, incidentId)
        });

        if (!incident) {
            throw createStatusError("Incident Not Found!", 404);
        }

        const resolvedRole = await resolveUserRole(managerUserId);

        if (resolvedRole === "Support Manager") {
            const smRecord = await db.query.support_managers.findFirst({
                where: eq(support_managers.internalUserId, managerUserId)
            });
            if (!smRecord || !smRecord.canAssign) {
                throw createStatusError("Forbidden: You do not have permission to assign incidents.", 403);
            }
        } else if (resolvedRole !== "Admin") {
            throw createStatusError("Forbidden: Only Support Managers or Admins can assign incidents.", 403);
        }

        const [updatedIncident] = await db
            .update(incidents)
            .set({
                assignedToId: technicianUserId,
                updatedAt: new Date(),
            })
            .where(eq(incidents.id, incidentId))
            .returning();

        await auditLogChanges({
            incidentId,
            userId: managerUserId,
            logType: 'update',
            oldRecord: incident,
            newRecord: updatedIncident,
            message
        });

        return updatedIncident;
    }

    /**
     * Closes an incident ticket.
     */
    static async closeIncident(incidentId: number, userId: number, message: string, resolutionNote?: string) {
        if (!message) {
            throw createStatusError("Message For This Action Is Required", 400);
        }

        // 1. Check user soft-deletion & activity
        await this.checkUserNotDeleted(userId);
        await this.checkInternalUserActive(userId);

        const resolvedRole = await resolveUserRole(userId);

        if (resolvedRole !== "Admin") {
            throw createStatusError("Forbidden: Only Admins can close or cancel an incident.", 403);
        }

        const incident = await db.query.incidents.findFirst({
            where: eq(incidents.id, incidentId)
        });

        if (!incident) {
            throw createStatusError("Incident Not Found!", 404);
        }

        const [updatedIncident] = await db
            .update(incidents)
            .set({
                status: "Closed",
                closedAt: new Date(),
                ...(resolutionNote !== undefined && { resolutionNote }),
                updatedAt: new Date(),
            })
            .where(eq(incidents.id, incidentId))
            .returning();

        await auditLogChanges({
            incidentId,
            userId,
            logType: 'update',
            oldRecord: incident,
            newRecord: updatedIncident,
            message
        });

        return updatedIncident;
    }

    /**
     * Unified incident update service routing (backward compatible dispatcher for API PATCH routes)
     */
    static async updateIncident(data: UpdateIncidentInput, authenticatedUserId: number, incidentId: number) {
        const { title, description, type, priority, status, assignedToId, message } = data;

        // 1. Enforce user soft-deletion check
        await this.checkUserNotDeleted(authenticatedUserId);

        const incident = await db.query.incidents.findFirst({
            where: eq(incidents.id, incidentId)
        });

        if (!incident) {
            throw createStatusError("Incident Not Found!", 404);
        }

        const resolvedRole = await resolveUserRole(authenticatedUserId);

        // ---- ClientUser: own incidents only, details only ----
        if (resolvedRole === "ClientUser") {
            const clientRecord = await db.query.clients.findFirst({
                where: eq(clients.userId, authenticatedUserId),
            });

            if (!clientRecord || incident.clientId !== clientRecord.userId) {
                throw createStatusError("Forbidden: You cannot access this incident!", 403);
            }

            const [updatedIncident] = await db
                .update(incidents)
                .set({
                    title,
                    description,
                    type,
                    updatedAt: new Date(),
                })
                .where(eq(incidents.id, incidentId))
                .returning();

            return updatedIncident;
        }

        // ---- InternalUser: verify activity ----
        await this.checkInternalUserActive(authenticatedUserId);

        // ---- Technician: status only, on assigned tickets, cannot close/cancel ----
        if (resolvedRole === "Technician") {
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, authenticatedUserId)
            });

            if (!techRecord || incident.assignedToId !== techRecord.internalUserId) {
                throw createStatusError("Forbidden: This incident is not assigned to you.", 403);
            }

            if (status === "Closed" || status === "Cancelled") {
                throw createStatusError("Forbidden: Technicians cannot close or cancel an incident.", 403);
            }
            
            if (!message) {
                throw createStatusError("Message For This Action Is Required", 400);
            }

            const [updatedIncident] = await db
                .update(incidents)
                .set({
                    ...(status !== undefined && { status }),
                    ...(status === "Resolved" && { resolvedAt: new Date() }),
                    updatedAt: new Date(),
                })
                .where(eq(incidents.id, incidentId))
                .returning();

            await auditLogChanges({
                incidentId,
                userId: authenticatedUserId,
                logType: 'update',
                oldRecord: incident,
                newRecord: updatedIncident,
                message
            });

            return updatedIncident;
        }

        // ---- Admin & Support Manager: assign, priorities, status ----
        if (resolvedRole === "Admin" || resolvedRole === "Support Manager") {
            if (status === "Closed" || status === "Cancelled") {
                if (resolvedRole !== "Admin") {
                    throw createStatusError("Forbidden: Support Managers cannot close or cancel an incident.", 403);
                }
            }
            
            if (assignedToId !== undefined) {
                // Ensure assigned technician exists, is active, and is available
                await this.checkUserNotDeleted(assignedToId);
                await this.checkInternalUserActive(assignedToId);
                
                const techProfile = await db.query.technicians.findFirst({
                    where: eq(technicians.internalUserId, assignedToId)
                });
                if (!techProfile) {
                    throw createStatusError("Target technician user profile not found.", 404);
                }
                if (!techProfile.isAvailable) {
                    throw createStatusError("Forbidden: Selected technician is currently unavailable.", 403);
                }

                if (resolvedRole === "Support Manager") {
                    const smRecord = await db.query.support_managers.findFirst({
                        where: eq(support_managers.internalUserId, authenticatedUserId)
                    });
                    if (!smRecord || !smRecord.canAssign) {
                        throw createStatusError("Forbidden: You do not have permission to assign incidents.", 403);
                    }
                }
            }
            
            if (!message) {
                throw createStatusError("Message For This Action Is Required", 400);
            }

            const [updatedIncident] = await db
                .update(incidents)
                .set({
                    ...(priority !== undefined && { priority }),
                    ...(status !== undefined && { status }),
                    ...(assignedToId !== undefined && { assignedToId }),
                    ...(status === "Resolved" && { resolvedAt: new Date() }),
                    ...(status === "Closed" && { closedAt: new Date() }),
                    updatedAt: new Date(),
                })
                .where(eq(incidents.id, incidentId))
                .returning();

            await auditLogChanges({
                incidentId,
                userId: authenticatedUserId,
                logType: 'update',
                oldRecord: incident,
                newRecord: updatedIncident,
                message
            });

            return updatedIncident;
        }

        throw createStatusError("Forbidden: Unrecognized role.", 403);
    }
}
