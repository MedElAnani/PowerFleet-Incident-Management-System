import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { SecurityAudit } from "@/lib/services/securityaudit.service";
import { withAudit } from "@/lib/utils/audit";

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    return withAudit(req, 'GET /securitylogs/incident/[id]', async () => {
        const { id } = await params;
        const incidentId = Number(id);

        if (Number.isNaN(incidentId)) {
            return NextResponse.json({ error: "Invalid incident ID format" }, { status: 400 });
        }

        const currentUser = req.user!;
        const data = await SecurityAudit.getSecurityAuditByIncident(currentUser.userId, incidentId);
        
        return NextResponse.json({ success: true, data });
    });
}, "Admin");