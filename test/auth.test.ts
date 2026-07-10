import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Auth Endpoints", () => {
    const testEmail = "test_auth_user@example.com";

    afterAll(async () => {
        const user = await db.query.users.findFirst({
            where: eq(users.email, testEmail)
        });
        if (user) {
            await db.delete(users).where(eq(users.id, user.id));
        }
    });

    it("should register a new client user", async () => {
        const req = new NextRequest("http://localhost/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                name: "Test Auth User",
                companyName: "Auth Inc",
                phone: "1234567890",
                email: testEmail,
                password: "Password123!"
            })
        });

        const res = await registerPOST(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.email).toBe(testEmail);
    });

    it("should reject registering with a duplicate email", async () => {
        const req = new NextRequest("http://localhost/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                name: "Test Auth User 2",
                companyName: "Auth Inc 2",
                phone: "0987654321",
                email: testEmail,
                password: "Password123!"
            })
        });

        const res = await registerPOST(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toContain("Already Exists");
    });

    it("should log in successfully and return JWT cookie", async () => {
        const req = new NextRequest("http://localhost/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: testEmail,
                password: "Password123!"
            })
        });

        const res = await loginPOST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user.email).toBe(testEmail);
        expect(data.user.token).toBeDefined();

        const cookie = res.cookies.get("auth_token");
        expect(cookie).toBeDefined();
        expect(cookie?.value).toBe(data.user.token);
    });

    it("should reject login with wrong password", async () => {
        const req = new NextRequest("http://localhost/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: testEmail,
                password: "WrongPassword"
            })
        });

        const res = await loginPOST(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toContain("Password Invalid");
    });
});
