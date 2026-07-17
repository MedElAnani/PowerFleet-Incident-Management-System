import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { AttachmentService } from "@/lib/services/attachment.service";
import { SecurityAudit } from "@/lib/services/securityaudit.service";
export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, attachmentId: string }> }) => {
    try {
        const { id, attachmentId } = await params;
        const incidentId = Number(id);
        const targetAttachmentId = Number(attachmentId);
        const currentUser = req.user!;
        
        if (Number.isNaN(targetAttachmentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/attachment/[attachmentId]', message: "Invalid attachment ID", statusCode: 400, incidentTragetId: incidentId}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid attachment ID" }, { status: 400 });
        }
        
        await AttachmentService.deleteAttachment(targetAttachmentId, currentUser.userId);
        
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/attachment/[attachmentId]', message: "Attachment deleted successfully.", statusCode: 200, incidentTragetId: incidentId}, req, currentUser.userId);
        return NextResponse.json({ success: true, message: "Attachment deleted successfully." });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;
        if (err.status) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/attachment/[attachmentId]', message: err.message || "Error", statusCode: err.status, incidentTragetId: incidentId}, req, req.user?.userId);
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/attachment/[attachmentId]', message: err.message || "Internal Server Error", statusCode: 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
});
