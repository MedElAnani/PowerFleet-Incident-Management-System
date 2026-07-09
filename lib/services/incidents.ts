import { db } from "@/db";
import { incidents, clients, vehicles, internal_users, technicians } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type IncidentType = 
    | "GPS Device" | "Vehicle" | "Driver" | "Client Complaint" 
    | "Accident" | "Fuel" | "Mission" | "Maintenance" 
    | "Payment" | "System Bug" | "Other";

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