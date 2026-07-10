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
    incident_comments
} from "./schema";

// 1. User Table Relations
export const usersRelations = relations(users, ({ one, many }) => ({
    clientProfile: one(clients),
    internalProfile: one(internal_users),
    reportedIncidents: many(incidents),
    comments: many(incident_comments),
}));

// 2. Internal Users Table Relations
export const internalUsersRelations = relations(internal_users, ({ one }) => ({
    user: one(users, {
        fields: [internal_users.userId],
        references: [users.id],
    }),
    adminProfile: one(admins),
    managerProfile: one(support_managers),
    technicianProfile: one(technicians),
}));

// 3. Role-Specific Profile Relations
export const adminsRelations = relations(admins, ({ one }) => ({
    internalUser: one(internal_users, {
        fields: [admins.internalUserId],
        references: [internal_users.id],
    }),
}));

export const supportManagersRelations = relations(support_managers, ({ one }) => ({
    internalUser: one(internal_users, {
        fields: [support_managers.internalUserId],
        references: [internal_users.id],
    }),
}));

export const techniciansRelations = relations(technicians, ({ one, many }) => ({
    internalUser: one(internal_users, {
        fields: [technicians.internalUserId],
        references: [internal_users.id],
    }),
    assignedIncidents: many(incidents),
}));

// 4. Client & Vehicle System Relations
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
        references: [clients.id],
    }),
    incidents: many(incidents),
}));

// 5. Incidents Table Relations (Updated to match your exact columns)
export const incidentsRelations = relations(incidents, ({ one, many }) => ({
    client: one(clients, {
        fields: [incidents.clientId],
        references: [clients.id],
    }),
    vehicle: one(vehicles, {
        fields: [incidents.vehicleId],
        references: [vehicles.id],
    }),
    reportedBy: one(users, {
        fields: [incidents.reportedById],
        references: [users.id],
    }),
    assignedTo: one(technicians, {
        fields: [incidents.assignedToId],
        references: [technicians.id],
    }),
    comments: many(incident_comments),
}));

// 6. Incident Comments Table Relations
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