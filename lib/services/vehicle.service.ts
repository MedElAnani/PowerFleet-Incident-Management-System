import { db } from '@/db'
import { clients, vehicles, internal_users, admins, users } from '@/db/schema'
import { eq, and, or, isNull } from 'drizzle-orm'

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

export class VehicleService {
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
     * Creates a new vehicle.
     */
    static async createVehicle(data: CreateVehicleInput, authenticatedUserId: number) {
        const { name, imei, licensePlate, clientId } = data
        
        if (!name || !imei || !licensePlate) {
            throw createStatusError("Missing required fields", 400);
        }

        // 1. Enforce soft-deletion check on creator
        await this.checkUserNotDeleted(authenticatedUserId);

        // 2. Enforce soft-deletion check on client owner
        await this.checkUserNotDeleted(clientId);
        
        const internalUserRecord = await db.query.internal_users.findFirst({
            where: and(
                eq(internal_users.userId, authenticatedUserId),
                eq(internal_users.isActive, true)
            )
        });
        if (!internalUserRecord) {
            throw createStatusError("Only an Admin can perform this action.", 403);
        }

        const adminRecord = await db.query.admins.findFirst({
            where: eq(admins.internalUserId, authenticatedUserId)
        });
        if (!adminRecord) {
            throw createStatusError("Only an Admin can perform this action.", 403);
        }
        
        const clientRecord = await db.query.clients.findFirst({
            where: eq(clients.userId, clientId)
        })
        
        if (!clientRecord) {
            throw createStatusError("No client profile associated with this user account.", 404);
        }
        
        const vehicleRecord = await db.query.vehicles.findFirst({
            where: or(
                eq(vehicles.licensePlate, licensePlate),
                eq(vehicles.imei, imei),
            )
        })
        
        if (vehicleRecord) {
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

    /**
     * Soft-deletes a vehicle (Admin only)
     */
    static async deleteVehicle(vehicleId: number, authenticatedUserId: number) {
        // Enforce soft-deletion check on creator
        await this.checkUserNotDeleted(authenticatedUserId);

        const internalUserRecord = await db.query.internal_users.findFirst({
            where: and(
                eq(internal_users.userId, authenticatedUserId),
                eq(internal_users.isActive, true)
            )
        });
        if (!internalUserRecord) {
            throw createStatusError("Only an Admin can perform this action.", 403);
        }

        const adminRecord = await db.query.admins.findFirst({
            where: eq(admins.internalUserId, authenticatedUserId)
        });
        if (!adminRecord) {
            throw createStatusError("Only an Admin can perform this action.", 403);
        }

        const vehicleRecord = await db.query.vehicles.findFirst({
            where: eq(vehicles.id, vehicleId)
        });

        if (vehicleRecord?.deletedAt !== null) {
            throw createStatusError("Vehicle Not Found!", 404);
        }

        const [deletedVehicle] = await db.update(vehicles)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(vehicles.id, vehicleId))
            .returning();

        return deletedVehicle;
    }
}
