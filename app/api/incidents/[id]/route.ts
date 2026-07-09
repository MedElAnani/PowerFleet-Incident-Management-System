import { NextResponse } from "next/server"
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 
import { db } from "@/db"
import { incidents, clients, internal_users, technicians } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateIncident } from "@/lib/services/incidents";

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
        const { id } = await params;
        const incidentId = Number(id);
        const currentUser = req.user!;
        
        // Find the incident by ID
        const incident = await db.query.incidents.findFirst({
            where: eq(incidents.id, incidentId)
        });
        
        if (!incident) {
            return NextResponse.json(
                { error: "Incident Not Found!" },
                { status: 404 }
            );
        }
        
        // Security Check: If a Client logs in, ensure they can only look at their own reports
        if (currentUser.role === "ClientUser") {
            const clientRecord = await db.query.clients.findFirst({
                where: eq(clients.userId, currentUser.userId),
            });
            
            if (!clientRecord || incident.reportedById !== clientRecord.id) {
                return NextResponse.json(
                    { error: "Forbidden: You cannot access this incident!" }, 
                    { status: 403 }
                );
            }
        }
        
        const internalUserRecord = await db.query.internal_users.findFirst({
            where: eq(internal_users.userId, currentUser.userId)
        })
        
        if(internalUserRecord?.internalRole === "Technician"){
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, internalUserRecord.id)
            })
            
            if(techRecord?.id !== incident.assignedToId){
                return NextResponse.json(
                    { error: "Forbidden: You cannot access this incident!" }, 
                    { status: 403 }
                );
            }
        }
        
        // Returns the clear incident layout safely
        return NextResponse.json(incident);

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
});

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try{
        const { id } = await params;
        const incidentId = Number(id);
        const currentUser = req.user!;
        
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        
        const newUpdatedIncident = await updateIncident(body, currentUser.userId, currentUser.role, incidentId);
        
        return NextResponse.json(
            newUpdatedIncident,
            { status: 201 }
        )
        
    }catch(error: any){
        console.error("Incident update route caught an error:", error);

        if (error.status) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
} )