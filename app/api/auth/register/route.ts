import { NextResponse } from 'next/server'
import { db } from "../../../../db"
import { users } from '@/db/schema'
import { eq } from "drizzle-orm"
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
    try{
        // 1. Exract the payload
        const { name, email, password } = await req.json()
        
        // 2. Validate if email and password empty
        if(!email || !password || !name) {
            return NextResponse.json(
                { success: false, error: "Email, Password and Name are required." },
                { status: 400 }
            )
        }
        
        const trimmedEmail = email.trim().toLowerCase()
        
        // Regex Validation
        const emailRegex = /.+@.+\..+/
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
                role: users.role,
                createdAt: users.createdAt
            })
            
        // 5. Success Response
        return NextResponse.json(
            { success: true, data: newUser },
            { status: 201 }
        )
    }catch(err: any){
        if(err.code === "23505") {
            return NextResponse.json(
                { success: false, error: "An account associated with this email address already exists." },
                { status: 400 }
            )
        }
        
        return NextResponse.json(
            { success: false, error: "A fatal error occurred during initialization." },
            { status: 500 }
        )
    }
}
