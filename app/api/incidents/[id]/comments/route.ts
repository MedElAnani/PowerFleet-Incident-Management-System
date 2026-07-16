import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { CommentService } from "@/lib/services/comment.service";

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const incidentId = Number(id);
        if (Number.isNaN(incidentId)) {
            return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
        }

        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        
        const newComment = await CommentService.createComment(body, {
            userId: req.user!.userId,
            role: req.user!.role as "ClientUser" | "InternalUser"
        }, incidentId);

        return NextResponse.json(newComment, { status: 201 });
    } catch (error: unknown) {
        console.error("Create comment error:", error);
        const err = error as Error & { status?: number };
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: err.status || 500 }
        );
    }
});