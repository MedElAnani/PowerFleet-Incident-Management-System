import { db } from '@/db'
import { clients, vehicles, internal_users } from '@/db/schema'
import { eq, and, or } from 'drizzle-orm'

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
        const error = new Error("Missing required fields");
        (error as any).status = 400;
        throw error;
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
        const error = new Error("Only an Admin can perform this action.");
        (error as any).status = 403;
        throw error;
    }
    
    // Fetch For The Client Record
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.id, clientId)
    })
    
    // Checking Client Existence
    if (!clientRecord) {
        const error = new Error("No client profile associated with this user account.");
        (error as any).status = 404;
        throw error;
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
        const error = new Error('This vehicle already exist !');
        (error as any).status = 400
        throw error
    }
    
    const [newVehicle] = await db.insert(vehicles).values({
        name,
        imei,
        licensePlate,
        clientId
    }).returning();
    
    return newVehicle;
}