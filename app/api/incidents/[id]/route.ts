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
        
        if (isNaN(incidentId)) {
            return NextResponse.json(
                { error: "Invalid incident ID" },
                { status: 400 }
            );
        }
        
        // Find the incident by ID with comments and their authors
        const incident = await db.query.incidents.findFirst({
            where: eq(incidents.id, incidentId),
            with: {
                comments: {
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            }
                        }
                    }
                }
            }
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
            
            if (!clientRecord || incident.clientId !== clientRecord.id) {
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

        // Apply visibility rules to filter comments
        const isTech = internalUserRecord?.internalRole === "Technician";
        const isStaff = internalUserRecord?.internalRole === "Admin" || internalUserRecord?.internalRole === "Support Manager";

        const filteredComments = incident.comments.filter(comment => {
            if (comment.visibility === "Public") return true;
            if (comment.userId === currentUser.userId) return true;
            if (isStaff) return true;
            if (isTech) {
                // Technicians can see all internal/private notes, but not private comments written by Clients
                return comment.user.role !== "ClientUser";
            }
            return false;
        });

        // Return the incident with filtered comments
        const incidentWithFilteredComments = {
            ...incident,
            comments: filteredComments
        };
        
        return NextResponse.json(incidentWithFilteredComments);

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
        
        if (isNaN(incidentId)) {
            return NextResponse.json(
                { error: "Invalid incident ID" },
                { status: 400 }
            );
        }
        
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        
        const newUpdatedIncident = await updateIncident(body, currentUser.userId, currentUser.role, incidentId);
        
        return NextResponse.json(
            newUpdatedIncident,
            { status: 200 }
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