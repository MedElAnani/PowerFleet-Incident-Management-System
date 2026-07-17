import { NextResponse } from "next/server";
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { resolveUserRole } from "@/lib/services/role"
import { withAudit } from "@/lib/utils/audit";

export async function POST(req: Request) {
    return withAudit(req, 'POST auth/login', async () => {
        const { email, password } = await req.json()
        
        // 1. Check if email or password are empty
        if(!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and Password are required !" },
                { status: 400 }
            )
        }
        
        // 2. Fetch User Record
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.trim().toLowerCase()))
            .limit(1)
            
        if(!user) {
            return NextResponse.json(
                { success: false, error: "Email Invalid !" },
                { status: 401 }
            )
        }
        
        // 3. Compare Cryptographic Hashes
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if(!isPasswordValid) {
            return NextResponse.json(
                { success: false, error: "Password Invalid !" },
                { status: 401 }
            )
        }

        // 4. Resolve Dynamic Role (for user response profile payload only)
        const role = await resolveUserRole(user.id);
        if(!role) {
            return NextResponse.json(
                { success: false, error: "Access Denied: User type could not be resolved." },
                { status: 403 }
            );
        }
        
        // 5. Generate JWT (using only userID)
        const token = jwt.sign(
            {
                userID: user.id
            },
            process.env.JWT_SECRET!,
            { expiresIn: "1d" }
        )
        
        // 6. Create a Success Response
        const response = NextResponse.json(
            { success: true, message: "Authentication successful.", user: { 
                    id: user.id,
                    email: user.email,
                    role: role,
                    token
                } 
            }
        )
        
        // 7. Append Secure HTTP-Only Cookie Flag
        response.cookies.set("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24,
            path: "/"
        })
        
        return response
    });
}