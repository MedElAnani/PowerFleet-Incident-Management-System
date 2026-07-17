import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { CommentService } from "@/lib/services/comment.service";
import { withAudit } from "@/lib/utils/audit";

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, commentId: string }> }) => {
    return withAudit(req, 'PATCH /incidents/[id]/comments/[commentId]', async () => {
        const { id, commentId } = await params;
        const incidentId = Number(id);
        const targetCommentId = Number(commentId);
        
        if (Number.isNaN(incidentId)) {
            return NextResponse.json(
                { error: "Invalid incident ID" },
                { status: 400 }
            );
        }

        if (Number.isNaN(targetCommentId)) {
            return NextResponse.json(
                { error: "Invalid comment ID" },
                { status: 400 }
            );
        }

        const currentUser = req.user!;
        
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { visibility } = body;
        if (!visibility || (visibility !== "Public" && visibility !== "Private")) {
            return NextResponse.json(
                { error: "Visibility must be 'Public' or 'Private'" },
                { status: 400 }
            );
        }
        
        const upComment = await CommentService.updateComment(visibility, {
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser"
        }, incidentId, targetCommentId);

        return NextResponse.json(upComment, { status: 200 });
    });
});

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, commentId: string }> }) => {
    return withAudit(req, 'DELETE /incidents/[id]/comments/[commentId]', async () => {
        const { commentId } = await params;
        const targetCommentId = Number(commentId);
        const currentUser = req.user!;
        
        if (Number.isNaN(targetCommentId)) {
            return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
        }
        
        await CommentService.deleteComment(targetCommentId, currentUser.userId);
        
        return NextResponse.json({ success: true, message: "Comment deleted successfully." });
    });
});