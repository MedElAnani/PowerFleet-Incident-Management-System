import { relations } from "drizzle-orm";
import { 
    users, 
    internal_users, 
    admins, 
    support_managers, 
    technicians, 
    clients, 
    vehicles, 
    incidents,
    incident_comments,
    incident_events,
    generated_reports,
    security_audit_events,
    incident_attachments,
    impact_links
} from "./schema";

// 1. User Table Relations
export const usersRelations = relations(users, ({ one, many }) => ({
    clientProfile: one(clients),
    internalProfile: one(internal_users),
    comments: many(incident_comments),
    events: many(incident_events),
    auditEvents: many(security_audit_events),
    uploadedAttachments: many(incident_attachments),
}));

// 2. Internal Users Table Relations
export const internalUsersRelations = relations(internal_users, ({ one, many }) => ({
    user: one(users, {
        fields: [internal_users.userId],
        references: [users.id],
    }),
    adminProfile: one(admins),
    managerProfile: one(support_managers),
    technicianProfile: one(technicians),
    reports: many(generated_reports),
}));

// 3. Role-Specific Profile Relations
export const adminsRelations = relations(admins, ({ one, many }) => ({
    internalUser: one(internal_users, {
        fields: [admins.internalUserId],
        references: [internal_users.userId],
    }),
    createdVehicles: many(vehicles),
}));

// 4. Support Manager Profile Relations
export const supportManagersRelations = relations(support_managers, ({ one }) => ({
    internalUser: one(internal_users, {
        fields: [support_managers.internalUserId],
        references: [internal_users.userId],
    }),
}));

// 5. Technician Profile Relations
export const techniciansRelations = relations(technicians, ({ one, many }) => ({
    internalUser: one(internal_users, {
        fields: [technicians.internalUserId],
        references: [internal_users.userId],
    }),
    assignedIncidents: many(incidents),
}));

// 6. Client & Vehicle System Relations
export const clientsRelations = relations(clients, ({ one, many }) => ({
    user: one(users, {
        fields: [clients.userId],
        references: [users.id],
    }),
    vehicles: many(vehicles),
    reportedIncidents: many(incidents),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
    client: one(clients, {
        fields: [vehicles.clientId],
        references: [clients.userId],
    }),
    creator: one(admins, {
        fields: [vehicles.createdBy],
        references: [admins.internalUserId],
    }),
    incidents: many(incidents),
    impactLinks: many(impact_links),
}));

// 7. Incidents Table Relations
export const incidentsRelations = relations(incidents, ({ one, many }) => ({
    client: one(clients, {
        fields: [incidents.clientId],
        references: [clients.userId],
    }),
    vehicle: one(vehicles, {
        fields: [incidents.vehicleId],
        references: [vehicles.id],
    }),
    reportedBy: one(clients, {
        fields: [incidents.reportedById],
        references: [clients.userId],
    }),
    assignedTo: one(technicians, {
        fields: [incidents.assignedToId],
        references: [technicians.internalUserId],
    }),
    comments: many(incident_comments),
    events: many(incident_events),
    attachments: many(incident_attachments),
    impactLinks: many(impact_links),
}));

// 8. Incident Comments Table Relations
export const incidentCommentsRelations = relations(incident_comments, ({ one }) => ({
    user: one(users, {
        fields: [incident_comments.userId],
        references: [users.id],
    }),
    incident: one(incidents, {
        fields: [incident_comments.incidentId],
        references: [incidents.id],
    }),
}));

// 9. Incident Events Table Relations
export const incidentEventsRelations = relations(incident_events, ({ one }) => ({
    incident: one(incidents, {
        fields: [incident_events.incidentId],
        references: [incidents.id],
    }),
    user: one(users, {
        fields: [incident_events.userId],
        references: [users.id],
    }),
}));

// 10. Generated Reports Table Relations
export const generatedReportsRelations = relations(generated_reports, ({ one }) => ({
    generatedBy: one(internal_users, {
        fields: [generated_reports.generatedById],
        references: [internal_users.userId],
    }),
}));

// 11. Security Audit Events Table Relations
export const securityAuditEventsRelations = relations(security_audit_events, ({ one }) => ({
    user: one(users, {
        fields: [security_audit_events.userId],
        references: [users.id],
    }),
}));

// 12. Incident Attachments Table Relations
export const incidentAttachmentsRelations = relations(incident_attachments, ({ one }) => ({
    incident: one(incidents, {
        fields: [incident_attachments.incidentId],
        references: [incidents.id],
    }),
    uploadedBy: one(users, {
        fields: [incident_attachments.uploadedById],
        references: [users.id],
    }),
}));

// 13. Impact Links Table Relations
export const impactLinksRelations = relations(impact_links, ({ one }) => ({
    incident: one(incidents, {
        fields: [impact_links.incidentId],
        references: [incidents.id],
    }),
    vehicle: one(vehicles, {
        fields: [impact_links.vehicleId],
        references: [vehicles.id],
    }),
}));