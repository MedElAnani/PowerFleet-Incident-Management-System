import { NextResponse } from "next/server"
import { withAuth, AuthenticatedRequest } from "@/middleware/auth"; 
import { db } from "@/db"
import { incidents, clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: { id:string } }) => {
    try{
        const { id } = await params;
        const incidentId = Number(id)
        const currentUser = req.user!
        
        const incident = await db.query.incidents.findFirst({
            where: eq(incidents.id, incidentId)
        })
        
        if(!incident){
            return NextResponse.json(
                { error: "Incident Not Found !" },
                { status: 404 }
            )
        }
        
        if (currentUser.role === "ClientUser") {
            const clientRecord = await db.query.clients.findFirst({
                where: eq(clients.userId, currentUser.userId),
            });
            if (!clientRecord || incident.reportedById !== clientRecord.id) {
                return NextResponse.json({ error: "Forbidden You can't access to this incident !" }, { status: 403 });
            }
        }
        
        return NextResponse.json(incident);
    }catch(error: any){
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
})