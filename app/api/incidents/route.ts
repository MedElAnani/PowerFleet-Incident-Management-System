import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { IncidentService } from "@/lib/services/incident.service";
import { getIncidentsFilterSchema } from "@/lib/services/validations/incident";
import { SecurityAudit } from "@/lib/services/securityaudit.service";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const currentUser = req.user!;
        const url = new URL(req.url)
        const searchParams = Object.fromEntries(url.searchParams.entries())
        
        // Validate search params
        const parsedFilters = getIncidentsFilterSchema.safeParse(searchParams)
        
        if(!parsedFilters) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents', message: "Invalid Filters", statusCode: 400}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid Filters" }, { status: 400 })
        }

        const data = await IncidentService.getIncidents({
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser",
        }, parsedFilters.data);

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents', message: "Success", statusCode: 200}, req, currentUser.userId);
        return NextResponse.json(data, { status: 200 });
    } catch (error: unknown) {
        console.error("Get incidents route caught an error:", error);
        const err = error as Error;
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /incidents', message: err.message || "Internal Server Error", statusCode: 500}, req, req.user?.userId);
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const currentUser = req.user!;
        const body = await req.json();

        const newIncident = await IncidentService.createTicket(body, currentUser.userId);

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents', message: "Incident created successfully", statusCode: 201}, req, currentUser.userId);
        return NextResponse.json(newIncident, { status: 201 });
    } catch (error: unknown) {
        console.error("Incident creation route caught an error:", error);
        const err = error as { status?: number; message?: string; constraint?: string };

        if (err.status) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents', message: err.message || "Error", statusCode: err.status}, req, req.user?.userId);
            return NextResponse.json({ error: err.message }, { status: err.status });
        }

        if (err.constraint === 'incidents_vehicle_id_vehicles_id_fk') {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents', message: "The provided vehicle ID does not exist.", statusCode: 422}, req, req.user?.userId);
            return NextResponse.json({ error: "The provided vehicle ID does not exist." }, { status: 422 });
        }
        if (err.constraint === 'incidents_client_id_clients_id_fk') {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents', message: "Your client account record is invalid.", statusCode: 422}, req, req.user?.userId);
            return NextResponse.json({ error: "Your client account record is invalid." }, { status: 422 });
        }

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /incidents', message: err.message || "Internal Server Error", statusCode: 500}, req, req.user?.userId);
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
}, "ClientUser");