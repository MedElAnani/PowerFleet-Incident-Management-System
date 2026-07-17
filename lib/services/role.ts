import { db } from "@/db";
import { clients, internal_users, admins, support_managers, technicians } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface StatusError extends Error {
    status?: number;
}

export function createStatusError(message: string, status: number): StatusError {
    const error = new Error(message) as StatusError;
    error.status = status;
    return error;
}

export async function verifyAdminAccess(userId: number): Promise<void> {
    const internalUserRecord = await db.query.internal_users.findFirst({
        where: and(
            eq(internal_users.userId, userId),
            eq(internal_users.isActive, true)
        )
    });
    if (!internalUserRecord) {
        throw createStatusError("Only an Admin can perform this action.", 403);
    }

    const adminRecord = await db.query.admins.findFirst({
        where: eq(admins.internalUserId, userId)
    });
    if (!adminRecord) {
        throw createStatusError("Only an Admin can perform this action.", 403);
    }
}

export type SystemRole = "ClientUser" | "Admin" | "Support Manager" | "Technician";

export async function resolveUserRole(userId: number): Promise<SystemRole | null> {
    // 1. Check if they are a ClientUser
    const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.userId, userId),
    });
    if (clientRecord) {
        return "ClientUser";
    }

    // 2. Check if they are an InternalUser
    const internalUserRecord = await db.query.internal_users.findFirst({
        where: eq(internal_users.userId, userId),
    });
    if (internalUserRecord) {
        // Find which sub-role they have
        const adminRecord = await db.query.admins.findFirst({
            where: eq(admins.internalUserId, userId),
        });
        if (adminRecord) {
            return "Admin";
        }

        const managerRecord = await db.query.support_managers.findFirst({
            where: eq(support_managers.internalUserId, userId),
        });
        if (managerRecord) {
            return "Support Manager";
        }

        const techRecord = await db.query.technicians.findFirst({
            where: eq(technicians.internalUserId, userId),
        });
        if (techRecord) {
            return "Technician";
        }
    }

    return null;
}
