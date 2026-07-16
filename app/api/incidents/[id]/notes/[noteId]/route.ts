import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { InternalNoteService } from "@/lib/services/internal-note.service";
import { z } from "zod";

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
        const { noteId: noteIdStr } = await params;
        const noteId = parseInt(noteIdStr);

        if (isNaN(noteId)) {
            return NextResponse.json({ error: "Invalid Note ID" }, { status: 400 });
        }

        const body = await req.json();
        
        const parsedData = updateNoteSchema.safeParse(body);
        if (!parsedData.success) {
            return NextResponse.json({ error: "Validation failed", details: parsedData.error.flatten() }, { status: 400 });
        }

        const updatedNote = await InternalNoteService.togglePin(noteId, currentUser, parsedData.data.isPinned);
        return NextResponse.json({ success: true, data: updatedNote });
    } catch (error) {
        const err = error as Error & { status?: number };
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
        const { noteId: noteIdStr } = await params;
        const noteId = parseInt(noteIdStr);

        if (isNaN(noteId)) {
            return NextResponse.json({ error: "Invalid Note ID" }, { status: 400 });
        }

        await InternalNoteService.deleteNote(noteId, currentUser);
        return NextResponse.json({ success: true, message: "Note deleted successfully" });
    } catch (error) {
        const err = error as Error & { status?: number };
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: err.status || 500 }
        );
    }
}, "InternalUser");
