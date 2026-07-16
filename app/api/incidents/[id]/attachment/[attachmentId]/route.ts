import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { AttachmentService } from "@/lib/services/attachment.service";

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, attachmentId: string }> }) => {
    try {
        const { attachmentId } = await params;
        const targetAttachmentId = Number(attachmentId);
        const currentUser = req.user!;
        
        if (Number.isNaN(targetAttachmentId)) {
            return NextResponse.json({ error: "Invalid attachment ID" }, { status: 400 });
        }
        
        await AttachmentService.deleteAttachment(targetAttachmentId, currentUser.userId);
        
        return NextResponse.json({ success: true, message: "Attachment deleted successfully." });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
});
