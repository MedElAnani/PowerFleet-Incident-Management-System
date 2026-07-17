import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { InternalNoteService } from "@/lib/services/internal-note.service";
import { z } from "zod";
import { withAudit } from "@/lib/utils/audit";
const updateNoteSchema = z.object({
    isPinned: z.boolean()
});

// PATCH: Toggle pin status of a note
export const PATCH = withAuth(async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string, noteId: string }> }
) => {
    return withAudit(req, 'PATCH /incidents/[id]/notes/[noteId]', async () => {
        const currentUser = req.user!;
        const { noteId: noteIdStr } = await params;
        const noteId = Number.parseInt(noteIdStr);

        if (Number.isNaN(noteId)) {
            return NextResponse.json({ error: "Invalid Note ID" }, { status: 400 });
        }

        const body = await req.json();
        
        const parsedData = updateNoteSchema.safeParse(body);
        if (!parsedData.success) {
            return NextResponse.json({ error: "Validation failed", details: parsedData.error.flatten() }, { status: 400 });
        }

        const updatedNote = await InternalNoteService.togglePin(noteId, currentUser, parsedData.data.isPinned);
        return NextResponse.json({ success: true, data: updatedNote });
    });
}, "InternalUser");

// DELETE: Soft delete a note
export const DELETE = withAuth(async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string, noteId: string }> }
) => {
    return withAudit(req, 'DELETE /incidents/[id]/notes/[noteId]', async () => {
        const currentUser = req.user!;
        const { noteId: noteIdStr } = await params;
        const noteId = Number.parseInt(noteIdStr);

        if (Number.isNaN(noteId)) {
            return NextResponse.json({ error: "Invalid Note ID" }, { status: 400 });
        }

        await InternalNoteService.deleteNote(noteId, currentUser);
        return NextResponse.json({ success: true, message: "Note deleted successfully" });
    });
}, "InternalUser");
