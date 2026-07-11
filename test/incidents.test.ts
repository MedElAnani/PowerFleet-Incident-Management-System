import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { GET as listIncidentsGET, POST as createIncidentPOST } from "@/app/api/incidents/route";
import { PATCH as updateIncidentPATCH } from "@/app/api/incidents/[id]/route";
import { db } from "@/db";
import { users, internal_users, admins, clients, vehicles, incidents, technicians, support_managers } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Incidents API Endpoints", () => {
    let adminUser: { id: number } | undefined, adminToken: string;
    let managerUser: { id: number } | undefined, managerToken: string;
    let techUser: { id: number } | undefined, techRecord: { id: number } | undefined, techToken: string;
    let inactiveUser: { id: number } | undefined, inactiveToken: string;
    let clientUser1: { id: number } | undefined, clientProfile1: { id: number } | undefined, clientToken1: string;
    let clientUser2: { id: number } | undefined, clientProfile2: { id: number } | undefined;

    let vehicle1: { id: number } | undefined;
    let vehicle2: { id: number } | undefined;
    let createdIncidentId: number;

    beforeAll(async () => {
        // 1. Create Admin
        const [admin] = await db.insert(users).values({
            name: "Admin", email: "admin_test_incidents@example.com", password: "HashedPassword123!", role: "InternalUser"
        }).returning();
        adminUser = admin;
        const [adminInt] = await db.insert(internal_users).values({
            userId: admin.id, internalRole: "Admin", department: "Oversight", isActive: true
        }).returning();
        await db.insert(admins).values({
            internalUserId: adminInt.id, canManageUsers: true
        });
        adminToken = jwt.sign({ userID: admin.id, userROLE: "InternalUser" }, process.env.JWT_SECRET!);

        // 2. Create Support Manager
        const [manager] = await db.insert(users).values({
            name: "Manager", email: "manager_test_incidents@example.com", password: "HashedPassword123!", role: "InternalUser"
        }).returning();
        managerUser = manager;
        const [managerInt] = await db.insert(internal_users).values({
            userId: manager.id, internalRole: "Support Manager", department: "Oversight", isActive: true
        }).returning();
        await db.insert(support_managers).values({
            internalUserId: managerInt.id, canAssign: true
        });
        managerToken = jwt.sign({ userID: manager.id, userROLE: "InternalUser" }, process.env.JWT_SECRET!);

        // 3. Create Technician
        const [tech] = await db.insert(users).values({
            name: "Technician", email: "tech_test_incidents@example.com", password: "HashedPassword123!", role: "InternalUser"
        }).returning();
        techUser = tech;
        const [techInt] = await db.insert(internal_users).values({
            userId: tech.id, internalRole: "Technician", department: "IT Support", isActive: true
        }).returning();
        const [techRec] = await db.insert(technicians).values({
            internalUserId: techInt.id, specialty: "GPS Tracking", isAvailable: true
        }).returning();
        techRecord = techRec;
        techToken = jwt.sign({ userID: tech.id, userROLE: "InternalUser" }, process.env.JWT_SECRET!);

        // 4. Create Inactive Technician
        const [inactive] = await db.insert(users).values({
            name: "Inactive Tech", email: "inactive_test_incidents@example.com", password: "HashedPassword123!", role: "InternalUser"
        }).returning();
        inactiveUser = inactive;
        await db.insert(internal_users).values({
            userId: inactive.id, internalRole: "Technician", department: "IT Support", isActive: false
        });
        inactiveToken = jwt.sign({ userID: inactive.id, userROLE: "InternalUser" }, process.env.JWT_SECRET!);

        // 5. Create Clients
        const [client1] = await db.insert(users).values({
            name: "Client 1", email: "client1_test_incidents@example.com", password: "HashedPassword123!", role: "ClientUser"
        }).returning();
        clientUser1 = client1;
        const [profile1] = await db.insert(clients).values({
            companyName: "Client 1 Corp", phone: "111", userId: client1.id
        }).returning();
        clientProfile1 = profile1;
        clientToken1 = jwt.sign({ userID: client1.id, userROLE: "ClientUser" }, process.env.JWT_SECRET!);

        const [client2] = await db.insert(users).values({
            name: "Client 2", email: "client2_test_incidents@example.com", password: "HashedPassword123!", role: "ClientUser"
        }).returning();
        clientUser2 = client2;
        const [profile2] = await db.insert(clients).values({
            companyName: "Client 2 Corp", phone: "222", userId: client2.id
        }).returning();
        clientProfile2 = profile2;

        // 6. Create Vehicles
        const [v1] = await db.insert(vehicles).values({
            name: "Van 1", imei: "IMEI-I1", licensePlate: "PLATE-I1", clientId: clientProfile1.id
        }).returning();
        vehicle1 = v1;

        const [v2] = await db.insert(vehicles).values({
            name: "Van 2", imei: "IMEI-I2", licensePlate: "PLATE-I2", clientId: clientProfile2.id
        }).returning();
        vehicle2 = v2;
    });

    afterAll(async () => {
        // Cascade delete on users cleans up profiles
        if (createdIncidentId) {
            await db.delete(incidents).where(eq(incidents.id, createdIncidentId));
        }
        if (vehicle1) await db.delete(vehicles).where(eq(vehicles.id, vehicle1.id));
        if (vehicle2) await db.delete(vehicles).where(eq(vehicles.id, vehicle2.id));
        if (clientUser1) await db.delete(users).where(eq(users.id, clientUser1.id));
        if (clientUser2) await db.delete(users).where(eq(users.id, clientUser2.id));
        if (techUser) await db.delete(users).where(eq(users.id, techUser.id));
        if (managerUser) await db.delete(users).where(eq(users.id, managerUser.id));
        if (inactiveUser) await db.delete(users).where(eq(users.id, inactiveUser.id));
        if (adminUser) await db.delete(users).where(eq(users.id, adminUser.id));
    });

    it("should allow Client to create an incident on their own vehicle", async () => {
        const req = new NextRequest("http://localhost/api/incidents", {
            method: "POST",
            headers: { "Authorization": `Bearer ${clientToken1}` },
            body: JSON.stringify({
                title: "GPS offline",
                description: "Cannot connect to central server",
                type: "GPS Device",
                address: "123 Main St",
                vehicleId: vehicle1!.id
            })
        });

        const res = await createIncidentPOST(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.title).toBe("GPS offline");
        createdIncidentId = data.id;
    });

    it("should prevent Client from creating an incident on another client's vehicle", async () => {
        const req = new NextRequest("http://localhost/api/incidents", {
            method: "POST",
            headers: { "Authorization": `Bearer ${clientToken1}` },
            body: JSON.stringify({
                title: "Illegal access",
                description: "Trying to hijack vehicle 2",
                type: "GPS Device",
                address: "123 Main St",
                vehicleId: vehicle2!.id
            })
        });

        const res = await createIncidentPOST(req);
        expect(res.status).toBe(403);
    });

    it("should fetch incidents filtered by client company", async () => {
        const req = new NextRequest("http://localhost/api/incidents", {
            method: "GET",
            headers: { "Authorization": `Bearer ${clientToken1}` }
        });

        const res = await listIncidentsGET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.length).toBeGreaterThan(0);
        data.forEach((inc: { clientId: number }) => {
            expect(inc.clientId).toBe(clientProfile1!.id);
        });
    });

    it("should allow Support Manager to assign a technician to the incident", async () => {
        const req = new NextRequest(`http://localhost/api/incidents/${createdIncidentId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${managerToken}` },
            body: JSON.stringify({
                assignedToId: techRecord!.id,
                status: "Open",
                message: "Assigning technician"
            })
        });

        const res = await updateIncidentPATCH(req, { params: Promise.resolve({ id: String(createdIncidentId) }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.assignedToId).toBe(techRecord!.id);
        expect(data.status).toBe("Open");
    });

    it("should prevent Technician from closing the incident", async () => {
        const req = new NextRequest(`http://localhost/api/incidents/${createdIncidentId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${techToken}` },
            body: JSON.stringify({
                status: "Closed",
                message: "Trying to close"
            })
        });

        const res = await updateIncidentPATCH(req, { params: Promise.resolve({ id: String(createdIncidentId) }) });
        expect(res.status).toBe(403); // Forbidden to close/cancel
    });

    it("should allow Technician to update status to In Progress on their assigned incident", async () => {
        const req = new NextRequest(`http://localhost/api/incidents/${createdIncidentId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${techToken}` },
            body: JSON.stringify({
                status: "In Progress",
                message: "Tech starting work"
            })
        });

        const res = await updateIncidentPATCH(req, { params: Promise.resolve({ id: String(createdIncidentId) }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.status).toBe("In Progress");
    });

    it("should prevent inactive technician from making any updates", async () => {
        const req = new NextRequest(`http://localhost/api/incidents/${createdIncidentId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${inactiveToken}` },
            body: JSON.stringify({
                status: "Resolved",
                message: "Inactive test"
            })
        });

        const res = await updateIncidentPATCH(req, { params: Promise.resolve({ id: String(createdIncidentId) }) });
        expect(res.status).toBe(403);
    });

    it("should allow Admin to resolve and close the incident", async () => {
        const req = new NextRequest(`http://localhost/api/incidents/${createdIncidentId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({
                status: "Resolved",
                message: "Resolving incident"
            })
        });

        const res = await updateIncidentPATCH(req, { params: Promise.resolve({ id: String(createdIncidentId) }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.status).toBe("Resolved");
        expect(data.resolvedAt).toBeDefined();
    });
});
