import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { db } from "@/db";
import { incident_events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SecurityAudit } from "@/lib/services/securityaudit.service";
export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const incidentId = Number(id);
        
        if (Number.isNaN(incidentId)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents/[id]/events', message: "Invalid incident ID", statusCode: 400}, req, req.user?.userId);
            return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
        }

        const events = await db.query.incident_events.findMany({
            where: eq(incident_events.incidentId, incidentId),
            orderBy: (events, { desc }) => [desc(events.createdAt)],
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                    }
                }
            }
        });
        
        if (!events || events.length === 0) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents/[id]/events', message: "This Incident Don't Have Any Events Yet !", statusCode: 200, incidentTragetId: incidentId}, req, req.user?.userId);
            return NextResponse.json({ error: "This Incident Don't Have Any Events Yet !" }, { status: 200 });
        }

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents/[id]/events', message: "Success", statusCode: 200, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(events, { status: 200 });
    } catch (error: unknown) {
        console.error("Get incident events route caught an error:", error);
        const err = error as Error;
        const incidentIdStr = req.url.split('/incidents/')[1]?.split('/')[0];
        const incidentId = incidentIdStr ? Number(incidentIdStr) : undefined;
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents/[id]/events', message: err.message || "Internal Server Error", statusCode: 500, incidentTragetId: incidentId}, req, req.user?.userId);
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
});
