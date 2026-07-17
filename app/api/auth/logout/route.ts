import { withAudit } from "@/lib/utils/audit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    return withAudit(req, 'POST auth/logout', async () => {
        const response = NextResponse.json(
            { success: true, message: "Logged out successfully" }
        )
        
        // Destroy The HttpOnly cookie by setting its maxAge to 0
        response.cookies.set("auth_token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 0,
            path: "/"
        })
        
        return response
    });
}