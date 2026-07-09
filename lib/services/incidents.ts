import { db } from "@/db";
import { incidents, clients, vehicles, internal_users, technicians } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
        const error = new Error("Missing required fields");
        (error as any).status = 400;
        throw error;
    }

    // Fetch For The Client Record
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.userId, authenticatedUserId)
    });

    // Checking Client Existence
    if (!clientRecord) {
        const error = new Error("No client profile associated with this user account.");
        (error as any).status = 404;
        throw error;
    }

    // Fetch For The Vehicle Record
    const vehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicleId)
    });

    // Checking Vehicle Existence
    if (!vehicle) {
        const error = new Error("Vehicle not found");
        (error as any).status = 404;
        throw error;
    }

    // Checking Of Relation Between Client And The Vehicle
    if (vehicle.clientId !== clientRecord.id) {
        const error = new Error("You can only report incidents for your own vehicles.");
        (error as any).status = 403;
        throw error;
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
        const error = new Error("Incident Not Found!");
        (error as any).status = 404;
        throw error;
    }

    // ---- ClientUser: own incidents only, description only ----
    if (authenticatedUserRole === "ClientUser") {
        const clientRecord = await db.query.clients.findFirst({
            where: eq(clients.userId, authenticatedUserId),
        });

        if (!clientRecord || incident.clientId !== clientRecord.id) {
            const error = new Error("Forbidden: You cannot access this incident!");
            (error as any).status = 403;
            throw error;
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
        where: and(
            eq(internal_users.userId, authenticatedUserId),
            eq(internal_users.isActive, true)
        )
    });

    if (!internalUserRecord) {
        const error = new Error("Forbidden: You cannot access this incident!");
        (error as any).status = 403;
        throw error;
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
            const error = new Error("Forbidden: Support Managers cannot close or cancel an incident.");
            (error as any).status = 403;
            throw error;
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
            const error = new Error("Forbidden: This incident is not assigned to you.");
            (error as any).status = 403;
            throw error;
        }

        if (status === "Closed" || status === "Cancelled") {
            const error = new Error("Forbidden: Technicians cannot close or cancel an incident.");
            (error as any).status = 403;
            throw error;
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

    const error = new Error("Forbidden: Unrecognized role.");
    (error as any).status = 403;
    throw error;
}