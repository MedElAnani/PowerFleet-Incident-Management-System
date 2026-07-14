import { db } from "@/db";
import { incident_events } from "@/db/schema";

function stringifyValue(val: unknown): string {
    if (val === null || val === undefined) return "None";
    if (val instanceof Date) return val.toISOString();
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
}

function detectUpdateEvents(
    incidentId: number,
    userId: number,
    oldRecord?: Record<string, unknown>,
    newRecord?: Record<string, unknown>,
    message?: string
): Array<typeof incident_events.$inferInsert> {
    if (!oldRecord || !newRecord) return [];

    const eventsToLog: Array<typeof incident_events.$inferInsert> = [];
    const auditedFields: Record<string, "status_changed" | "priority_changed" | "technician_assigned"> = {
        status: "status_changed",
        priority: "priority_changed",
        assignedToId: "technician_assigned",
    };

    for (const [field, eventType] of Object.entries(auditedFields)) {
        const oldValue = oldRecord[field];
        const newValue = newRecord[field];

        if (newValue !== undefined && oldValue !== newValue) {
            eventsToLog.push({
                incidentId,
                userId,
                eventType,
                oldValue: stringifyValue(oldValue),
                newValue: stringifyValue(newValue),
                message: stringifyValue(message),
            });
        }
    }
    return eventsToLog;
}

/**
 * Compares two records, detects differences, and logs them securely.
 */
export async function auditLogChanges(config: {
    incidentId: number;
    userId: number;
    logType: string,
    oldRecord?: Record<string, unknown>;
    newRecord: Record<string, unknown>;
    message?: string;
}) {
    const { incidentId, userId, logType, oldRecord, newRecord, message } = config;
    let eventsToLog: Array<typeof incident_events.$inferInsert> = [];

    if (logType === 'update') {
        eventsToLog = detectUpdateEvents(incidentId, userId, oldRecord, newRecord, message);
    } else if (logType === 'create') {
        const eventType = 'create_incident';
        eventsToLog.push({
            incidentId,
            userId,
            eventType,
            oldValue: null,
            newValue: null,
            message: `User ${userId} create incident ${incidentId}`,
        });
    } else if (logType === 'comment') {
        const eventType = 'comment';
        eventsToLog.push({
            incidentId,
            userId,
            eventType,
            oldValue: null,
            newValue: null,
            message: `User ${userId} comment on incident ${incidentId}`,
        });
    } else if (logType === 'attachment') {
        const eventType = 'add_attachment';
        eventsToLog.push({
            incidentId,
            userId,
            eventType,
            oldValue: null,
            newValue: null,
            message: `User ${userId} add an attachment on incident ${incidentId}`,
        });
    }

    if (eventsToLog.length > 0) {
        await db.insert(incident_events).values(eventsToLog);
    }
}
