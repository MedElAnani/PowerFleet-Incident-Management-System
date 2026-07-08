import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: number
        role: string
    }
}

type NextRouteHandler = (request: AuthenticatedRequest, ...args: any[]) => Promise<Response> | Response;

export function withAuth(handler: NextRouteHandler, requiredRole?: string) {
    return async (request: Request, ...args: any[]) => {
        try{
            // 1. Check For Authorization Header
            const authHeader = request.headers.get("authorization")
            if(!authHeader || !authHeader.startsWith("Bearer ")) {
                return NextResponse.json(
                    { error: "Unauthorized: Missing token" }, {status: 401}
                )
            }
            
            const token = authHeader.split(" ")[1]
            
            // 2. Verify JWT Token
            let decoded: any
            try{
                decoded = jwt.verify(token, process.env.JWT_SECRET!)
            }catch(err){
                return NextResponse.json(
                    { error: "Unauthorized: Invalid or expired token" }, 
                    { status: 401 }
                )
            }
            
            // 3. Role-Based Access Control Check
            if(requiredRole && decoded.userROLE !== requiredRole) {
                return NextResponse.json(
                    { error: `Forbidden: Only ${requiredRole}s can access this resource` },
                    { status: 403 }
                )
            }
            
            // 4. Attach decoded user payload to the request object for easy access
            const authenticatedRequest = request as AuthenticatedRequest;
            authenticatedRequest.user = {
                userId: decoded.userID,
                role: decoded.userROLE
            }
            
            return handler(authenticatedRequest, ...args)
        }catch(err){
            return NextResponse.json(
                { error: "Internal Server Error" },
                { status: 500 }
            )
        }
    }
}