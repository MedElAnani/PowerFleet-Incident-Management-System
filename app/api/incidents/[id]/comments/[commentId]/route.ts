import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { CommentService } from "@/lib/services/comment.service";

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, commentId: string }> }) => {
    try {
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
    } catch (error: unknown) {
        console.error("Update comment visibility route caught an error:", error);
        const err = error as { status?: number; message?: string };

        if (err.status) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }

        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
});

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, commentId: string }> }) => {
    try {
        const { commentId } = await params;
        const targetCommentId = Number(commentId);
        const currentUser = req.user!;
        
        if (Number.isNaN(targetCommentId)) {
            return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
        }
        
        await CommentService.deleteComment(targetCommentId, currentUser.userId);
        
        return NextResponse.json({ success: true, message: "Comment deleted successfully." });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
});