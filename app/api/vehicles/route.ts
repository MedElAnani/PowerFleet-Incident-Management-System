import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { createVehicle } from "@/lib/services/vehicles";

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try{
        const currentUser = req.user!;
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        
        const newVehicle = await createVehicle(body, currentUser.userId);
        
        return NextResponse.json(
            newVehicle,
            { status: 201 }
        )
    }catch(error: any){
        console.error("Vehicle creation route caught an error:", error);

        if (error.status) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}, "InternalUser")