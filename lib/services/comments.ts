import { db } from '@/db'
import { internal_users, incidents, technicians, incident_comments } from '@/db/schema'
import { eq } from "drizzle-orm";
import { auditLogChanges } from './audit';

type CommentVisibility = 
    | "Public" | "Private"

interface CreateCommentInput {
    body: string
    visibility: CommentVisibility
    
}

interface CurrentUser {
    userId: number;
    role: "ClientUser" | "InternalUser";
}

interface StatusError extends Error {
    status?: number;
}

function createStatusError(message: string, status: number): StatusError {
    const error = new Error(message) as StatusError;
    error.status = status;
    return error;
}

export async function createComment(data: CreateCommentInput, user: CurrentUser, incidentId: number) {
    const { body, visibility } = data;
    
    // 1. Validation Checks
    if (!body || !user.userId || !incidentId) {
        throw createStatusError("Missing required fields", 400);
    }
    
    const incidentExistence = await db.query.incidents.findFirst({
        where: eq(incidents.id, incidentId)
    });
    
    if (!incidentExistence) {
        throw createStatusError("Incident Not Found !", 404);
    }
    
    // 2. Role-based Authorization Checks
    if (user.role === "ClientUser") {
        if (user.userId !== incidentExistence.reportedById) {
            throw createStatusError("Forbidden: You cannot comment on this incident!", 403);
        }
    } else {
        // Internal User Checks
        const internalUserRecord = await db.query.internal_users.findFirst({
            where: eq(internal_users.userId, user.userId)
        });
        
        if (!internalUserRecord) {
            throw createStatusError("Forbidden: You cannot comment on this incident!", 403);
        }
        
        // Enforce the isActive check
        if (!internalUserRecord.isActive) {
            throw createStatusError("Forbidden: Your account is inactive.", 403);
        }
        
        // Technician Checks
        if (internalUserRecord.internalRole === 'Technician') {
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, internalUserRecord.id)
            });
            
            if (!techRecord || techRecord.id !== incidentExistence.assignedToId) {
                throw createStatusError("Forbidden: You cannot comment on this incident!", 403);
            }
        }
    }
    
    // 3. Single Database Insert (DRY)
    const [newComment] = await db.insert(incident_comments).values({
        body,
        visibility,
        userId: user.userId,
        incidentId
    }).returning();
    
    const userId = user.userId
    
    if(newComment){
        await auditLogChanges({
            incidentId,
            userId,
            logType: 'comment',
            newRecord: newComment
        })
    }
    
    return newComment;
}

export async function updateComment(visibility: CommentVisibility, user: CurrentUser, incidentId: number, commentId: number) {
    
    // 1. Validation Checks
    if (!visibility || !user.userId || !incidentId || !commentId) {
        throw createStatusError("Missing required fields", 400);
    }
    
    const incidentExistence = await db.query.incidents.findFirst({
        where: eq(incidents.id, incidentId)
    });
    
    const commentExistence = await db.query.incident_comments.findFirst({
        where: eq(incident_comments.id, commentId)
    });
    
    if (!incidentExistence || !commentExistence) {
        throw createStatusError("Incident or Comment Not Found !", 404);
    }

    if (commentExistence.incidentId !== incidentId) {
        throw createStatusError("Forbidden: Comment does not belong to this incident!", 400);
    }
    
    // 2. Role-based Authorization Checks
    let isAdmin = false;

    if (user.role === "ClientUser") {
        if ((user.userId !== incidentExistence.reportedById) || (user.userId !== commentExistence.userId)) {
            throw createStatusError("Forbidden: You cannot update this comment!", 403);
        }
    } else {
        // Internal User Checks
        const internalUserRecord = await db.query.internal_users.findFirst({
            where: eq(internal_users.userId, user.userId)
        });
        
        if (!internalUserRecord) {
            throw createStatusError("Forbidden: You cannot update this comment!", 403);
        }
        
        // Enforce the isActive check
        if (!internalUserRecord.isActive) {
            throw createStatusError("Forbidden: Your account is inactive.", 403);
        }

        isAdmin = internalUserRecord.internalRole === "Admin";
        
        // Technician Checks
        if (internalUserRecord.internalRole === 'Technician') {
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, internalUserRecord.id)
            });
            
            if (!techRecord || techRecord.id !== incidentExistence.assignedToId) {
                throw createStatusError("Forbidden: You cannot update this comment!", 403);
            }
        }
    }

    // 3. Final Security Check: Only the author can update their own comment, unless they are an Admin
    if (!isAdmin && commentExistence.userId !== user.userId) {
        throw createStatusError("Forbidden: You can only modify visibility of your own comments.", 403);
    }
    
    // 4. Update Database (With WHERE clause and updating visibility ONLY)
    const [updatedComment] = await db
        .update(incident_comments)
        .set({ visibility })
        .where(eq(incident_comments.id, commentId))
        .returning();
    
    return updatedComment;
}