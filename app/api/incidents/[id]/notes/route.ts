import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { InternalNoteService } from "@/lib/services/internal-note.service";
import { createInternalNoteSchema } from "@/lib/services/validations/incident";
import { SecurityAudit } from "@/lib/services/securityaudit.service";
// GET: Retrieve all notes for an incident
export const GET = withAuth(async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const currentUser = req.user!;
        const { id } = await params;
        const incidentId = Number.parseInt(id);

        if (Number.isNaN(incidentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents/[id]/notes', message: "Invalid Incident ID", statusCode: 400}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid Incident ID" }, { status: 400 });
        }

        const notes = await InternalNoteService.getNotes(incidentId, currentUser);
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents/[id]/notes', message: "Success", statusCode: 200, incidentTragetId: incidentId}, req, currentUser.userId);
        return NextResponse.json({ success: true, data: notes });
    } catch (error) {
        const err = error as Error & { status?: number };
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents/[id]/notes', message: err.message || "Internal Server Error", statusCode: err.status || 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: err.status || 500 }
        );
    }
}, "InternalUser");

// POST: Create a new internal note
export const POST = withAuth(async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const currentUser = req.user!;
        const { id } = await params;
        const incidentId = Number.parseInt(id);

        if (Number.isNaN(incidentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/notes', message: "Invalid Incident ID", statusCode: 400}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid Incident ID" }, { status: 400 });
        }

        const body = await req.json();
        
        // Validate payload
        const parsedData = createInternalNoteSchema.safeParse(body);
        if (!parsedData.success) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/notes', message: "Validation failed", statusCode: 400, incidentTragetId: incidentId}, req, currentUser.userId);
            return NextResponse.json({ error: "Validation failed", details: parsedData.error.flatten() }, { status: 400 });
        }

        const newNote = await InternalNoteService.createNote(incidentId, currentUser, parsedData.data);
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/notes', message: "Internal note created successfully", statusCode: 201, incidentTragetId: incidentId}, req, currentUser.userId);
        return NextResponse.json({ success: true, data: newNote }, { status: 201 });
    } catch (error) {
        const err = error as Error & { status?: number };
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/notes', message: err.message || "Internal Server Error", statusCode: err.status || 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: err.status || 500 }
        );
    }
}, "InternalUser");
