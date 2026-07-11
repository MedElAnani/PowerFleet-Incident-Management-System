import { db } from '@/db'
import { clients, vehicles, internal_users } from '@/db/schema'
import { eq, and, or } from 'drizzle-orm'

interface StatusError extends Error {
    status?: number;
}

function createStatusError(message: string, status: number): StatusError {
    const error = new Error(message) as StatusError;
    error.status = status;
    return error;
}

interface CreateVehicleInput {
    name: string
    imei: string
    licensePlate: string
    clientId: number
}

export async function createVehicle(data: CreateVehicleInput, authenticatedUserId: number) {
    const { name, imei, licensePlate, clientId } = data
    
    // Checking Variables Existence
    if(!name || !imei || !licensePlate) {
        throw createStatusError("Missing required fields", 400);
    }
    
    const adminRecord  = await db.query.internal_users.findFirst({
        where: and(
            eq(internal_users.userId, authenticatedUserId),
            eq(internal_users.internalRole, "Admin"),
            eq(internal_users.isActive, true)
        )
    })
    
    // Checking InternalUser Existence
    if (!adminRecord) {
        throw createStatusError("Only an Admin can perform this action.", 403);
    }
    
    // Fetch For The Client Record
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.id, clientId)
    })
    
    // Checking Client Existence
    if (!clientRecord) {
        throw createStatusError("No client profile associated with this user account.", 404);
    }
    
    // Fetch For The Vehicle Record
    const vehicleRecord = await db.query.vehicles.findFirst({
        where: or(
            eq(vehicles.licensePlate, licensePlate),
            eq(vehicles.imei, imei),
        )
    })
    
    // Checking Vehicle Existence
    if(vehicleRecord){
        throw createStatusError("This vehicle already exist !", 400);
    }
    
    const [newVehicle] = await db.insert(vehicles).values({
        name,
        imei,
        licensePlate,
        clientId,
        createdBy: authenticatedUserId
    }).returning();
    
    return newVehicle;
}