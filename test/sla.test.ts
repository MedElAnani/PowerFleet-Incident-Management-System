import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db";
import { users, clients, vehicles, incidents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SlaService } from "@/lib/services/sla.service";

describe("SLA Calculation Service Logic", () => {
    let clientUser: { id: number } | undefined;
    let clientProfile: { userId: number } | undefined;
    let vehicle: { id: number } | undefined;
    let incidentId: number;

    beforeAll(async () => {
        // 1. Create client user & vehicle
        const [client] = await db.insert(users).values({
            name: "SLA Client",
            email: "sla_client_test@example.com",
            password: "HashedPassword123!"
        }).returning();
        clientUser = client;

        const [profile] = await db.insert(clients).values({
            companyName: "SLA Test Corp",
            phone: "0000000000",
            userId: client.id
        }).returning();
        clientProfile = profile;

        const [v] = await db.insert(vehicles).values({
            name: "SLA Test Vehicle",
            imei: "SLA-IMEI-123",
            licensePlate: "SLA-PLATE-123",
            clientId: profile.userId
        }).returning();
        vehicle = v;
    });

    afterAll(async () => {
        if (incidentId) {
            await db.delete(incidents).where(eq(incidents.id, incidentId));
        }
        if (vehicle) {
            await db.delete(vehicles).where(eq(vehicles.id, vehicle.id));
        }
        if (clientUser) {
            await db.delete(users).where(eq(users.id, clientUser.id));
        }
    });

    it("should calculate SLA status correctly for New/Healthy state", async () => {
        const baseTime = Date.now();
        const responseDueAt = new Date(baseTime + 6 * 60 * 60 * 1000); // 6 hours response
        const resolutionDueAt = new Date(baseTime + 18 * 60 * 60 * 1000); // 18 hours resolution placeholder

        const [ticket] = await db.insert(incidents).values({
            title: "SLA Test Healthy",
            description: "Testing SLA status",
            type: "GPS Device",
            address: "Test St",
            vehicleId: vehicle!.id,
            clientId: clientProfile!.userId,
            reportedById: clientUser!.id,
            priority: "Medium",
            responseDueAt,
            resolutionDueAt,
            slaStatus: "Healthy"
        }).returning();
        incidentId = ticket.id;

        const status = await SlaService.calculateSLA(ticket.id, new Date(baseTime));
        expect(status).toBe("Healthy");
    });

    it("should transition to Warning_Response when response due time remaining is <= 30min (Medium)", async () => {
        const baseTime = Date.now();
        const responseDueAt = new Date(baseTime + 20 * 60 * 1000); // 20 minutes remaining (<= 30 min)
        const resolutionDueAt = new Date(baseTime + 18 * 60 * 60 * 1000);

        await db.update(incidents).set({
            responseDueAt,
            resolutionDueAt,
            firstResponseAt: null,
            resolvedAt: null
        }).where(eq(incidents.id, incidentId));

        const status = await SlaService.calculateSLA(incidentId, new Date(baseTime));
        expect(status).toBe("Warning_Response");
    });

    it("should transition to Breached_Response when response due time passes", async () => {
        const baseTime = Date.now();
        const responseDueAt = new Date(baseTime - 10 * 60 * 1000); // 10 minutes overdue
        const resolutionDueAt = new Date(baseTime + 4 * 60 * 60 * 1000); // Resolution still active

        await db.update(incidents).set({
            responseDueAt,
            resolutionDueAt,
            firstResponseAt: null,
            resolvedAt: null
        }).where(eq(incidents.id, incidentId));

        const status = await SlaService.calculateSLA(incidentId, new Date(baseTime));
        expect(status).toBe("Breached_Response");
    });

    it("should transition to Met when response and resolution are resolved on time", async () => {
        const baseTime = Date.now();
        const responseDueAt = new Date(baseTime + 2 * 60 * 60 * 1000);
        const firstResponseAt = new Date(baseTime + 1 * 60 * 60 * 1000); // Met (<= 2h)
        const resolutionDueAt = new Date(firstResponseAt.getTime() + 12 * 60 * 60 * 1000); // 12h resolution limit
        const resolvedAt = new Date(baseTime + 6 * 60 * 60 * 1000); // Met (<= 13h from base)

        await db.update(incidents).set({
            responseDueAt,
            resolutionDueAt,
            firstResponseAt,
            resolvedAt
        }).where(eq(incidents.id, incidentId));

        const status = await SlaService.calculateSLA(incidentId, new Date(baseTime));
        expect(status).toBe("Met");
    });

    it("should transition to Met_With_Response_Breached when response is late but resolution is on time", async () => {
        const baseTime = Date.now();
        const responseDueAt = new Date(baseTime + 1 * 60 * 60 * 1000);
        const firstResponseAt = new Date(baseTime + 2 * 60 * 60 * 1000); // Late (Breached)
        const resolutionDueAt = new Date(firstResponseAt.getTime() + 12 * 60 * 60 * 1000); // 12h limit
        const resolvedAt = new Date(baseTime + 6 * 60 * 60 * 1000); // On time (Met)

        await db.update(incidents).set({
            responseDueAt,
            resolutionDueAt,
            firstResponseAt,
            resolvedAt
        }).where(eq(incidents.id, incidentId));

        const status = await SlaService.calculateSLA(incidentId, new Date(baseTime));
        expect(status).toBe("Met_With_Response_Breached");
    });

    it("should transition to Met_With_Resolution_Breached when response is on time but resolution is late", async () => {
        const baseTime = Date.now();
        const responseDueAt = new Date(baseTime + 2 * 60 * 60 * 1000);
        const firstResponseAt = new Date(baseTime + 1 * 60 * 60 * 1000); // On time (Met)
        const resolutionDueAt = new Date(firstResponseAt.getTime() + 12 * 60 * 60 * 1000); // 12h limit
        const resolvedAt = new Date(baseTime + 15 * 60 * 60 * 1000); // Late (Breached, > 13h)

        await db.update(incidents).set({
            responseDueAt,
            resolutionDueAt,
            firstResponseAt,
            resolvedAt
        }).where(eq(incidents.id, incidentId));

        const status = await SlaService.calculateSLA(incidentId, new Date(baseTime));
        expect(status).toBe("Met_With_Resolution_Breached");
    });

    it("should transition to Breached_Both when both response and resolution are late", async () => {
        const baseTime = Date.now();
        const responseDueAt = new Date(baseTime + 1 * 60 * 60 * 1000);
        const firstResponseAt = new Date(baseTime + 2 * 60 * 60 * 1000); // Late
        const resolutionDueAt = new Date(firstResponseAt.getTime() + 12 * 60 * 60 * 1000); // 12h limit
        const resolvedAt = new Date(baseTime + 16 * 60 * 60 * 1000); // Late (> 14h)

        await db.update(incidents).set({
            responseDueAt,
            resolutionDueAt,
            firstResponseAt,
            resolvedAt
        }).where(eq(incidents.id, incidentId));

        const status = await SlaService.calculateSLA(incidentId, new Date(baseTime));
        expect(status).toBe("Breached_Both");
    });

    it("should run polling routine checkOverdueTickets to update open ticket SLA status successfully", async () => {
        const baseTime = Date.now();
        const responseDueAt = new Date(baseTime - 1 * 60 * 60 * 1000); // Response overdue
        const resolutionDueAt = new Date(baseTime + 4 * 60 * 60 * 1000); // Resolution active

        await db.update(incidents).set({
            status: "Open", // Active status
            responseDueAt,
            resolutionDueAt,
            firstResponseAt: null,
            resolvedAt: null,
            slaStatus: "Healthy" // Reset to Healthy before cron check
        }).where(eq(incidents.id, incidentId));

        await SlaService.checkOverdueTickets(new Date(baseTime));

        const ticket = await db.query.incidents.findFirst({
            where: eq(incidents.id, incidentId)
        });

        expect(ticket?.slaStatus).toBe("Breached_Response");
    });
});
