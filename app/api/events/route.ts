import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { getEventIncidents } from "../../../lib/services/events";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const currentUser = req.user!;

        const data = await getEventIncidents({
            userId: currentUser.userId,
            role: currentUser.role as "ClientUser" | "InternalUser",
        });

        return NextResponse.json(data, { status: 200 });
    } catch (error: unknown) {
        console.error("Get incidents route caught an error:", error);
        const err = error as Error;
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
}, 'InternalUser');