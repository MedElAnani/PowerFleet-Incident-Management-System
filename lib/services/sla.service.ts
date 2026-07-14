import { db } from "@/db";
import { incidents } from "@/db/schema";
import { eq, and, isNull, not, inArray } from "drizzle-orm";

interface StatusError extends Error {
    status?: number;
}

function createStatusError(message: string, status: number): StatusError {
    const error = new Error(message) as StatusError;
    error.status = status;
    return error;
}

export class SlaService {
    /**
     * Helper to retrieve Response & Resolution limits in milliseconds based on priority.
     */
    static getSlaLimits(priority: "Low" | "Medium" | "High" | "Critical"): { responseMs: number; resolutionMs: number } {
        const LIMITS = {
            Low: { responseHours: 12, resolutionHours: 24 },
            Medium: { responseHours: 6, resolutionHours: 12 },
            High: { responseHours: 2, resolutionHours: 6 },
            Critical: { responseHours: 0.5, resolutionHours: 3 }
        };
        const duration = LIMITS[priority] || LIMITS.Medium;
        return {
            responseMs: duration.responseHours * 60 * 60 * 1000,
            resolutionMs: duration.resolutionHours * 60 * 60 * 1000
        };
    }

    /**
     * Calculates and updates the SLA status for a specific incident.
     */
    static async calculateSLA(incidentId: number, now: Date = new Date()): Promise<string> {
        const incident = await db.query.incidents.findFirst({
            where: eq(incidents.id, incidentId)
        });

        if (!incident) {
            throw createStatusError("Incident not found.", 404);
        }

        const {
            priority,
            responseDueAt,
            resolutionDueAt,
            firstResponseAt,
            resolvedAt
        } = incident;

        // Fallback if SLA dates are not set
        if (!responseDueAt || !resolutionDueAt) {
            return "Healthy";
        }

        const responseDueTime = new Date(responseDueAt).getTime();
        const resolutionDueTime = new Date(resolutionDueAt).getTime();
        const firstResponseTime = firstResponseAt ? new Date(firstResponseAt).getTime() : null;
        const resolvedTime = resolvedAt ? new Date(resolvedAt).getTime() : null;
        const currentTime = now.getTime();

        let computedStatus = "Healthy";

        if (resolvedTime !== null) {
            // Terminal States
            const responseOnTime = firstResponseTime !== null && firstResponseTime <= responseDueTime;
            const resolutionOnTime = resolvedTime <= resolutionDueTime;

            if (responseOnTime && resolutionOnTime) {
                computedStatus = "Met";
            } else if (!responseOnTime && resolutionOnTime) {
                computedStatus = "Met_With_Response_Breached";
            } else if (responseOnTime && !resolutionOnTime) {
                computedStatus = "Met_With_Resolution_Breached";
            } else {
                computedStatus = "Breached_Both";
            }
        } else {
            // Active (Open) States
            if (firstResponseTime === null) {
                const remainingResponse = responseDueTime - currentTime;

                if (remainingResponse <= 0) {
                    const remainingResolution = resolutionDueTime - currentTime;
                    if (remainingResolution <= 0) {
                        computedStatus = "Breached_Both";
                    } else {
                        computedStatus = "Breached_Response";
                    }
                } else {
                    // Warning limits for Response
                    let threshold = 0;
                    switch (priority) {
                        case "Low":
                            threshold = 15 * 60 * 1000;
                            break;
                        case "Medium":
                            threshold = 30 * 60 * 1000;
                            break;
                        case "High":
                            threshold = 90 * 60 * 1000; // 1h 30m
                            break;
                        case "Critical":
                            threshold = 120 * 60 * 1000; // 2h
                            break;
                    }

                    if (remainingResponse <= threshold) {
                        computedStatus = "Warning_Response";
                    } else {
                        computedStatus = "Healthy";
                    }
                }
            } else {
                const responseOnTime = firstResponseTime <= responseDueTime;

                if (responseOnTime) {
                    const remainingResolution = resolutionDueTime - currentTime;

                    if (remainingResolution <= 0) {
                        computedStatus = "Breached_Resolution";
                    } else {
                        // Warning limits for Resolution
                        let threshold = 0;
                        switch (priority) {
                            case "Low":
                                threshold = 15 * 60 * 1000;
                                break;
                            case "Medium":
                                threshold = 30 * 60 * 1000;
                                break;
                            case "High":
                                threshold = 60 * 60 * 1000; // 1h
                                break;
                            case "Critical":
                                threshold = 90 * 60 * 1000; // 1h 30m
                                break;
                        }

                        if (remainingResolution <= threshold) {
                            computedStatus = "Warning_Resolution";
                        } else {
                            computedStatus = "Healthy";
                        }
                    }
                } else {
                    // Response Breached, Resolution Active/Breached
                    const remainingResolution = resolutionDueTime - currentTime;
                    if (remainingResolution <= 0) {
                        computedStatus = "Breached_Both";
                    } else {
                        computedStatus = "Breached_Response";
                    }
                }
            }
        }

        // Write Optimization: Only update database if status has changed
        if (incident.slaStatus !== computedStatus) {
            await db
                .update(incidents)
                .set({ slaStatus: computedStatus as any })
                .where(eq(incidents.id, incidentId));
        }

        return computedStatus;
    }

    /**
     * Polling routine that runs periodically to check active tickets.
     */
    static async checkOverdueTickets(now: Date = new Date()): Promise<void> {
        // Query open tickets that are not closed or cancelled
        const activeIncidents = await db.query.incidents.findMany({
            where: and(
                isNull(incidents.resolvedAt),
                not(inArray(incidents.status, ["Closed", "Cancelled"]))
            ),
            columns: {
                id: true
            }
        });

        for (const item of activeIncidents) {
            await this.calculateSLA(item.id, now);
        }
    }
}
