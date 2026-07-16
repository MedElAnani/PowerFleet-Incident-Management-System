import { NextResponse } from "next/server"
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 
import { db } from "@/db"
import { incidents, clients, technicians, incident_comments, incident_attachments, incident_internal_notes } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { IncidentService } from "@/lib/services/incident.service";

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
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
        const resolvedRole = await resolveUserRole(currentUser.userId);
        const isAdmin = resolvedRole === "Admin";

        const incident = await db.query.incidents.findFirst({
            where: and(
                eq(incidents.id, incidentId),
                isAdmin ? undefined : isNull(incidents.deletedAt)
            ),
            with: {
                comments: {
                    where: isAdmin ? undefined : isNull(incident_comments.deletedAt),
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
                },
                attachments: isAdmin ? true : {
                    where: isNull(incident_attachments.deletedAt)
                },
                internalNotes: {
                    where: isAdmin ? undefined : isNull(incident_internal_notes.deletedAt),
                    with: {
                        author: {
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: (notes, { desc }) => [desc(notes.isPinned), desc(notes.createdAt)]
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

        // Filter internal notes based on RBAC visibility rules
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let filteredNotes: any[] | undefined = undefined;
        if (currentUser.role !== "ClientUser") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filteredNotes = incident.internalNotes.filter((note: any) => 
                note.visibility === "Public" || note.authorId === currentUser.userId
            );
        }

        // Return the incident with filtered comments and notes
        const incidentWithFilteredComments = {
            ...incident,
            comments: filteredComments,
            internalNotes: filteredNotes
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

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
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

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const incidentId = Number(id);
        const currentUser = req.user!;
        
        if (isNaN(incidentId)) {
            return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
        }
        
        await IncidentService.deleteIncident(incidentId, currentUser.userId);
        
        return NextResponse.json({ success: true, message: "Incident deleted successfully." });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}, "Admin");