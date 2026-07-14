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

export type SlaPriority = "Low" | "Medium" | "High" | "Critical";

interface SlaDuration {
    responseHours: number;
    resolutionHours: number;
    responseWarningMs: number;
    resolutionWarningMs: number;
}

export const SLA_CONFIG: Record<SlaPriority, SlaDuration> = {
    Low: {
        responseHours: 12,
        resolutionHours: 24,
        responseWarningMs: 15 * 60 * 1000,
        resolutionWarningMs: 15 * 60 * 1000
    },
    Medium: {
        responseHours: 6,
        resolutionHours: 12,
        responseWarningMs: 30 * 60 * 1000,
        resolutionWarningMs: 30 * 60 * 1000
    },
    High: {
        responseHours: 2,
        resolutionHours: 6,
        responseWarningMs: 90 * 60 * 1000,
        resolutionWarningMs: 60 * 60 * 1000
    },
    Critical: {
        responseHours: 0.5,
        resolutionHours: 3,
        responseWarningMs: 120 * 60 * 1000,
        resolutionWarningMs: 90 * 60 * 1000
    }
};

export class SlaService {
    /**
     * Computes initial Response Due and Baseline Resolution Due on ticket creation.
     */
    static calculateCreationDates(priority: SlaPriority, createdAt: Date = new Date()) {
        const config = SLA_CONFIG[priority];
        const baseTime = createdAt.getTime();
        const responseDueAt = new Date(baseTime + config.responseHours * 60 * 60 * 1000);
        const resolutionDueAt = new Date(baseTime + (config.responseHours + config.resolutionHours) * 60 * 60 * 1000);
        return { responseDueAt, resolutionDueAt };
    }

    /**
     * Computes Resolution Due relative to the actual First Response timestamp.
     */
    static calculateFirstResponseDates(priority: SlaPriority, firstResponseAt: Date = new Date()) {
        const config = SLA_CONFIG[priority];
        const resolutionDueAt = new Date(firstResponseAt.getTime() + config.resolutionHours * 60 * 60 * 1000);
        return { firstResponseAt, resolutionDueAt };
    }

    /**
     * Recalculates Response Due and Resolution Due dates on priority transition.
     */
    static calculatePriorityChangeDates(priority: SlaPriority, createdAt: Date, firstResponseAt: Date | null) {
        const config = SLA_CONFIG[priority];
        const baseTime = createdAt.getTime();
        const responseDueAt = new Date(baseTime + config.responseHours * 60 * 60 * 1000);
        
        let resolutionDueAt: Date;
        if (firstResponseAt) {
            resolutionDueAt = new Date(firstResponseAt.getTime() + config.resolutionHours * 60 * 60 * 1000);
        } else {
            resolutionDueAt = new Date(baseTime + (config.responseHours + config.resolutionHours) * 60 * 60 * 1000);
        }

        return { responseDueAt, resolutionDueAt };
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
        
        type SlaStatus = 
            | "Healthy" | "Met" | "Met_With_Response_Breached" | "Met_With_Resolution_Breached" 
            | "Breached_Both" | "Warning_Response" | "Warning_Resolution" | "Breached_Response" 
            | "Breached_Resolution" ;
            
        let computedStatus: SlaStatus = "Healthy";

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
                    const threshold = SLA_CONFIG[priority as SlaPriority].responseWarningMs;

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
                        const threshold = SLA_CONFIG[priority as SlaPriority].resolutionWarningMs;

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
                .set({ slaStatus: computedStatus })
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
