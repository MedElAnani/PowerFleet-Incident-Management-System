import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { db } from "@/db";
import { incident_events } from "@/db/schema";
import { eq } from "drizzle-orm";

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const incidentId = Number(id);
        
        if (isNaN(incidentId)) {
            return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
        }

        const events = await db.query.incident_events.findMany({
            where: eq(incident_events.incidentId, incidentId),
            orderBy: (events, { desc }) => [desc(events.createdAt)],
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
        
        if (!events || events.length === 0) {
            return NextResponse.json({ error: "This Incident Don't Have Any Events Yet !" }, { status: 200 });
        }

        return NextResponse.json(events, { status: 200 });
    } catch (error: unknown) {
        console.error("Get incident events route caught an error:", error);
        const err = error as Error;
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
});
