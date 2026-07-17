import { NextResponse } from 'next/server'
import { db } from "@/db"
import { clients, users } from '@/db/schema'
import { eq } from "drizzle-orm"
import bcrypt from 'bcryptjs'
import { withAudit } from '@/lib/utils/audit'

export async function POST(req: Request) {
    return withAudit(req, 'POST auth/register', async () => {
        // 1. Exract the payload
        const { name, companyName, phone, email, password } = await req.json()
        
        // 2. Validate if email and password empty
        if(!email || !password || !name || !companyName || !phone) {
            return NextResponse.json(
                { success: false, error: "Email, Password, Company Name, Phone and Name are required." },
                { status: 400 }
            )
        }
        
        const trimmedEmail = email.trim().toLowerCase()
        
        // Regex Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(trimmedEmail)) {
            return NextResponse.json(
                { success: false, error: "Email Format Not Valid !" },
                { status: 400 }
            )
        }
        
        // Fetch For Any Duplicated Email
        const [userExist] = await db
            .select()
            .from(users)
            .where(eq(users.email, trimmedEmail))
            .limit(1)
            
        if(userExist) {
            return NextResponse.json(
                { success: false, error: "This Email Already Exists !" },
                { status: 401 }
            )
        }
        
        // Regex Validation for Password
        const passwordRegex = /^[A-Z](?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{5,}$/

        if (!passwordRegex.test(password)) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: "Password must start with a capital letter, contain at least one number, and contain at least one special character symbol." 
                },
                { status: 400 }
            )
        }
        
        try {
            // 3. Security layer: Hash the password
            const hashedPassword = await bcrypt.hash(password, 10)
            
            // 4. Data persistence layer using Drizzle query builder syntax
            const [newUser] = await db
                .insert(users)
                .values({
                    email: trimmedEmail,
                    password: hashedPassword,
                    name
                })
                .returning({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    createdAt: users.createdAt
                })
            
            await db
                .insert(clients)
                .values({
                    companyName,
                    phone,
                    userId: newUser.id
                });
            
            // 5. Success Response
            return NextResponse.json(
                { success: true, message: "Register successfully", user: { id: newUser.id }, data: { ...newUser, role: "ClientUser" } },
                { status: 201 }
            )
        } catch (err: unknown) {
            const pgErr = err as { code?: string };
            if (pgErr.code === "23505") {
                return NextResponse.json(
                    { success: false, error: "An account associated with this email address already exists." },
                    { status: 400 }
                )
            }
            throw err;
        }
    });
}
