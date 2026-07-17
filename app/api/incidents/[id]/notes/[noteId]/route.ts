import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { InternalNoteService } from "@/lib/services/internal-note.service";
import { z } from "zod";
import { SecurityAudit } from "@/lib/services/securityaudit.service";
const updateNoteSchema = z.object({
    isPinned: z.boolean()
});

// PATCH: Toggle pin status of a note
export const PATCH = withAuth(async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string, noteId: string }> }
) => {
    try {
        const currentUser = req.user!;
        const { id, noteId: noteIdStr } = await params;
        const incidentId = Number(id);
        const noteId = Number.parseInt(noteIdStr);

        if (Number.isNaN(noteId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/notes/[noteId]', message: "Invalid Note ID", statusCode: 400, incidentTragetId: incidentId}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid Note ID" }, { status: 400 });
        }

        const body = await req.json();
        
        const parsedData = updateNoteSchema.safeParse(body);
        if (!parsedData.success) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/notes/[noteId]', message: "Validation failed", statusCode: 400, incidentTragetId: incidentId}, req, currentUser.userId);
            return NextResponse.json({ error: "Validation failed", details: parsedData.error.flatten() }, { status: 400 });
        }

        const updatedNote = await InternalNoteService.togglePin(noteId, currentUser, parsedData.data.isPinned);
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/notes/[noteId]', message: "Internal note pinned/unpinned successfully", statusCode: 200, incidentTragetId: incidentId}, req, currentUser.userId);
        return NextResponse.json({ success: true, data: updatedNote });
    } catch (error) {
        const err = error as Error & { status?: number };
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/notes/[noteId]', message: err.message || "Internal Server Error", statusCode: err.status || 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: err.status || 500 }
        );
    }
}, "InternalUser");

// DELETE: Soft delete a note
export const DELETE = withAuth(async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string, noteId: string }> }
) => {
    try {
        const currentUser = req.user!;
        const { id, noteId: noteIdStr } = await params;
        const incidentId = Number(id);
        const noteId = Number.parseInt(noteIdStr);

        if (Number.isNaN(noteId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/notes/[noteId]', message: "Invalid Note ID", statusCode: 400, incidentTragetId: incidentId}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid Note ID" }, { status: 400 });
        }

        await InternalNoteService.deleteNote(noteId, currentUser);
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/notes/[noteId]', message: "Note deleted successfully", statusCode: 200, incidentTragetId: incidentId}, req, currentUser.userId);
        return NextResponse.json({ success: true, message: "Note deleted successfully" });
    } catch (error) {
        const err = error as Error & { status?: number };
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/notes/[noteId]', message: err.message || "Internal Server Error", statusCode: err.status || 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: err.status || 500 }
        );
    }
}, "InternalUser");
