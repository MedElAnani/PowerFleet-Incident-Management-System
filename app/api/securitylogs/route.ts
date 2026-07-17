import { NextResponse } from "next/server"
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 

import { SecurityAudit } from "@/lib/services/securityaudit.service";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const currentUser = req.user!;
        const data = await SecurityAudit.getAllSecurityAudit(currentUser.userId);
        
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /securitylogs', message: "", statusCode: 200}, req, currentUser.userId);
        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /securitylogs', message: err.message || "Error", statusCode: err.status}, req, req.user?.userId);
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /securitylogs', message: err.message || "Internal Server Error", statusCode: 500}, req, req.user?.userId);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}, "Admin");