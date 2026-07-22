// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserFullProfile } from "@/lib/services/role";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value || cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userID: number; tokenVersion: number };

    // Fetch Base User
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userID)).limit(1);

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return NextResponse.json({ success: false, error: "Session invalid or revoked" }, { status: 401 });
    }

    // Resolve Full Role & Joined Table Details
    const userProfile = await getUserFullProfile(user.id, user.name, user.email);

    if (!userProfile) {
      return NextResponse.json({ success: false, error: "User role configuration error" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      user: userProfile,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }
}
