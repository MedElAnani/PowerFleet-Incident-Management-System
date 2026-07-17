import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { AttachmentService } from '@/lib/services/attachment.service';
import { SecurityAudit } from '@/lib/services/securityaudit.service';
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const incidentId = Number(id);
        const currentUser = req.user!;
        
        if (Number.isNaN(incidentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/attachment', message: "Invalid incident ID", statusCode: 400}, req, currentUser.userId);
            return NextResponse.json(
                { error: "Invalid incident ID" },
                { status: 400 }
            );
        }

        let body;
        try {
            body = await req.json();
        } catch {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/attachment', message: "Invalid JSON body", statusCode: 400, incidentTragetId: incidentId}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        
        const newAttachment = await AttachmentService.createAttachment(body, {
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser" | "Admin" | "Support Manager" | "Technician"
        }, incidentId);

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/attachment', message: "Attachment created successfully", statusCode: 201, incidentTragetId: incidentId}, req, currentUser.userId);
        return NextResponse.json(newAttachment, { status: 201 });
    } catch (error: unknown) {
        console.error("Create attachment route caught an error:", error);
        const err = error as { status?: number; message?: string };
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;

        if (err.status) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/attachment', message: err.message || "Error", statusCode: err.status, incidentTragetId: incidentId}, req, req.user?.userId);
            return NextResponse.json({ error: err.message }, { status: err.status });
        }

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/attachment', message: err.message || "Internal Server Error", statusCode: 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
});