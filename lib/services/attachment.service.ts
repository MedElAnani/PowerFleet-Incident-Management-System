import { db } from "@/db"
import { auditLogChanges } from "./audit"
import { and, eq, isNull } from "drizzle-orm"
import { incident_attachments, incidents, internal_users, technicians, users } from "@/db/schema"

interface CreateAttachmentIncident {
    filename: string
    fileUrl: string
    fileType: string
}

interface CurrentUser {
    userId: number
    role: "ClientUser" | "InternalUser" | "Admin" | "Support Manager" | "Technician"
}

interface StatusError extends Error {
    status?: number
}

function createStatusError(message: string, status: number): StatusError {
    const error = new Error(message) as StatusError
    error.status = status
    return error
}

export class AttachmentService {
    /**
     * Checks if a base user is soft-deleted.
     */
    private static async checkUserNotDeleted(userId:number) {
        const userRecord = await db.query.users.findFirst({
            where: and( eq(users.id, userId), isNull(users.deletedAt)  )
        })
        if(!userRecord) {
            throw createStatusError("Forbidden: Account is deleted or inactive.", 403)
        }
        return userRecord
    }
    
    private static async validateUserPermissions(user: CurrentUser, incidentExistence: typeof incidents.$inferSelect) {
        if (user.role === "ClientUser") {
            if (user.userId !== incidentExistence.reportedById) {
                throw createStatusError("Forbidden: You cannot add attachment to this incident!", 403);
            }
            return;
        }

        // Internal User Checks
        const internalUserRecord = await db.query.internal_users.findFirst({
            where: eq(internal_users.userId, user.userId)
        });
        
        if (!internalUserRecord) {
            throw createStatusError("Forbidden: You cannot add attachment to this incident!", 403);
        }
        
        // Enforce the isActive check
        if (!internalUserRecord.isActive) {
            throw createStatusError("Forbidden: Your account is inactive.", 403);
        }
        
        // Technician Checks
        const techRecord = await db.query.technicians.findFirst({
            where: eq(technicians.internalUserId, user.userId)
        });
        if (techRecord && techRecord.internalUserId !== incidentExistence.assignedToId) {
            throw createStatusError("Forbidden: You cannot add attachment to this incident!", 403);
        }
    }
    
    /**
     * Creates a attachment.
     */
    static async createAttachment(data: CreateAttachmentIncident, user: CurrentUser, incidentId: number) {
        const { filename, fileUrl, fileType } = data
        
        if(!filename || !fileUrl || !fileType) {
            throw createStatusError("Missing required fields", 400);
        }
        
        // 1. Enforce soft-deletion check
        await this.checkUserNotDeleted(user.userId)
        
        const incidentExistence = await db.query.incidents.findFirst({
            where: and( eq(incidents.id, incidentId), isNull(incidents.deletedAt) )
        })
        
        if(!incidentExistence) {
            throw createStatusError("Incident Not Found !", 404);
        }
        
        // 2. Role-based Authorization Checks
        await this.validateUserPermissions(user, incidentExistence);
        
        // 3. Single Database Insert
        const [newAttachment] = await db.insert(incident_attachments).values({
            filename,
            fileUrl,
            fileType,
            incidentId,
            uploadedById: user.userId
        }).returning();
        
        if (newAttachment) {
            await auditLogChanges({
                incidentId,
                userId: user.userId,
                logType: 'attachment',
                newRecord: newAttachment
            });
        }
        return newAttachment;
    }
}