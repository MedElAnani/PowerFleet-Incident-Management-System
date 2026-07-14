import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { AttachmentService } from '@/lib/services/attachment.service';

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
        
        const newAttachment = await AttachmentService.createAttachment(body, {
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser" | "Admin" | "Support Manager" | "Technician"
        }, incidentId);

        return NextResponse.json(newAttachment, { status: 201 });
    } catch (error: unknown) {
        console.error("Create attachment route caught an error:", error);
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