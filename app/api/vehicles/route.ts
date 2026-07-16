import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { VehicleService } from "@/lib/services/vehicle.service";

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try{
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
    } catch (error: unknown) {
        console.error("Vehicle creation route caught an error:", error);
        const err = error as { status?: number; message?: string };

        if (err.status) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }

        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
}, "Admin")