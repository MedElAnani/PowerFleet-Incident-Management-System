import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { POST as createCommentPOST } from "@/app/api/incidents/[id]/comments/route";
import { PATCH as updateCommentPATCH } from "@/app/api/incidents/[id]/comments/[commentId]/route";
import { GET as getIncidentGET } from "@/app/api/incidents/[id]/route";
import { db } from "@/db";
import { users, internal_users, admins, clients, vehicles, incidents, technicians, incident_comments } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Comments API & Visibility Endpoints", () => {
    let adminUser: { id: number } | undefined, adminToken: string;
    let techUser1: { id: number } | undefined, techRecord1: { internalUserId: number } | undefined, techToken1: string;
    let techUser2: { id: number } | undefined, techToken2: string;
    let clientUser: { id: number } | undefined, clientProfile: { userId: number } | undefined, clientToken: string;

    let vehicle: { id: number } | undefined;
    let incident: { id: number } | undefined;
    const commentIds: number[] = [];

    beforeAll(async () => {
        // 1. Create Admin
        const [admin] = await db.insert(users).values({
            name: "Admin", email: "admin_test_comments@example.com", password: "HashedPassword123!"
        }).returning();
        adminUser = admin;
        const [adminInt] = await db.insert(internal_users).values({
            userId: admin.id, department: "Oversight", isActive: true
        }).returning();
        await db.insert(admins).values({
            internalUserId: adminInt.userId, canManageUsers: true
        });
        adminToken = jwt.sign({ userID: admin.id, tokenVersion: 1, userROLE: "Admin" }, process.env.JWT_SECRET!);

        // 2. Create Client
        const [client] = await db.insert(users).values({
            name: "Client", email: "client_test_comments@example.com", password: "HashedPassword123!"
        }).returning();
        clientUser = client;
        const [profile] = await db.insert(clients).values({
            companyName: "Comment Client Corp", phone: "777", userId: client.id
        }).returning();
        clientProfile = profile;
        clientToken = jwt.sign({ userID: client.id, tokenVersion: 1, userROLE: "ClientUser" }, process.env.JWT_SECRET!);

        // 3. Create Tech 1 (Assigned Tech)
        const [tech1] = await db.insert(users).values({
            name: "Tech 1", email: "tech1_test_comments@example.com", password: "HashedPassword123!"
        }).returning();
        techUser1 = tech1;
        const [techInt1] = await db.insert(internal_users).values({
            userId: tech1.id, department: "IT Support", isActive: true
        }).returning();
        const [techRec1] = await db.insert(technicians).values({
            internalUserId: techInt1.userId, specialty: "GPS Tracking", isAvailable: true
        }).returning();
        techRecord1 = techRec1;
        techToken1 = jwt.sign({ userID: tech1.id, tokenVersion: 1, userROLE: "Technician" }, process.env.JWT_SECRET!);

        // 4. Create Tech 2 (Unassigned Tech)
        const [tech2] = await db.insert(users).values({
            name: "Tech 2", email: "tech2_test_comments@example.com", password: "HashedPassword123!"
        }).returning();
        techUser2 = tech2;
        const [techInt2] = await db.insert(internal_users).values({
            userId: tech2.id, department: "IT Support", isActive: true
        }).returning();
        await db.insert(technicians).values({
            internalUserId: techInt2.userId, specialty: "GPS Tracking", isAvailable: true
        });
        techToken2 = jwt.sign({ userID: tech2.id, tokenVersion: 1, userROLE: "Technician" }, process.env.JWT_SECRET!);

        // 5. Create Vehicle
        const [v] = await db.insert(vehicles).values({
            name: "Van", imei: "IMEI-C1", licensePlate: "PLATE-C1", clientId: clientProfile!.userId
        }).returning();
        vehicle = v;

        // 6. Create Incident
        const [inc] = await db.insert(incidents).values({
            title: "GPS Issue",
            description: "GPS is malfunctioning",
            type: "GPS Device",
            address: "123 Test St",
            vehicleId: vehicle!.id,
            clientId: clientProfile!.userId,
            reportedById: clientUser!.id,
            assignedToId: techRecord1!.internalUserId,
            status: "Open"
        }).returning();
        incident = inc;
    });

    afterAll(async () => {
        // Cleanup comments
        if (commentIds.length > 0) {
            for (const cid of commentIds) {
                await db.delete(incident_comments).where(eq(incident_comments.id, cid));
            }
        }
        if (incident) await db.delete(incidents).where(eq(incidents.id, incident.id));
        if (vehicle) await db.delete(vehicles).where(eq(vehicles.id, vehicle.id));
        if (clientUser) await db.delete(users).where(eq(users.id, clientUser.id));
        if (techUser1) await db.delete(users).where(eq(users.id, techUser1.id));
        if (techUser2) await db.delete(users).where(eq(users.id, techUser2.id));
        if (adminUser) await db.delete(users).where(eq(users.id, adminUser.id));
    });

    it("should allow Client to comment on their own incident", async () => {
        const req = new NextRequest(`http://localhost/api/incidents/${incident!.id}/comments`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${clientToken}` },
            body: JSON.stringify({
                body: "Client public comment",
                visibility: "Public"
            })
        });

        const res = await createCommentPOST(req, { params: Promise.resolve({ id: String(incident!.id) }) });
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.body).toBe("Client public comment");
        commentIds.push(data.id);
    });

    it("should allow Technician to post a Private comment on their assigned incident", async () => {
        const req = new NextRequest(`http://localhost/api/incidents/${incident!.id}/comments`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${techToken1}` },
            body: JSON.stringify({
                body: "Tech internal note",
                visibility: "Private"
            })
        });

        const res = await createCommentPOST(req, { params: Promise.resolve({ id: String(incident!.id) }) });
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.visibility).toBe("Private");
        commentIds.push(data.id);
    });

    it("should prevent Unassigned Technician from commenting", async () => {
        const req = new NextRequest(`http://localhost/api/incidents/${incident!.id}/comments`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${techToken2}` },
            body: JSON.stringify({
                body: "Tech 2 trying to comment",
                visibility: "Public"
            })
        });

        const res = await createCommentPOST(req, { params: Promise.resolve({ id: String(incident!.id) }) });
        expect(res.status).toBe(403);
    });

    it("should allow Author to toggle visibility of their own comment", async () => {
        // Comment ID is the first one posted (Client's comment)
        const targetId = commentIds[0];
        const req = new NextRequest(`http://localhost/api/incidents/${incident!.id}/comments/${targetId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${clientToken}` },
            body: JSON.stringify({ visibility: "Private" })
        });

        const res = await updateCommentPATCH(req, { params: Promise.resolve({ id: String(incident!.id), commentId: String(targetId) }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.visibility).toBe("Private");
    });

    it("should prevent Non-author from toggling comment visibility", async () => {
        // Client tries to edit Tech's comment (second one)
        const targetId = commentIds[1];
        const req = new NextRequest(`http://localhost/api/incidents/${incident!.id}/comments/${targetId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${clientToken}` },
            body: JSON.stringify({ visibility: "Public" })
        });

        const res = await updateCommentPATCH(req, { params: Promise.resolve({ id: String(incident!.id), commentId: String(targetId) }) });
        expect(res.status).toBe(403);
    });

    it("should allow Admin to toggle visibility of anyone's comment", async () => {
        // Admin overrides visibility of Client's comment back to Public
        const targetId = commentIds[0];
        const req = new NextRequest(`http://localhost/api/incidents/${incident!.id}/comments/${targetId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({ visibility: "Public" })
        });

        const res = await updateCommentPATCH(req, { params: Promise.resolve({ id: String(incident!.id), commentId: String(targetId) }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.visibility).toBe("Public");
    });

    it("should filter Private comment written by Technician from Client's details view", async () => {
        // Set Client's comment to Private first, and Tech's comment to Private.
        // We want to test that the Client can see their own Private comment, but not the Tech's Private comment.
        const clientCommentId = commentIds[0];
        const techCommentId = commentIds[1];

        // Ensure both are Private
        await db.update(incident_comments).set({ visibility: "Private" }).where(eq(incident_comments.id, clientCommentId));
        await db.update(incident_comments).set({ visibility: "Private" }).where(eq(incident_comments.id, techCommentId));

        // Get details as Client
        const req = new NextRequest(`http://localhost/api/incidents/${incident!.id}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${clientToken}` }
        });

        const res = await getIncidentGET(req, { params: Promise.resolve({ id: String(incident!.id) }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        // Client should see their own Private comment, but not the Tech's Private comment.
        const visibleCommentIds = data.comments.map((c: { id: number }) => c.id);
        expect(visibleCommentIds).toContain(clientCommentId);
        expect(visibleCommentIds).not.toContain(techCommentId);
    });

    it("should let Technician see their own Private comment but not Client's Private comment", async () => {
        const clientCommentId = commentIds[0];
        const techCommentId = commentIds[1];

        // Get details as Technician
        const req = new NextRequest(`http://localhost/api/incidents/${incident!.id}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${techToken1}` }
        });

        const res = await getIncidentGET(req, { params: Promise.resolve({ id: String(incident!.id) }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        // Technician should see their own Private comment, but not the Client's Private comment.
        const visibleCommentIds = data.comments.map((c: { id: number }) => c.id);
        expect(visibleCommentIds).toContain(techCommentId);
        expect(visibleCommentIds).not.toContain(clientCommentId);
    });
});
