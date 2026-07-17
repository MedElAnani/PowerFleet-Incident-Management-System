import { NextResponse } from "next/server"
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 

import { SecurityAudit } from "@/lib/services/securityaudit.service";
import { withAudit } from "@/lib/utils/audit";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    return withAudit(req, 'GET /securitylogs', async () => {
        const currentUser = req.user!;
        const data = await SecurityAudit.getAllSecurityAudit(currentUser.userId);
        
        return NextResponse.json({ success: true, data });
    });
}, "Admin");