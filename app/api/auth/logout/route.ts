import { SecurityAudit } from "@/lib/services/securityaudit.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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
    
    await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST auth/logout', message: "Logged out successfully", statusCode: 200}, req)
    
    return response
}