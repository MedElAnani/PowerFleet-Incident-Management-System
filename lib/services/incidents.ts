import { db } from "@/db";
import { incidents, clients, vehicles } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // 1. Structural Validation — priority removed, client never sets it
    if (!title || !description || !type || !address || !vehicleId) {
        const error = new Error("Missing required fields");
        (error as any).status = 400;
        throw error;
    }

    // 2. Look up the Client ID using the authenticated User ID
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.userId, authenticatedUserId)
    });

    if (!clientRecord) {
        const error = new Error("No client profile associated with this user account.");
        (error as any).status = 404;
        throw error;
    }

    // 3. Look up the vehicle and verify it belongs to this client
    const vehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicleId)
    });

    if (!vehicle) {
        const error = new Error("Vehicle not found");
        (error as any).status = 404;
        throw error;
    }

    if (vehicle.clientId !== clientRecord.id) {
        const error = new Error("You can only report incidents for your own vehicles.");
        (error as any).status = 403;
        throw error;
    }

    // 4. Database Execution — priority defaults to "Medium", SupportManager adjusts later via PATCH
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