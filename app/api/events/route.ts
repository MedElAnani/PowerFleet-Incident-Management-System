import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { EventService } from "@/lib/services/event.service";
import { SecurityAudit } from "@/lib/services/securityaudit.service";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const currentUser = req.user!;

        const data = await EventService.getEventIncidents({
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser",
        });
        
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'GET /events', message: "Success", statusCode: 200}, req, currentUser.userId)
        return NextResponse.json(data, { status: 200 });
    } catch (error: unknown) {
        console.error("Get incidents route caught an error:", error);
        const err = error as Error;
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
}, 'InternalUser');