import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { resolveUserRole } from "@/lib/services/role"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: number
        role: string
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextRouteHandler = (request: AuthenticatedRequest, ...args: any[]) => Promise<Response> | Response;

export function withAuth(handler: NextRouteHandler, requiredType?: "Admin" | "Support Manager" | "Technician" | "ClientUser" | "InternalUser") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (request: Request, ...args: any[]) => {
        try {
            // 1. Extract Token from Authorization Header or Cookies
            let token: string | undefined;
            const authHeader = request.headers.get("authorization");
            if (authHeader?.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            } else {
                const cookieHeader = request.headers.get("cookie");
                if (cookieHeader) {
                    const cookiesMap = Object.fromEntries(
                        cookieHeader.split("; ").map((c) => {
                            const [k, ...v] = c.split("=");
                            return [k, v.join("=")];
                        })
                    );
                    token = cookiesMap["auth_token"] || cookiesMap["token"];
                }
            }

            if (!token) {
                return NextResponse.json(
                    { error: "Unauthorized: Missing token" }, { status: 401 }
                );
            }
            
            // 2. Verify JWT Token
            let decoded: { userID: number; tokenVersion?: number };
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userID: number; tokenVersion?: number };
            } catch {
                return NextResponse.json(
                    { error: "Unauthorized: Invalid or expired token" }, 
                    { status: 401 }
                )
            }
            
            // 2.5 Verify Token Version (Session Hijacking Protection)
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, decoded.userID))
                .limit(1);
                
            if (!user) {
                return NextResponse.json(
                    { error: "Unauthorized: User not found" },
                    { status: 401 }
                );
            }
            
            if (user.tokenVersion !== decoded.tokenVersion) {
                return NextResponse.json(
                    { error: "Unauthorized: Session revoked. Please log in again." },
                    { status: 401 }
                );
            }
            
            // 3. Resolve Dynamic Role
            const role = await resolveUserRole(decoded.userID);
            if (!role) {
                return NextResponse.json(
                    { error: "Unauthorized: Role not found" },
                    { status: 401 }
                )
            }

            // 4. Access Control Check
            if (requiredType) {
                const isInternal = ["Admin", "Support Manager", "Technician"].includes(role);
                const allowed = 
                    (requiredType === "InternalUser" && isInternal) || 
                    role === requiredType;

                if (!allowed) {
                    return NextResponse.json(
                        { error: "Forbidden: Access denied" },
                        { status: 403 }
                    )
                }
            }
            
            // 5. Attach decoded user payload to request
            const authenticatedRequest = request as AuthenticatedRequest;
            authenticatedRequest.user = {
                userId: decoded.userID,
                role: role
            }
            
            return handler(authenticatedRequest, ...args)
        } catch {
            return NextResponse.json(
                { error: "Internal Server Error" },
                { status: 500 }
            )
        }
    }
}