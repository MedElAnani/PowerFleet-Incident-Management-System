import { db } from '@/db'
import { internal_users, incidents, technicians, incident_comments, admins, users } from '@/db/schema'
import { eq, and, isNull } from "drizzle-orm";
import { auditLogChanges } from './audit';
import { SlaService, SlaPriority } from './sla.service';

type CommentVisibility = 
    | "Public" | "Private"

interface CreateCommentInput {
    body: string
    visibility: CommentVisibility
}

interface CurrentUser {
    userId: number;
    role: "ClientUser" | "InternalUser" | "Admin" | "Support Manager" | "Technician";
}

interface StatusError extends Error {
    status?: number;
}

function createStatusError(message: string, status: number): StatusError {
    const error = new Error(message) as StatusError;
    error.status = status;
    return error;
}

export class CommentService {
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
     * Creates a comment.
     */
    static async createComment(data: CreateCommentInput, user: CurrentUser, incidentId: number) {
        const { body, visibility } = data;
        
        if (!body || !user.userId || !incidentId || !visibility) {
            throw createStatusError("Missing required fields", 400);
        }

        // 1. Enforce soft-deletion check
        await this.checkUserNotDeleted(user.userId);
        
        const incidentExistence = await db.query.incidents.findFirst({
            where: and ( eq(incidents.id, incidentId), isNull(incidents.deletedAt) )
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
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, user.userId)
            });
            if (techRecord) {
                if (techRecord.internalUserId !== incidentExistence.assignedToId) {
                    throw createStatusError("Forbidden: You cannot comment on this incident!", 403);
                }
            }
        }
        
        // 3. Single Database Insert
        const [newComment] = await db.insert(incident_comments).values({
            body,
            visibility,
            userId: user.userId,
            incidentId
        }).returning();
        
        if (newComment) {
            await auditLogChanges({
                incidentId,
                userId: user.userId,
                logType: 'comment',
                newRecord: newComment
            });

            if (user.role !== "ClientUser" && !incidentExistence.firstResponseAt) {
                const { firstResponseAt, resolutionDueAt } = SlaService.calculateFirstResponseDates(
                    incidentExistence.priority as SlaPriority
                );
                await db
                    .update(incidents)
                    .set({
                        firstResponseAt,
                        resolutionDueAt,
                        updatedAt: new Date()
                    })
                    .where(eq(incidents.id, incidentId));
            }

            await SlaService.calculateSLA(incidentId);
        }
        
        return newComment;
    }

    /**
     * Updates comment visibility.
     */
    static async updateComment(visibility: CommentVisibility, user: CurrentUser, incidentId: number, commentId: number) {
        if (!visibility || !user.userId || !incidentId || !commentId) {
            throw createStatusError("Missing required fields", 400);
        }

        // 1. Enforce soft-deletion check
        await this.checkUserNotDeleted(user.userId);
        
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

            const adminRecord = await db.query.admins.findFirst({
                where: eq(admins.internalUserId, user.userId)
            });
            isAdmin = !!adminRecord;
            
            // Technician Checks
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, user.userId)
            });
            if (techRecord) {
                if (techRecord.internalUserId !== incidentExistence.assignedToId) {
                    throw createStatusError("Forbidden: You cannot update this comment!", 403);
                }
            }
        }

        // 3. Final Security Check
        if (!isAdmin && commentExistence.userId !== user.userId) {
            throw createStatusError("Forbidden: You can only modify visibility of your own comments.", 403);
        }
        
        // 4. Update Database
        const [updatedComment] = await db
            .update(incident_comments)
            .set({ visibility })
            .where(eq(incident_comments.id, commentId))
            .returning();
        
        return updatedComment;
    }
}
