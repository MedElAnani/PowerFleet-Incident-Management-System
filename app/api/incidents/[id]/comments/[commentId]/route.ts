import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { updateComment } from "@/lib/services/comments";

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string, commentId: string }> }) => {
    try {
        const { id, commentId } = await params;
        const incidentId = Number(id);
        const targetCommentId = Number(commentId);
        
        if (isNaN(incidentId)) {
            return NextResponse.json(
                { error: "Invalid incident ID" },
                { status: 400 }
            );
        }

        if (isNaN(targetCommentId)) {
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
        
        const upComment = await updateComment(visibility, {
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser"
        }, incidentId, targetCommentId);

        return NextResponse.json(upComment, { status: 200 });
    } catch (error: any) {
        console.error("Update comment visibility route caught an error:", error);

        if (error.status) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
});