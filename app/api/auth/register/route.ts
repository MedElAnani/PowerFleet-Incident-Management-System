import { NextResponse } from 'next/server'
import { db } from "../../../../db"
import { clients, users } from '@/db/schema'
import { eq } from "drizzle-orm"
import bcrypt from 'bcryptjs'
import { SecurityAudit } from '@/lib/services/securityaudit.service'

export async function POST(req: Request) {
    try{
        // 1. Exract the payload
        const { name, companyName, phone, email, password } = await req.json()
        
        // 2. Validate if email and password empty
        if(!email || !password || !name || !companyName || !phone) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST auth/register', message: "Email, Password, Company Name, Phone and Name are required.", statusCode: 400}, req)
            return NextResponse.json(
                { success: false, error: "Email, Password, Company Name, Phone and Name are required." },
                { status: 400 }
            )
        }
        
        const trimmedEmail = email.trim().toLowerCase()
        
        // Regex Validation
        const emailRegex = /.+@.+\..+/
        if(!emailRegex.test(trimmedEmail)) {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST auth/register', message: "Email Format Not Valid !", statusCode: 400}, req)
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
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST auth/register', message: "This Email Already Exists !", statusCode: 401}, req)
            return NextResponse.json(
                { success: false, error: "This Email Already Exists !" },
                { status: 401 }
            )
        }
        
        // Regex Validation for Password
        // Criteria: Starts with Capital letter, contains a symbol, contains a number, min 6 total chars
        const passwordRegex = /^[A-Z](?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{5,}$/

        if (!passwordRegex.test(password)) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: "Password must start with a capital letter, contain at least one number, and contain at least one special character symbol." 
                },
                { status: 400 }
            )
        }
        
        // 3. Security layer: Hash the password
        const hashedPassword = await bcrypt.hash(password, 10)
        
        // 4. Data persistence layer using Drizzle query builder syntax
        // .returning() forces Postgres to send back only the fields we declare, keeping hashes private
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
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST auth/register', message: "Register successfully", statusCode: 201}, req, newUser.id)
        return NextResponse.json(
            { success: true, data: { ...newUser, role: "ClientUser" } },
            { status: 201 }
        )
    } catch (err: unknown) {
        const pgErr = err as { code?: string };
        if (pgErr.code === "23505") {
            await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST auth/register', message: "An account associated with this email address already exists.", statusCode: 400}, req)
            return NextResponse.json(
                { success: false, error: "An account associated with this email address already exists." },
                { status: 400 }
            )
        }
        
        await SecurityAudit.createSecurityAudit({attemptedEndpoint: 'POST auth/register', message: "A fatal error occurred during initialization.", statusCode: 500}, req)
        return NextResponse.json(
            { success: false, error: "A fatal error occurred during initialization." },
            { status: 500 }
        )
    }
}
