import { db } from "@/db";
import { incidents, clients, vehicles, internal_users, technicians, support_managers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
    
type IncidentStatus= 
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

export async function createIncident(data: CreateIncidentInput, authenticatedUserId: number) {
    const { title, description, type, address, vehicleId, latitude, longitude } = data;

    // Checking Variables Existence
    if (!title || !description || !type || !address || !vehicleId) {
        throw createStatusError("Missing required fields", 400);
    }

    // Fetch For The Client Record
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.userId, authenticatedUserId)
    });

    // Checking Client Existence
    if (!clientRecord) {
        throw createStatusError("No client profile associated with this user account.", 404);
    }

    // Fetch For The Vehicle Record
    const vehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicleId)
    });

    // Checking Vehicle Existence
    if (!vehicle) {
        throw createStatusError("Vehicle not found", 404);
    }

    // Checking Of Relation Between Client And The Vehicle
    if (vehicle.clientId !== clientRecord.id) {
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
        clientId: clientRecord.id,
        reportedById: authenticatedUserId,
    }).returning();

    return newIncident;
}

interface CurrentUser {
    userId: number;
    role: "ClientUser" | "InternalUser";
}

export async function getIncidents(user: CurrentUser) {
    const sharedRelations = {
        vehicle: true,
        reportedBy: { columns: { password: false } },
        assignedTo: {
            with: {
                internalUser: {
                    with: { user: { columns: { password: false } } }
                }
            }
        },
    } as const;

    // TIER 1: ClientUser -> only their own company's incidents
    if (user.role === "ClientUser") {
        const clientRecord = await db.query.clients.findFirst({
            where: eq(clients.userId, user.userId),
        });

        if (!clientRecord) return [];

        return await db.query.incidents.findMany({
            where: eq(incidents.clientId, clientRecord.id),
            with: sharedRelations,
            orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
        });
    }

    // TIER 2-4: InternalUser -> resolve their sub-role
    const internalProfile = await db.query.internal_users.findFirst({
        where: and(
            eq(internal_users.userId, user.userId),
            eq(internal_users.isActive, true)
        ),
    });

    if (!internalProfile) return [];

    // TIER 2: Technician -> only incidents assigned to them
    if (internalProfile.internalRole === "Technician") {
        const techRecord = await db.query.technicians.findFirst({
            where: eq(technicians.internalUserId, internalProfile.id),
        });

        if (!techRecord) return [];

        return await db.query.incidents.findMany({
            where: eq(incidents.assignedToId, techRecord.id),
            with: sharedRelations,
            orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
        });
    }

    // TIER 3-4: Support Manager / Admin -> unrestricted
    if (
        internalProfile.internalRole === "Support Manager" ||
        internalProfile.internalRole === "Admin"
    ) {
        return await db.query.incidents.findMany({
            with: sharedRelations,
            orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
        });
    }

    return [];
}

interface UpdateIncidentInput {
    title?: string
    description?: string
    type?: IncidentType
    priority?: IncidentPriority
    status?: IncidentStatus
    assignedToId?: number
}

export async function updateIncident(
    data: UpdateIncidentInput,
    authenticatedUserId: number,
    authenticatedUserRole: string,
    incidentId: number
) {
    const { title, description, type, priority, status, assignedToId } = data;

    const incident = await db.query.incidents.findFirst({
        where: eq(incidents.id, incidentId)
    });

    if (!incident) {
        throw createStatusError("Incident Not Found!", 404);
    }

    // ---- ClientUser: own incidents only, description only ----
    if (authenticatedUserRole === "ClientUser") {
        const clientRecord = await db.query.clients.findFirst({
            where: eq(clients.userId, authenticatedUserId),
        });

        if (!clientRecord || incident.clientId !== clientRecord.id) {
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

    // ---- InternalUser: resolve real sub-role ----
    const internalUserRecord = await db.query.internal_users.findFirst({
        where: eq(internal_users.userId, authenticatedUserId)
    });

    if (!internalUserRecord) {
        throw createStatusError("Forbidden: You cannot access this incident!", 403);
    }

    if (!internalUserRecord.isActive) {
        throw createStatusError("Forbidden: Your account is inactive and cannot make changes.", 403);
    }

    // ---- Admin: unrestricted — any field, any status transition ----
    if (internalUserRecord.internalRole === "Admin") {
        const [updatedIncident] = await db
            .update(incidents)
            .set({
                ...(priority !== undefined && { priority }),
                ...(status !== undefined && { status }),
                ...(assignedToId !== undefined && { assignedToId }),
                ...(status === "Resolved" && { resolvedAt: new Date() }),
                updatedAt: new Date(),
            })
            .where(eq(incidents.id, incidentId))
            .returning();

        return updatedIncident;
    }

    // ---- Support Manager: can assign, can set priority/status, cannot close/cancel ----
    if (internalUserRecord.internalRole === "Support Manager") {
        if (status === "Closed" || status === "Cancelled") {
            throw createStatusError("Forbidden: Support Managers cannot close or cancel an incident.", 403);
        }
        
        if (assignedToId !== undefined) {
            const smRecord = await db.query.support_managers.findFirst({
                where: eq(support_managers.internalUserId, internalUserRecord.id)
            });
            if (!smRecord || !smRecord.canAssign) {
                throw createStatusError("Forbidden: You do not have permission to assign incidents.", 403);
            }
        }

        const [updatedIncident] = await db
            .update(incidents)
            .set({
                ...(priority !== undefined && { priority }),
                ...(status !== undefined && { status }),
                ...(assignedToId !== undefined && { assignedToId }),
                ...(status === "Resolved" && { resolvedAt: new Date() }),
                updatedAt: new Date(),
            })
            .where(eq(incidents.id, incidentId))
            .returning();

        return updatedIncident;
    }

    // ---- Technician: status only, on incidents assigned to them, cannot close/cancel ----
    if (internalUserRecord.internalRole === "Technician") {
        const techRecord = await db.query.technicians.findFirst({
            where: eq(technicians.internalUserId, internalUserRecord.id)
        });

        if (!techRecord || incident.assignedToId !== techRecord.id) {
            throw createStatusError("Forbidden: This incident is not assigned to you.", 403);
        }

        if (status === "Closed" || status === "Cancelled") {
            throw createStatusError("Forbidden: Technicians cannot close or cancel an incident.", 403);
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

        return updatedIncident;
    }

    throw createStatusError("Forbidden: Unrecognized role.", 403);
}