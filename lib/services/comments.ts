import { db } from '@/db'
import { internal_users, incidents, technicians, incident_comments } from '@/db/schema'
import { eq } from "drizzle-orm";

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

export async function createComment(data: CreateCommentInput, user: CurrentUser, incidentId: number) {
    const { body, visibility } = data;
    
    // 1. Validation Checks
    if (!body || !user.userId || !incidentId) {
        const error = new Error("Missing required fields");
        (error as any).status = 400;
        throw error;
    }
    
    const incidentExistence = await db.query.incidents.findFirst({
        where: eq(incidents.id, incidentId)
    });
    
    if (!incidentExistence) {
        const error = new Error("Incident Not Found !");
        (error as any).status = 404;
        throw error;
    }
    
    // 2. Role-based Authorization Checks
    if (user.role === "ClientUser") {
        if (user.userId !== incidentExistence.reportedById) {
            const error = new Error("Forbidden: You cannot comment on this incident!");
            (error as any).status = 403;
            throw error;
        }
    } else {
        // Internal User Checks
        const internalUserRecord = await db.query.internal_users.findFirst({
            where: eq(internal_users.userId, user.userId)
        });
        
        if (!internalUserRecord) {
            const error = new Error("Forbidden: You cannot comment on this incident!");
            (error as any).status = 403;
            throw error;
        }
        
        // Enforce the isActive check
        if (!internalUserRecord.isActive) {
            const error = new Error("Forbidden: Your account is inactive.");
            (error as any).status = 403;
            throw error;
        }
        
        // Technician Checks
        if (internalUserRecord.internalRole === 'Technician') {
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, internalUserRecord.id)
            });
            
            if (!techRecord || techRecord.id !== incidentExistence.assignedToId) {
                const error = new Error("Forbidden: You cannot comment on this incident!");
                (error as any).status = 403;
                throw error;
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
    
    return newComment;
}

export async function updateComment(visibility: CommentVisibility, user: CurrentUser, incidentId: number, commentId: number) {
    
    // 1. Validation Checks
    if (!visibility || !user.userId || !incidentId || !commentId) {
        const error = new Error("Missing required fields");
        (error as any).status = 400;
        throw error;
    }
    
    const incidentExistence = await db.query.incidents.findFirst({
        where: eq(incidents.id, incidentId)
    });
    
    const commentExistence = await db.query.incident_comments.findFirst({
        where: eq(incident_comments.id, commentId)
    });
    
    if (!incidentExistence || !commentExistence) {
        const error = new Error("Incident or Comment Not Found !");
        (error as any).status = 404;
        throw error;
    }

    if (commentExistence.incidentId !== incidentId) {
        const error = new Error("Forbidden: Comment does not belong to this incident!");
        (error as any).status = 400;
        throw error;
    }
    
    // 2. Role-based Authorization Checks
    let isAdmin = false;

    if (user.role === "ClientUser") {
        if ((user.userId !== incidentExistence.reportedById) || (user.userId !== commentExistence.userId)) {
            const error = new Error("Forbidden: You cannot update this comment!");
            (error as any).status = 403;
            throw error;
        }
    } else {
        // Internal User Checks
        const internalUserRecord = await db.query.internal_users.findFirst({
            where: eq(internal_users.userId, user.userId)
        });
        
        if (!internalUserRecord) {
            const error = new Error("Forbidden: You cannot update this comment!");
            (error as any).status = 403;
            throw error;
        }
        
        // Enforce the isActive check
        if (!internalUserRecord.isActive) {
            const error = new Error("Forbidden: Your account is inactive.");
            (error as any).status = 403;
            throw error;
        }

        isAdmin = internalUserRecord.internalRole === "Admin";
        
        // Technician Checks
        if (internalUserRecord.internalRole === 'Technician') {
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, internalUserRecord.id)
            });
            
            if (!techRecord || techRecord.id !== incidentExistence.assignedToId) {
                const error = new Error("Forbidden: You cannot update this comment!");
                (error as any).status = 403;
                throw error;
            }
        }
    }

    // 3. Final Security Check: Only the author can update their own comment, unless they are an Admin
    if (!isAdmin && commentExistence.userId !== user.userId) {
        const error = new Error("Forbidden: You can only modify visibility of your own comments.");
        (error as any).status = 403;
        throw error;
    }
    
    // 4. Update Database (With WHERE clause and updating visibility ONLY)
    const [updatedComment] = await db
        .update(incident_comments)
        .set({ visibility })
        .where(eq(incident_comments.id, commentId))
        .returning();
    
    return updatedComment;
}