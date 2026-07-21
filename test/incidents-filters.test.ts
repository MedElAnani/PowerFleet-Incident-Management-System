import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { GET as listIncidentsGET } from "@/app/api/incidents/route";
import { db } from "@/db";
import { users, internal_users, admins, clients, vehicles, incidents, technicians } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Incident Filtering & Search API", () => {
    let adminUser: { id: number } | undefined, adminToken: string;
    let techUser: { id: number } | undefined, techRecord: { internalUserId: number } | undefined, techToken: string;
    let clientUser: { id: number } | undefined, clientProfile: { userId: number } | undefined, clientToken: string;
    let vehicle1: { id: number } | undefined;
    
    // Incident IDs for cleanup
    const createdIncidentIds: number[] = [];

    beforeAll(async () => {
        // 1. Create Admin
        const [admin] = await db.insert(users).values({
            name: "Admin", email: "admin_filter@example.com", password: "HashedPassword123!"
        }).returning();
        adminUser = admin;
        const [adminInt] = await db.insert(internal_users).values({
            userId: admin.id, department: "Oversight", isActive: true
        }).returning();
        await db.insert(admins).values({
            internalUserId: adminInt.userId, canManageUsers: true
        });
        adminToken = jwt.sign({ userID: admin.id, tokenVersion: 1, userROLE: "Admin" }, process.env.JWT_SECRET!);

        // 2. Create Technician
        const [tech] = await db.insert(users).values({
            name: "Technician", email: "tech_filter@example.com", password: "HashedPassword123!"
        }).returning();
        techUser = tech;
        const [techInt] = await db.insert(internal_users).values({
            userId: tech.id, department: "IT Support", isActive: true
        }).returning();
        const [techRec] = await db.insert(technicians).values({
            internalUserId: techInt.userId, specialty: "GPS Tracking", isAvailable: true
        }).returning();
        techRecord = techRec;
        techToken = jwt.sign({ userID: tech.id, tokenVersion: 1, userROLE: "Technician" }, process.env.JWT_SECRET!);

        // 3. Create Client
        const [client] = await db.insert(users).values({
            name: "Client", email: "client_filter@example.com", password: "HashedPassword123!"
        }).returning();
        clientUser = client;
        const [profile] = await db.insert(clients).values({
            companyName: "Client Corp", phone: "111", userId: client.id
        }).returning();
        clientProfile = profile;
        clientToken = jwt.sign({ userID: client.id, tokenVersion: 1, userROLE: "ClientUser" }, process.env.JWT_SECRET!);

        // 4. Create Vehicle
        const [v1] = await db.insert(vehicles).values({
            name: "Van", imei: "IMEI-FILTER", licensePlate: "PLATE-FLT", clientId: clientProfile.userId
        }).returning();
        vehicle1 = v1;

        // 5. Create Incidents to Filter
        const data = [
            { title: "GPS offline completely", description: "Desc", type: "GPS Device" as const, priority: "High" as const, status: "Open" as const, slaStatus: "Healthy" as const },
            { title: "Engine issue", description: "Desc", type: "Vehicle" as const, priority: "Critical" as const, status: "In Progress" as const, slaStatus: "Breached_Response" as const, assignedToId: techRecord.internalUserId },
            { title: "Driver complain", description: "Desc", type: "Driver" as const, priority: "Low" as const, status: "Resolved" as const, slaStatus: "Met" as const },
        ];
        
        for (const item of data) {
            const [incident] = await db.insert(incidents).values({
                ...item,
                address: "Test Location",
                clientId: clientProfile.userId,
                vehicleId: v1.id,
                reportedById: clientProfile.userId,
            }).returning();
            createdIncidentIds.push(incident.id);
        }
    });

    afterAll(async () => {
        // Cleanup all resources
        for (const id of createdIncidentIds) {
            await db.delete(incidents).where(eq(incidents.id, id));
        }
        if (vehicle1) await db.delete(vehicles).where(eq(vehicles.id, vehicle1.id));
        if (clientUser) await db.delete(users).where(eq(users.id, clientUser.id));
        if (techUser) await db.delete(users).where(eq(users.id, techUser.id));
        if (adminUser) await db.delete(users).where(eq(users.id, adminUser.id));
    });

    it("should allow searching by title", async () => {
        const req = new NextRequest("http://localhost/api/incidents?search=completely", {
            method: "GET",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        const res = await listIncidentsGET(req);
        const allData = await res.json();
        
        expect(res.status).toBe(200);
        const data = allData.filter((i: { id: number; title: string }) => createdIncidentIds.includes(i.id));
        expect(data).toHaveLength(1);
        expect(data[0].title).toBe("GPS offline completely");
    });
    
    it("should allow filtering by multiple statuses", async () => {
        const req = new NextRequest("http://localhost/api/incidents?status=Open,In Progress", {
            method: "GET",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        const res = await listIncidentsGET(req);
        const allData = await res.json();
        
        expect(res.status).toBe(200);
        const data = allData.filter((i: { id: number; title: string }) => createdIncidentIds.includes(i.id));
        expect(data).toHaveLength(2);
        const titles = data.map((i: { id: number; title: string }) => i.title);
        expect(titles).toContain("GPS offline completely");
        expect(titles).toContain("Engine issue");
    });

    it("should ignore slaStatus and assignedToId filters for ClientUser (RBAC)", async () => {
        // Client attempts to filter by Breached_Response which would normally yield 1 result
        // But since clients can't filter by SLA, it should ignore the filter and return all 3 tickets.
        const req = new NextRequest("http://localhost/api/incidents?slaStatus=Breached_Response&assignedToId=9999", {
            method: "GET",
            headers: { "Authorization": `Bearer ${clientToken}` }
        });

        const res = await listIncidentsGET(req);
        const allData = await res.json();
        
        expect(res.status).toBe(200);
        // Returns all 3 client tickets, successfully ignoring the forbidden filters
        const data = allData.filter((i: { id: number; title: string }) => createdIncidentIds.includes(i.id));
        expect(data).toHaveLength(3);
    });
    
    it("should enforce assignedToId automatically for Technicians", async () => {
        // Technician does not pass an assignedTo filter, but the backend forces it
        const req = new NextRequest("http://localhost/api/incidents", {
            method: "GET",
            headers: { "Authorization": `Bearer ${techToken}` }
        });

        const res = await listIncidentsGET(req);
        const allData = await res.json();
        
        expect(res.status).toBe(200);
        // Tech should only see the 1 incident assigned to them
        const data = allData.filter((i: { id: number; title: string }) => createdIncidentIds.includes(i.id));
        expect(data).toHaveLength(1);
        expect(data[0].title).toBe("Engine issue");
    });
});
