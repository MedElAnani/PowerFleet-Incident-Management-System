import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { CommentService } from "@/lib/services/comment.service";
import { SecurityAudit } from "@/lib/services/securityaudit.service";
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const incidentId = Number(id);
        if (Number.isNaN(incidentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/comments', message: "Invalid incident ID", statusCode: 400}, req, req.user?.userId);
            return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
        }

        const body = await req.json().catch(() => null);
        if (!body) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/comments', message: "Invalid JSON body", statusCode: 400, incidentTragetId: incidentId}, req, req.user?.userId);
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        
        const newComment = await CommentService.createComment(body, {
            userId: req.user!.userId,
            role: req.user!.role as "ClientUser" | "InternalUser"
        }, incidentId);

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/comments', message: "Comment created successfully", statusCode: 201, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(newComment, { status: 201 });
    } catch (error: unknown) {
        console.error("Create comment error:", error);
        const err = error as Error & { status?: number };
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents/[id]/comments', message: err.message || "Internal Server Error", statusCode: err.status || 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: err.status || 500 }
        );
    }
});