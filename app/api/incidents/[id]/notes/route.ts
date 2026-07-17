import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { InternalNoteService } from "@/lib/services/internal-note.service";
import { createInternalNoteSchema } from "@/lib/services/validations/incident";
import { withAudit } from "@/lib/utils/audit";
// GET: Retrieve all notes for an incident
export const GET = withAuth(async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    return withAudit(req, 'GET /incidents/[id]/notes', async () => {
        const currentUser = req.user!;
        const { id } = await params;
        const incidentId = Number.parseInt(id);

        if (Number.isNaN(incidentId)) {
            return NextResponse.json({ error: "Invalid Incident ID" }, { status: 400 });
        }

        const notes = await InternalNoteService.getNotes(incidentId, currentUser);
        return NextResponse.json({ success: true, data: notes });
    });
}, "InternalUser");

// POST: Create a new internal note
export const POST = withAuth(async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    return withAudit(req, 'POST /incidents/[id]/notes', async () => {
        const currentUser = req.user!;
        const { id } = await params;
        const incidentId = Number.parseInt(id);

        if (Number.isNaN(incidentId)) {
            return NextResponse.json({ error: "Invalid Incident ID" }, { status: 400 });
        }

        const body = await req.json();
        
        // Validate payload
        const parsedData = createInternalNoteSchema.safeParse(body);
        if (!parsedData.success) {
            return NextResponse.json({ error: "Validation failed", details: parsedData.error.flatten() }, { status: 400 });
        }

        const newNote = await InternalNoteService.createNote(incidentId, currentUser, parsedData.data);
        return NextResponse.json({ success: true, data: newNote }, { status: 201 });
    });
}, "InternalUser");
