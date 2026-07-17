import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { SecurityAudit } from "@/lib/services/securityaudit.service";

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const currentUser = req.user!;
        const { id } = await params;
        const targetIncidentId = Number(id);

        if (Number.isNaN(targetIncidentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /securitylogs/incident/[id]', message: "Invalid Incident ID", statusCode: 400}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid Incident ID" }, { status: 400 });
        }

        const data = await SecurityAudit.getSecurityAuditByIncident(currentUser.userId, targetIncidentId);
        
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /securitylogs/incident/[id]', message: "Success", statusCode: 200, incidentTragetId: targetIncidentId}, req, currentUser.userId);
        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const incidentIdStr = req.url.split('/incident/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;

        if (err.status) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /securitylogs/incident/[id]', message: err.message || "Error", statusCode: err.status, incidentTragetId: incidentId}, req, req.user?.userId);
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /securitylogs/incident/[id]', message: err.message || "Internal Server Error", statusCode: 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}, "Admin");