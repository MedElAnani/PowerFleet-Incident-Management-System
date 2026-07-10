import { NextResponse } from "next/server"
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 
import { db } from "@/db"
import { vehicles, clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
        const { id } = await params;
        const vehicleId = Number(id);
        const currentUser = req.user!;
        
        if (isNaN(vehicleId)) {
            return NextResponse.json(
                { error: "Invalid vehicle ID" },
                { status: 400 }
            );
        }
        
        // Find the incident by ID
        const vehicle = await db.query.vehicles.findFirst({
            where: eq(vehicles.id, vehicleId),
            with: {
                incidents: true
            }
        });
        
        if (!vehicle) {
            return NextResponse.json(
                { error: "Vehicle Not Found!" },
                { status: 404 }
            );
        }
        
        // Security Check: If a Client logs in, ensure they can only look at their own reports
        if (currentUser.role === "ClientUser") {
            const clientRecord = await db.query.clients.findFirst({
                where: eq(clients.userId, currentUser.userId),
            });
            
            if (!clientRecord || vehicle.clientId !== clientRecord.id) {
                return NextResponse.json(
                    { error: "Forbidden: You cannot access this vehicle!" }, 
                    { status: 403 }
                );
            }
        }
        
        // Returns the clear incident layout safely
        return NextResponse.json(vehicle);

    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
});