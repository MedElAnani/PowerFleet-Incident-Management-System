import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { AttachmentService } from "@/lib/services/attachment.service";
import { withAudit } from "@/lib/utils/audit";

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, attachmentId: string }> }) => {
    return withAudit(req, 'DELETE /incidents/[id]/attachment/[attachmentId]', async () => {
        const { attachmentId } = await params;
        const targetAttachmentId = Number(attachmentId);
        const currentUser = req.user!;
        
        if (Number.isNaN(targetAttachmentId)) {
            return NextResponse.json({ error: "Invalid attachment ID" }, { status: 400 });
        }
        
        await AttachmentService.deleteAttachment(targetAttachmentId, currentUser.userId);
        
        return NextResponse.json({ success: true, message: "Attachment deleted successfully." });
    });
});
