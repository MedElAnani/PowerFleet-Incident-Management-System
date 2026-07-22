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

export interface FullUserProfile {
  id: number;
  name: string;
  email: string;
  role: SystemRole;
  details: {
    companyName?: string;
    phone?: string;
    department?: string;
    hireDate?: Date | null;
    specialty?: string;
    isAvailable?: boolean;
    canAssign?: boolean;
    canManageUsers?: boolean;
  };
}

export async function resolveUserRole(userId: number): Promise<SystemRole | null> {
  const profile = await getUserFullProfile(userId, "", "");
  return profile?.role ?? null;
}

export async function getUserFullProfile(userId: number, name: string, email: string): Promise<FullUserProfile | null> {
  // 1. Check if they are a ClientUser
  const clientRecord = await db.query.clients.findFirst({
    where: eq(clients.userId, userId),
  });
  if (clientRecord) {
    return {
      id: userId,
      name,
      email,
      role: "ClientUser",
      details: {
        companyName: clientRecord.companyName,
        phone: clientRecord.phone,
      },
    };
  }

  // 2. Check if they are an InternalUser
  const internalRecord = await db.query.internal_users.findFirst({
    where: eq(internal_users.userId, userId),
  });

  if (internalRecord) {
    // Check Admin
    const adminRecord = await db.query.admins.findFirst({
      where: eq(admins.internalUserId, userId),
    });
    if (adminRecord) {
      return {
        id: userId,
        name,
        email,
        role: "Admin",
        details: {
          department: internalRecord.department,
          hireDate: internalRecord.hireDate,
          canManageUsers: adminRecord.canManageUsers,
        },
      };
    }

    // Check Support Manager
    const managerRecord = await db.query.support_managers.findFirst({
      where: eq(support_managers.internalUserId, userId),
    });
    if (managerRecord) {
      return {
        id: userId,
        name,
        email,
        role: "Support Manager",
        details: {
          department: internalRecord.department,
          hireDate: internalRecord.hireDate,
          canAssign: managerRecord.canAssign,
        },
      };
    }

    // Check Technician
    const techRecord = await db.query.technicians.findFirst({
      where: eq(technicians.internalUserId, userId),
    });
    if (techRecord) {
      return {
        id: userId,
        name,
        email,
        role: "Technician",
        details: {
          department: internalRecord.department,
          hireDate: internalRecord.hireDate,
          specialty: techRecord.specialty,
          isAvailable: techRecord.isAvailable,
        },
      };
    }
  }

  return null;
}
