import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { IncidentService } from "@/lib/services/incident.service";
import { getIncidentsFilterSchema } from "@/lib/services/validations/incident";
import { withAudit } from "@/lib/utils/audit";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    return withAudit(req, 'GET /incidents', async () => {
        const currentUser = req.user!;
        const url = new URL(req.url)
        const searchParams = Object.fromEntries(url.searchParams.entries())
        
        // Validate search params
        const parsedFilters = getIncidentsFilterSchema.safeParse(searchParams)
        
        if(!parsedFilters.success) {
            return NextResponse.json({ error: "Invalid Filters" }, { status: 400 })
        }

        const data = await IncidentService.getIncidents({
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser",
        }, parsedFilters.data);

        return NextResponse.json(data, { status: 200 });
    });
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    return withAudit(req, 'POST /incidents', async () => {
        const currentUser = req.user!;
        const body = await req.json();

        try {
            const newIncident = await IncidentService.createTicket(body, currentUser.userId);
            return NextResponse.json(newIncident, { status: 201 });
        } catch (error: unknown) {
            const err = error as { status?: number; message?: string; constraint?: string };

            if (err.constraint === 'incidents_vehicle_id_vehicles_id_fk') {
                return NextResponse.json({ error: "The provided vehicle ID does not exist." }, { status: 422 });
            }
            if (err.constraint === 'incidents_client_id_clients_id_fk') {
                return NextResponse.json({ error: "Your client account record is invalid." }, { status: 422 });
            }

            throw error;
        }
    });
}, "ClientUser");