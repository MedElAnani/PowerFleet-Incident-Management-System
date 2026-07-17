import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { resolveUserRole } from "@/lib/services/role"

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
            // 1. Check For Authorization Header
            const authHeader = request.headers.get("authorization")
            if(!authHeader?.startsWith("Bearer ")) {
                return NextResponse.json(
                    { error: "Unauthorized: Missing token" }, {status: 401}
                )
            }
            
            const token = authHeader.split(" ")[1]
            
            // 2. Verify JWT Token
            let decoded: { userID: number };
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userID: number };
            } catch {
                return NextResponse.json(
                    { error: "Unauthorized: Invalid or expired token" }, 
                    { status: 401 }
                )
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