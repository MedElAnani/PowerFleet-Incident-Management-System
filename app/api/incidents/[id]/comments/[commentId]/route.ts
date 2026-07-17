import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { CommentService } from "@/lib/services/comment.service";
import { SecurityAudit } from "@/lib/services/securityaudit.service";
export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, commentId: string }> }) => {
    try {
        const { id, commentId } = await params;
        const incidentId = Number(id);
        const targetCommentId = Number(commentId);
        
        if (Number.isNaN(incidentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/comments/[commentId]', message: "Invalid incident ID", statusCode: 400}, req, req.user?.userId);
            return NextResponse.json(
                { error: "Invalid incident ID" },
                { status: 400 }
            );
        }

        if (Number.isNaN(targetCommentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/comments/[commentId]', message: "Invalid comment ID", statusCode: 400, incidentTragetId: incidentId}, req, req.user?.userId);
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
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/comments/[commentId]', message: "Invalid JSON body", statusCode: 400, incidentTragetId: incidentId}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { visibility } = body;
        if (!visibility || (visibility !== "Public" && visibility !== "Private")) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/comments/[commentId]', message: "Visibility must be 'Public' or 'Private'", statusCode: 400, incidentTragetId: incidentId}, req, currentUser.userId);
            return NextResponse.json(
                { error: "Visibility must be 'Public' or 'Private'" },
                { status: 400 }
            );
        }
        
        const upComment = await CommentService.updateComment(visibility, {
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser"
        }, incidentId, targetCommentId);

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/comments/[commentId]', message: "Comment updated successfully", statusCode: 200, incidentTragetId: incidentId}, req, currentUser.userId);
        return NextResponse.json(upComment, { status: 200 });
    } catch (error: unknown) {
        console.error("Update comment visibility route caught an error:", error);
        const err = error as { status?: number; message?: string };
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;

        if (err.status) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/comments/[commentId]', message: err.message || "Error", statusCode: err.status, incidentTragetId: incidentId}, req, req.user?.userId);
            return NextResponse.json({ error: err.message }, { status: err.status });
        }

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'PATCH /incidents/[id]/comments/[commentId]', message: err.message || "Internal Server Error", statusCode: 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
});

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, commentId: string }> }) => {
    try {
        const { id, commentId } = await params;
        const incidentId = Number(id);
        const targetCommentId = Number(commentId);
        const currentUser = req.user!;
        
        if (Number.isNaN(targetCommentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/comments/[commentId]', message: "Invalid comment ID", statusCode: 400, incidentTragetId: incidentId}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
        }
        
        await CommentService.deleteComment(targetCommentId, currentUser.userId);
        
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/comments/[commentId]', message: "Comment deleted successfully.", statusCode: 200, incidentTragetId: incidentId}, req, currentUser.userId);
        return NextResponse.json({ success: true, message: "Comment deleted successfully." });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;
        if (err.status) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/comments/[commentId]', message: err.message || "Error", statusCode: err.status, incidentTragetId: incidentId}, req, req.user?.userId);
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'DELETE /incidents/[id]/comments/[commentId]', message: err.message || "Internal Server Error", statusCode: 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
});