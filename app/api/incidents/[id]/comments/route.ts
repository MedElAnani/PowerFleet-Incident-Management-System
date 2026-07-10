import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { createComment } from "@/lib/services/comments";

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const incidentId = Number(id);
        
        if (isNaN(incidentId)) {
            return NextResponse.json(
                { error: "Invalid incident ID" },
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
        
        const newComment = await createComment(body, {
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser"
        }, incidentId);

        return NextResponse.json(newComment, { status: 201 });
    } catch (error: any) {
        console.error("Create comment route caught an error:", error);

        if (error.status) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
});