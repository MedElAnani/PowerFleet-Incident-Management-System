import { db } from "@/db"
import { verifyAdminAccess } from "@/lib/services/role";
import { and, eq, isNull } from "drizzle-orm";
import { security_audit_events, users } from "@/db/schema";

interface CreateSecurityAuditInput {
    attemptedEndpoint: string;
    message: string;
    statusCode: number;
    incidentTragetId?: number;
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

export class SecurityAudit {
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
     * Create a security audit
     */
    static async createSecurityAudit(data: CreateSecurityAuditInput, req: Request, authenticatedUserId?: number) {
        const { attemptedEndpoint, message, statusCode, incidentTragetId } = data
        
        // 1. Get headers
        const forwardedFor = req.headers.get('x-forwarded-for');
        const realIp = req.headers.get('x-real-ip');

        // 2. Bulletproof fallback (TypeScript safe!)
        let ipAddress = "127.0.0.1";

        if (forwardedFor) {
            ipAddress = forwardedFor.split(',')[0].trim();
        } else if (realIp) {
            ipAddress = realIp.trim();
        }
        
        // 3. Store Audit Event
        await db.insert(security_audit_events).values({
            ipAddress,
            attemptedEndpoint,
            statusCode,
            message,
            incidentTragetId,
            userId: authenticatedUserId
        }).returning()
        
    }
    
    /**
     * Get all security audit
     */
    
    static async getAllSecurityAudit(userId: number){
        await verifyAdminAccess(userId)
        
        return await db.query.security_audit_events.findMany({
                orderBy: (security_audit_events, { desc }) => [desc(security_audit_events.createdAt)],
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                        }
                    }
                }
        })
    }
    
    /**
     * Get all security audit by user
     */
    static async getSecurityAuditByUser(userId: number, targetUserId: number){
        await verifyAdminAccess(userId)
        
        return await db.query.security_audit_events.findMany({
                where: eq(security_audit_events.userId, targetUserId),
                orderBy: (security_audit_events, { desc }) => [desc(security_audit_events.createdAt)],
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                        }
                    }
                }
        })
    }

    /**
     * Get all security audit by incident
     */
    static async getSecurityAuditByIncident(userId: number, incidentId: number){
        await verifyAdminAccess(userId)
        
        return await db.query.security_audit_events.findMany({
                where: eq(security_audit_events.incidentTragetId, incidentId),
                orderBy: (security_audit_events, { desc }) => [desc(security_audit_events.createdAt)],
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                        }
                    }
                }
        })
    }
}