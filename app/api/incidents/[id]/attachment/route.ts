import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { AttachmentService } from '@/lib/services/attachment.service';
import { withAudit } from '@/lib/utils/audit';

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    return withAudit(req, 'POST /incidents/[id]/attachment', async () => {
        const { id } = await params;
        const incidentId = Number(id);
        const currentUser = req.user!;
        
        if (Number.isNaN(incidentId)) {
            return NextResponse.json(
                { error: "Invalid incident ID" },
                { status: 400 }
            );
        }

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
    });
});