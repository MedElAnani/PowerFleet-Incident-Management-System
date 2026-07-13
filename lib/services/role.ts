import { db } from "@/db";
import { clients, internal_users, admins, support_managers, technicians } from "@/db/schema";
import { eq } from "drizzle-orm";

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
