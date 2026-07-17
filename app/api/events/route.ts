import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { EventService } from "@/lib/services/event.service";
import { withAudit } from "@/lib/utils/audit";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    return withAudit(req, 'GET /events', async () => {
        const currentUser = req.user!;

        const data = await EventService.getEventIncidents({
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser",
        });
        
        return NextResponse.json(data, { status: 200 });
    });
}, 'InternalUser');