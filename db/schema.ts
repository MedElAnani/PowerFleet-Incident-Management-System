import { pgTable, serial, text, timestamp, pgEnum, integer, doublePrecision, boolean } from "drizzle-orm/pg-core";

// Enum Columns
export const roleEnum = pgEnum("user_role", ["ClientUser", "InternalUser"])
export const statusEnum = pgEnum("incident_status", ["New", "Open", "In Progress", "Waiting Client", "Waiting Technician", "Resolved", "Closed", "Cancelled"])
export const priorityEnum = pgEnum("incident_priority", ["Low", "Medium", "High", "Critical"])
export const typeEnum = pgEnum("incident_type", ["GPS Device", "Vehicle", "Driver", "Client Complaint", "Accident", "Fuel", "Mission", "Maintenance", "Payment", "System Bug", "Other"])
export const adminLevelEnum = pgEnum("admin_access_level", ["Technician", "Support Manager", "Admin"])
export const internalRoleEnum = pgEnum("internal_user_role", ["Technician", "Support Manager", "Admin"])

// 1. User Table

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: roleEnum("role").default("ClientUser").notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// 2. InternalUser Table

export const internal_users = pgTable("internal_users", {
    id: serial('id').primaryKey(),
    internalRole: internalRoleEnum('internal_role').notNull().default('Technician'),
    department: text('department').notNull(),
    hireDate: timestamp('hire_date').defaultNow(),
    isActive: boolean('is_active').notNull().default(true),
    userId: integer('user_id')
        .references(() => users.id, { onDelete: "cascade" })
        .notNull()
})

// 3. Admin Table

export const admins = pgTable("admins", {
    id: serial('id').primaryKey(),
    canManageUsers: boolean('can_manage_users').notNull(),
    lastActionAt: timestamp('last_action_at'),
    internalUserId: integer('internal_user_id')
        .references(() => internal_users.id, { onDelete: "cascade" } )
        .notNull()
})

// 4. SupportManager Table
export const support_managers = pgTable("support_managers", {
    id: serial('id').primaryKey(),
    canAssign: boolean('can_assign').notNull().default(true),
    internalUserId: integer('internal_user_id')
        .references(() => internal_users.id, { onDelete: "cascade" } )
        .notNull()
})

// 5. Technician Table
export const technicians = pgTable("technicians", {
    id: serial('id').primaryKey(),
    specialty: text('specialty').notNull(),
    isAvailable: boolean('is_available').notNull().default(true),
    internalUserId: integer('internal_user_id')
        .references(() => internal_users.id, { onDelete: "cascade" } )
        .notNull()
})

// 6. Clients Table
export const clients = pgTable("clients", {
    id: serial("id").primaryKey(),
    companyName: text("company_name").notNull(),
    phone: text('phone').notNull(),
    userId: integer('user_id')
        .references(() => users.id, { onDelete: "cascade" })
        .notNull()
})



// 7. Vehicles Table
export const vehicles = pgTable("vehicles", {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    imei: text('imei').notNull().unique(),
    licensePlate: text('license_plate').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
    clientId: integer('client_id')
        .references(() => clients.id, { onDelete: "cascade" })
        .notNull()
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
    resolutionDueAt: timestamp("resolution_due_at"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    vehicleId: integer('vehicle_id')
        .references(() => vehicles.id, { onDelete: "cascade" })
        .notNull(),
    reportedById: integer('reported_by_id')
        .references(() => clients.id, { onDelete: "cascade" })
        .notNull(),
    assignedToId: integer('assigned_to_id')
        .references(() => technicians.id, { onDelete: "cascade" }),
})