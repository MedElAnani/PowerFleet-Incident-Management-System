import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { POST as createVehiclePOST } from "@/app/api/vehicles/route";
import { GET as getVehicleGET } from "@/app/api/vehicles/[id]/route";
import { db } from "@/db";
import { users, internal_users, clients, vehicles } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Vehicles API Endpoints", () => {
    let adminUser: any;
    let clientUser1: any;
    let clientUser2: any;
    let clientProfile1: any;
    let clientProfile2: any;
    let adminToken: string;
    let clientToken1: string;
    let clientToken2: string;
    let createdVehicleId: number;

    beforeAll(async () => {
        // Create test Admin
        const [admin] = await db.insert(users).values({
            name: "Admin User",
            email: "admin_test_vehicles@example.com",
            password: "HashedPassword123!",
            role: "InternalUser"
        }).returning();
        adminUser = admin;

        await db.insert(internal_users).values({
            userId: admin.id,
            internalRole: "Admin",
            department: "Engineering",
            isActive: true
        });
        adminToken = jwt.sign({ userID: admin.id, userROLE: "InternalUser" }, process.env.JWT_SECRET!);

        // Create Client 1
        const [client1] = await db.insert(users).values({
            name: "Client 1",
            email: "client1_test_vehicles@example.com",
            password: "HashedPassword123!",
            role: "ClientUser"
        }).returning();
        clientUser1 = client1;

        const [profile1] = await db.insert(clients).values({
            companyName: "Client 1 Corp",
            phone: "123456",
            userId: client1.id
        }).returning();
        clientProfile1 = profile1;
        clientToken1 = jwt.sign({ userID: client1.id, userROLE: "ClientUser" }, process.env.JWT_SECRET!);

        // Create Client 2
        const [client2] = await db.insert(users).values({
            name: "Client 2",
            email: "client2_test_vehicles@example.com",
            password: "HashedPassword123!",
            role: "ClientUser"
        }).returning();
        clientUser2 = client2;

        const [profile2] = await db.insert(clients).values({
            companyName: "Client 2 Corp",
            phone: "654321",
            userId: client2.id
        }).returning();
        clientProfile2 = profile2;
        clientToken2 = jwt.sign({ userID: client2.id, userROLE: "ClientUser" }, process.env.JWT_SECRET!);
    });

    afterAll(async () => {
        // Cleanup all records created
        if (createdVehicleId) {
            await db.delete(vehicles).where(eq(vehicles.id, createdVehicleId));
        }
        if (clientUser1) await db.delete(users).where(eq(users.id, clientUser1.id));
        if (clientUser2) await db.delete(users).where(eq(users.id, clientUser2.id));
        if (adminUser) await db.delete(users).where(eq(users.id, adminUser.id));
    });

    it("should allow Admin to create a vehicle", async () => {
        const req = new NextRequest("http://localhost/api/vehicles", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: "Truck #1",
                imei: "IMEI-TEST-12345",
                licensePlate: "PLATE-12345",
                clientId: clientProfile1.id
            })
        });

        const res = await createVehiclePOST(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.name).toBe("Truck #1");
        expect(data.clientId).toBe(clientProfile1.id);
        createdVehicleId = data.id;
    });

    it("should prevent Client from creating a vehicle", async () => {
        const req = new NextRequest("http://localhost/api/vehicles", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${clientToken1}`
            },
            body: JSON.stringify({
                name: "Truck #2",
                imei: "IMEI-TEST-54321",
                licensePlate: "PLATE-54321",
                clientId: clientProfile1.id
            })
        });

        const res = await createVehiclePOST(req);
        expect(res.status).toBe(403);
    });

    it("should allow Client to view their own vehicle", async () => {
        const req = new NextRequest(`http://localhost/api/vehicles/${createdVehicleId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${clientToken1}`
            }
        });

        const res = await getVehicleGET(req, { params: Promise.resolve({ id: String(createdVehicleId) }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.id).toBe(createdVehicleId);
    });

    it("should prevent Client from viewing another client's vehicle", async () => {
        const req = new NextRequest(`http://localhost/api/vehicles/${createdVehicleId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${clientToken2}`
            }
        });

        const res = await getVehicleGET(req, { params: Promise.resolve({ id: String(createdVehicleId) }) });
        expect(res.status).toBe(403);
    });

    it("should return 400 for invalid NaN vehicle ID", async () => {
        const req = new NextRequest(`http://localhost/api/vehicles/abc`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${clientToken1}`
            }
        });

        const res = await getVehicleGET(req, { params: Promise.resolve({ id: "abc" }) });
        expect(res.status).toBe(400);
    });
});
