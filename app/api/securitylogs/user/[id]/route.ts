import { NextResponse } from "next/server"
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 
import { SecurityAudit } from "@/lib/services/securityaudit.service";
import { withAudit } from "@/lib/utils/audit";

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    return withAudit(req, 'GET /securitylogs/user/[id]', async () => {
        const { id } = await params;
        const targetUserId = Number(id);

        if (Number.isNaN(targetUserId)) {
            return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
        }

        const currentUser = req.user!;
        const data = await SecurityAudit.getSecurityAuditByUser(currentUser.userId, targetUserId);
        
        return NextResponse.json({ success: true, data });
    });
}, "Admin");
