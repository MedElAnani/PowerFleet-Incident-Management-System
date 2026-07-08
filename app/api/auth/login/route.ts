import { NextResponse } from "next/server";
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export async function POST(req: Request) {
    try{
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
        
        // 4. Generate JWT
        const token = jwt.sign(
            {
                userID: user.id,
                userROLE: user.role
            },
            process.env.JWT_SECRET!,
            { expiresIn: "1d" }
        )
        
        // 5. Create a Success Response
        const response = NextResponse.json(
            { success: true, message: "Authentication successful.", user: { 
                    id: user.id,
                    email: user.email,
                    role: user.role,
                } 
            }
        )
        
        // 5. Append Secure HTTP-Only Cookie Flag
        response.cookies.set("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24,
            path: "/"
        })
        
        return response
        
    }catch (error) {
        return NextResponse.json(
            { success: false, error: "An error occurred during authentication processing.", err: error },
            { status: 500 }
        )
    }
}