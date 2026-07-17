import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { VehicleService } from "@/lib/services/vehicle.service";
import { SecurityAudit } from "@/lib/services/securityaudit.service";
export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try{
        const currentUser = req.user!;
        let body;
        try {
            body = await req.json();
        } catch {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /vehicles', message: "Invalid JSON body", statusCode: 400}, req, currentUser.userId);
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        
        const newVehicle = await VehicleService.createVehicle(body, currentUser.userId);
        
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /vehicles', message: "Vehicle created successfully", statusCode: 201}, req, currentUser.userId);
        return NextResponse.json(
            newVehicle,
            { status: 201 }
        )
    } catch (error: unknown) {
        console.error("Vehicle creation route caught an error:", error);
        const err = error as { status?: number; message?: string };

        if (err.status) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /vehicles', message: err.message || "Error", statusCode: err.status}, req, req.user?.userId);
            return NextResponse.json({ error: err.message }, { status: err.status });
        }

        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST /vehicles', message: err.message || "Internal Server Error", statusCode: 500}, req, req.user?.userId);
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
}, "Admin")