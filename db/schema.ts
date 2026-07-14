import { pgTable, serial, text, timestamp, pgEnum, integer, doublePrecision, boolean, json } from "drizzle-orm/pg-core";

// Enum Columns
export const statusEnum = pgEnum("incident_status", ["New", "Open", "In Progress", "Waiting Client", "Waiting Technician", "Resolved", "Closed", "Cancelled"])
export const priorityEnum = pgEnum("incident_priority", ["Low", "Medium", "High", "Critical"])
export const typeEnum = pgEnum("incident_type", ["GPS Device", "Vehicle", "Driver", "Client Complaint", "Accident", "Fuel", "Mission", "Maintenance", "Payment", "System Bug", "Other"])
export const adminLevelEnum = pgEnum("admin_access_level", ["Technician", "Support Manager", "Admin"])
export const visibilityEnum = pgEnum("incident_comments_visibility", ["Public", "Private"])
export const eventTypeEnum = pgEnum("event_type_enum", [
    "create_incident",
    "comment",
    "status_changed",
    "priority_changed",
    "technician_assigned",
]);
export const impactLevelEnum = pgEnum("impact_level", ["Low", "Medium", "High", "Critical"])
export const relationshipEnum = pgEnum("impact_relationship", ["Primary", "Secondary", "Dependent"])
export const slaStatusEnum = pgEnum("incident_slaStatus_enum", [
    "Healthy",
    "Warning_Response",
    "Warning_Resolution",
    "Breached_Response",
    "Breached_Resolution",
    "Breached_Both",
    "Met",
    "Met_With_Response_Breached",
    "Met_With_Resolution_Breached"
]);

// 1. User Table
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at')
})

// 2. InternalUser Table
export const internal_users = pgTable("internal_users", {
    userId: integer('user_id')
        .references(() => users.id, { onDelete: "cascade" }).primaryKey()
        .notNull(),
    department: text('department').notNull(),
    hireDate: timestamp('hire_date').defaultNow(),
    isActive: boolean('is_active').notNull().default(true),
})

// 3. Admin Table
export const admins = pgTable("admins", {
    internalUserId: integer('internal_user_id')
        .references(() => internal_users.userId, { onDelete: "cascade" }).primaryKey()
        .notNull(),
    canManageUsers: boolean('can_manage_users').notNull(),
})

// 4. SupportManager Table
export const support_managers = pgTable("support_managers", {
    internalUserId: integer('internal_user_id')
        .references(() => internal_users.userId, { onDelete: "cascade" }).primaryKey()
        .notNull(),
    canAssign: boolean('can_assign').notNull().default(true),
})

// 5. Technician Table
export const technicians = pgTable("technicians", {
    internalUserId: integer('internal_user_id')
        .references(() => internal_users.userId, { onDelete: "cascade" }).primaryKey()
        .notNull(),
    specialty: text('specialty').notNull(),
    isAvailable: boolean('is_available').notNull().default(true),
})

// 6. Clients Table
export const clients = pgTable("clients", {
    userId: integer('user_id')
        .references(() => users.id, { onDelete: "cascade" }).primaryKey()
        .notNull(),
    companyName: text("company_name").notNull(),
    phone: text('phone').notNull()
})

// 7. Vehicles Table
export const vehicles = pgTable("vehicles", {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    imei: text('imei').notNull().unique(),
    licensePlate: text('license_plate').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
    clientId: integer('client_id')
        .references(() => clients.userId, { onDelete: "cascade" })
        .notNull(),
    createdBy: integer('admin_id')
        .references(() => admins.internalUserId, { onDelete: "cascade" })
})

// 8. Incidents Table
export const incidents = pgTable("incidents", {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    type: typeEnum("type").notNull(),
    priority: priorityEnum("priority").notNull().default('Medium'),
    status: statusEnum("status").notNull().default('New'),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    address: text("address").notNull(),
    responseDueAt: timestamp("response_due_at"),
    resolvedAt: timestamp("resolved_at"),
    resolutionDueAt: timestamp("resolution_due_at"),
    firstResponseAt: timestamp("first_response_at"),
    slaStatus: slaStatusEnum("sla_status").default("Healthy"),
    closedAt: timestamp("closed_at"),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
    clientId: integer('client_id')
        .references(() => clients.userId, { onDelete: "restrict" })
        .notNull(),
    vehicleId: integer('vehicle_id')
        .references(() => vehicles.id, { onDelete: "restrict" })
        .notNull(),
    reportedById: integer('reported_by_id')
        .references(() => clients.userId, { onDelete: "restrict" })
        .notNull(),
    assignedToId: integer('assigned_to_id')
        .references(() => technicians.internalUserId, { onDelete: "set null" }),
})

// 9. Incident Comments Table
export const incident_comments = pgTable('incident_comments', {
    id: serial('id').primaryKey(),
    body: text('body').notNull(),
    visibility: visibilityEnum('visibility').notNull().default('Public'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
    userId: integer('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    incidentId: integer('incident_id')
        .references(() => incidents.id, { onDelete: 'cascade' })
        .notNull()
})

// 10. Incident Events Table
export const incident_events = pgTable("incident_events", {
    id: serial('id').primaryKey(),
    incidentId: integer('incident_id')
        .references(() => incidents.id, { onDelete: 'cascade' })
        .notNull(),
    userId: integer('user_id')
        .references(() => users.id, { onDelete: 'cascade' }),
    eventType: eventTypeEnum('event_type').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    message: text('message').notNull(),
    createdAt: timestamp('created_at').defaultNow()
});

// 11. Security Audit Events Table
export const security_audit_events = pgTable("security_audit_events", {
    id: serial("id").primaryKey(),
    ipAddress: text("ip_address").notNull(),
    attemptedEndpoint: text("attempted_endpoint").notNull(),
    statusCode: integer("status_code").notNull(),
    errorMessage: text("error_message"),
    incidentTragetId: integer("incident_traget_id"),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
})

// 12. Generated Reports Table
export const generated_reports = pgTable("generated_reports", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    stats: json("stats").notNull(),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
    sentAt: timestamp("sent_at"),
    generatedById: integer("generated_by_id").references(() => internal_users.userId, { onDelete: "cascade" }).notNull()
})

// 13. Incident Attachments Table
export const incident_attachments = pgTable('incident_attachments', {
    id: serial('id').primaryKey(),
    filename: text('filename').notNull(),
    fileUrl: text('file_url').notNull(),
    fileType: text('file_type').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
    incidentId: integer('incident_id')
        .references(() => incidents.id, { onDelete: 'cascade' })
        .notNull(),
    uploadedById: integer('uploaded_by_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull()
})

// 14. Impact Links Table
export const impact_links = pgTable("impact_links", {
    id: serial("id").primaryKey(),
    impactLevel: impactLevelEnum("impact_level").notNull(),
    relationship: relationshipEnum("relationship").notNull(),
    clientOpenTickets: integer("client_open_tickets").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    incidentId: integer("incident_id")
        .references(() => incidents.id, { onDelete: "cascade" })
        .notNull(),
    vehicleId: integer("vehicle_id")
        .references(() => vehicles.id, { onDelete: "cascade" })
        .notNull()
})
