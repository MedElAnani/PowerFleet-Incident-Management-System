import { NextResponse } from "next/server"
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 
import { db } from "@/db"
import { incidents, clients, internal_users, technicians } from "@/db/schema";
import { eq } from "drizzle-orm";
import { IncidentService } from "@/lib/services/incident.service";

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
        const { resolveUserRole } = await import("@/lib/services/role");
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
                            },
                            with: {
                                clientProfile: true
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
            
            if (!clientRecord || incident.clientId !== clientRecord.userId) {
                return NextResponse.json(
                    { error: "Forbidden: You cannot access this incident!" }, 
                    { status: 403 }
                );
            }
        }
        
        const resolvedRole = await resolveUserRole(currentUser.userId);
        
        if(resolvedRole === "Technician"){
            const techRecord = await db.query.technicians.findFirst({
                where: eq(technicians.internalUserId, currentUser.userId)
            })
            
            if(techRecord?.internalUserId !== incident.assignedToId){
                return NextResponse.json(
                    { error: "Forbidden: You cannot access this incident!" }, 
                    { status: 403 }
                );
            }
        }

        // Apply visibility rules to filter comments
        const isTech = resolvedRole === "Technician";
        const isStaff = resolvedRole === "Admin" || resolvedRole === "Support Manager";

        const filteredComments = incident.comments.filter(comment => {
            if (comment.visibility === "Public") return true;
            if (comment.userId === currentUser.userId) return true;
            if (isStaff) return true;
            if (isTech) {
                // Technicians can see all internal/private notes, but not private comments written by Clients
                return !comment.user.clientProfile;
            }
            return false;
        });

        // Return the incident with filtered comments
        const incidentWithFilteredComments = {
            ...incident,
            comments: filteredComments
        };
        
        return NextResponse.json(incidentWithFilteredComments);

    } catch (error: unknown) {
        const err = error as Error;
        return NextResponse.json(
            { error: err.message },
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
        
        const newUpdatedIncident = await IncidentService.updateIncident(body, currentUser.userId, incidentId);
        
        return NextResponse.json(
            newUpdatedIncident,
            { status: 200 }
        )
        
    } catch (error: unknown) {
        console.error("Incident update route caught an error:", error);
        const err = error as { status?: number; message?: string };

        if (err.status) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }

        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
} )