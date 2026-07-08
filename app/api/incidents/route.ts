import { NextResponse } from "next/server";
// Relative imports based on: app/api/incidents/route.ts
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 
import { createIncident } from "../../../lib/services/incidents"; 

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        // 1. Extract the current authenticated user from your middleware
        const currentUser = req.user!; 
        
        // 2. Parse the request body JSON
        const body = await req.json();

        // 3. Hand over execution to the service layer method
        const newIncident = await createIncident(body, currentUser.userId);

        // 4. Return the successfully created incident database record
        return NextResponse.json(newIncident, { status: 201 });

    } catch (error: any) {
        console.error("Incident creation route caught an error:", error);

        // Catch validation errors thrown from the service layer
        if (error.status) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        // Catch PostgreSQL Foreign Key constraint failures
        if (error.constraint_name === 'incidents_vehicle_id_vehicles_id_fk') {
            return NextResponse.json({ error: "The provided vehicle ID does not exist." }, { status: 422 });
        }
        if (error.constraint_name === 'incidents_client_id_clients_id_fk') {
            return NextResponse.json({ error: "Your client account record is invalid." }, { status: 422 });
        }

        // Fallback catch-all
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message }, 
            { status: 500 }
        );
    }
}, "client");