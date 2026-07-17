import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { VehicleService } from "@/lib/services/vehicle.service";
import { withAudit } from "@/lib/utils/audit";

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    return withAudit(req, 'POST /vehicles', async () => {
        const currentUser = req.user!;
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        
        const newVehicle = await VehicleService.createVehicle(body, currentUser.userId);
        
        return NextResponse.json(
            newVehicle,
            { status: 201 }
        )
    });
}, "Admin")