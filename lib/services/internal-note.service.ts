import { db } from '@/db'
import { incident_internal_notes, incidents, internal_users } from '@/db/schema'
import { eq, and, isNull, or, desc } from "drizzle-orm";
import { CreateInternalNoteInput } from './validations/incident';

interface CurrentUser {
    userId: number;
    role: string;
}

interface StatusError extends Error {
    status?: number;
}

function createStatusError(message: string, status: number): StatusError {
    const error = new Error(message) as StatusError;
    error.status = status;
    return error;
}

export class InternalNoteService {
    
    /**
     * Helper to verify user is an active internal user
     */
    private static async verifyInternalAccess(userId: number) {
        const internalUserRecord = await db.query.internal_users.findFirst({
            where: and(eq(internal_users.userId, userId), eq(internal_users.isActive, true))
        });
        
        if (!internalUserRecord) {
            throw createStatusError("Forbidden: You must be an active internal user.", 403);
        }
        return internalUserRecord;
    }

    /**
     * Create a new internal note
     */
    static async createNote(incidentId: number, user: CurrentUser, data: CreateInternalNoteInput) {
        await this.verifyInternalAccess(user.userId);
        
        const incidentExists = await db.query.incidents.findFirst({
            where: and(eq(incidents.id, incidentId), isNull(incidents.deletedAt))
        });
        
        if (!incidentExists) {
            throw createStatusError("Incident Not Found!", 404);
        }

        const [newNote] = await db.insert(incident_internal_notes).values({
            incidentId,
            authorId: user.userId,
            title: data.title,
            body: data.body,
            priority: data.priority,
            visibility: data.visibility,
            isPinned: data.isPinned ?? false
        }).returning();

        return newNote;
    }

    /**
     * Get notes for an incident, respecting "Private" visibility rule
     */
    static async getNotes(incidentId: number, user: CurrentUser) {
        await this.verifyInternalAccess(user.userId);
        
        const { resolveUserRole } = await import("@/lib/services/role");
        const resolvedRole = await resolveUserRole(user.userId);
        const isAdmin = resolvedRole === "Admin";
        
        // Fetch notes: 
        // - Must belong to incident
        // - If not Admin, must not be deleted
        // - If Private, must belong to the current user
        const notes = await db.select()
            .from(incident_internal_notes)
            .where(
                and(
                    eq(incident_internal_notes.incidentId, incidentId),
                    isAdmin ? undefined : isNull(incident_internal_notes.deletedAt),
                    or(
                        eq(incident_internal_notes.visibility, 'Public'),
                        eq(incident_internal_notes.authorId, user.userId)
                    )
                )
            )
            .orderBy(
                desc(incident_internal_notes.isPinned),
                desc(incident_internal_notes.createdAt)
            );
            
        return notes;
    }

    /**
     * Toggle the pinned status of an internal note
     */
    static async togglePin(noteId: number, user: CurrentUser, isPinned: boolean) {
        await this.verifyInternalAccess(user.userId);
        
        const note = await db.query.incident_internal_notes.findFirst({
            where: eq(incident_internal_notes.id, noteId)
        });
        
        if (note?.deletedAt !== null) {
            throw createStatusError("Note Not Found!", 404);
        }
        
        // Let's assume any internal user can pin/unpin notes if they can see them.
        // If it's a private note they don't own, they can't even see it, but we should enforce it:
        if (note.visibility === 'Private' && note.authorId !== user.userId) {
            throw createStatusError("Forbidden: You cannot modify this private note.", 403);
        }

        const [updatedNote] = await db.update(incident_internal_notes)
            .set({ isPinned, updatedAt: new Date() })
            .where(eq(incident_internal_notes.id, noteId))
            .returning();
            
        return updatedNote;
    }

    /**
     * Delete an internal note (Soft delete)
     */
    static async deleteNote(noteId: number, user: CurrentUser) {
        await this.verifyInternalAccess(user.userId);
        
        const note = await db.query.incident_internal_notes.findFirst({
            where: eq(incident_internal_notes.id, noteId)
        });
        
        if (note?.deletedAt !== null) {
            throw createStatusError("Note Not Found!", 404);
        }
        
        if (note.authorId !== user.userId) {
            throw createStatusError("Forbidden: You can only delete your own notes.", 403);
        }
        
        await db.update(incident_internal_notes)
            .set({ deletedAt: new Date() })
            .where(eq(incident_internal_notes.id, noteId));
            
        return { success: true };
    }
}
